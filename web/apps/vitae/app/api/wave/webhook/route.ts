import { NextResponse } from 'next/server';
import { verifyWaveSignature } from '../../../../lib/wave';
import { serviceClient } from '../../../../lib/supabase/admin';
import { APP_VERSION } from '../../../../lib/config';

/**
 * Webhook Wave (brief v2, paiement, étape 3).
 *
 * 1. Signature vérifiée sur le corps brut (`WAVE_WEBHOOK_SECRET`) ; sans
 *    elle, 401 et rien d'autre.
 * 2. `checkout.session.completed` avec `payment_status = succeeded` : le
 *    paiement est retrouvé par `client_reference` (son identifiant chez
 *    nous), montant et devise sont recomparés, puis
 *    `vitae_grant_entitlement` passe le paiement à `succeeded` et accorde le
 *    droit. Idempotent : un même webhook reçu deux fois n'accorde qu'un droit
 *    (verrou + contrainte unique en base).
 * 3. `checkout.session.payment_failed` : le paiement passe à `failed` s'il
 *    était encore en attente. Rien n'est accordé.
 *
 * Réponse 200 rapide dans tous les cas traités : Wave relance pendant trois
 * jours tant qu'il ne reçoit pas de 2xx (docs.wave.com/webhook). Un 500 n'est
 * renvoyé que si l'écriture en base a échoué, justement pour être relancé.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  const secret = process.env.WAVE_WEBHOOK_SECRET ?? '';
  if (!verifyWaveSignature(raw, request.headers.get('wave-signature'), secret)) {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
  }

  let event: { id?: string; type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ error: 'Corps illisible' }, { status: 400 });
  }

  const data = event.data ?? {};
  const reference = typeof data.client_reference === 'string' ? data.client_reference : '';
  if (!UUID.test(reference)) {
    // Pas un paiement de Vitae (autre produit sur le même compte marchand) :
    // accusé de réception, rien à faire.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabase = serviceClient();
  const { data: payment } = await supabase
    .from('vitae_payments')
    .select('id, user_id, offer, amount_xof, status')
    .eq('id', reference)
    .maybeSingle();
  if (payment === null) return NextResponse.json({ ok: true, ignored: true });

  const logPaymentEvent = async (name: 'payment_succeeded' | 'payment_failed'): Promise<void> => {
    await supabase.from('vitae_events').insert({
      event: name,
      user_id: payment.user_id,
      app_version: APP_VERSION,
      meta: { offre: payment.offer, montant: payment.amount_xof },
    });
  };

  if (event.type === 'checkout.session.completed' && data.payment_status === 'succeeded') {
    // Le montant payé doit être celui que nous avons fixé.
    if (String(data.amount) !== String(payment.amount_xof) || data.currency !== 'XOF') {
      console.error('[wave] montant inattendu', { reference, amount: data.amount, currency: data.currency });
      return NextResponse.json({ ok: true, mismatch: true });
    }
    const { data: granted, error } = await supabase.rpc('vitae_grant_entitlement', {
      p_payment_id: payment.id,
      p_raw: event,
    });
    if (error !== null) {
      console.error('[wave] attribution impossible', error);
      return NextResponse.json({ error: 'Attribution impossible' }, { status: 500 });
    }
    // Seul le premier webhook compte dans les statistiques.
    if (granted === true) await logPaymentEvent('payment_succeeded');
    return NextResponse.json({ ok: true });
  }

  if (event.type === 'checkout.session.payment_failed') {
    if (payment.status === 'pending') {
      await supabase
        .from('vitae_payments')
        .update({ status: 'failed', raw_webhook: event })
        .eq('id', payment.id)
        .eq('status', 'pending');
      await logPaymentEvent('payment_failed');
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: true });
}
