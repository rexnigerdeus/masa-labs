import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient, currentUser } from '../../../lib/supabase/server';
import { OFFERS, formatFcfa, isOffer } from '../../../lib/payments';

export const metadata: Metadata = { title: 'Paiement', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Retour de Wave (brief v2, étapes 4 et 5).
 *
 * Cette page LIT le statut du paiement ; elle n'accorde jamais de droit — le
 * webhook signé est le seul à le faire. Si Wave nous ramène avant que le
 * webhook soit arrivé, la page se recharge d'elle-même toutes les quatre
 * secondes (balise meta, aucun JavaScript), une minute au plus.
 *
 * Échec ou abandon (`echec=1`, ou statut `failed`) : un message clair, rien
 * n'est accordé, et le bouton pour réessayer.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_POLLS = 15;

export default async function RetourPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; echec?: string; n?: string }>;
}) {
  const { id, echec, n } = await searchParams;
  const polls = Math.min(Number.parseInt(n ?? '0', 10) || 0, MAX_POLLS);
  const user = await currentUser();

  let payment: { offer: string; amount_xof: number; status: string } | null = null;
  if (user !== null && typeof id === 'string' && UUID.test(id)) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('vitae_payments')
      .select('offer, amount_xof, status')
      .eq('id', id)
      .maybeSingle();
    payment = data;
  }

  if (payment === null || !isOffer(payment.offer)) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <h1 className="text-2xl font-bold">Paiement introuvable</h1>
        <p className="text-muted">
          Connectez-vous avec le compte qui a payé pour voir où en est votre
          paiement.
        </p>
        <Link href="/compte" className="font-semibold text-accent-ink underline">Mon compte</Link>
      </div>
    );
  }

  const offer = OFFERS[payment.offer];
  const retry = (
    <Link
      href={`/paiement?offre=${payment.offer}`}
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-semibold text-header"
    >
      Réessayer
    </Link>
  );

  if (payment.status === 'succeeded') {
    const next = payment.offer === 'cv_credit'
      ? { href: '/cv/version', label: 'Créer ma version' }
      : { href: '/compte', label: 'Créer une version ou une lettre' };
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-2xl font-bold">Paiement confirmé</h1>
        <p className="text-muted">
          {offer.name} — {formatFcfa(payment.amount_xof)}. Votre droit est actif
          sur votre compte.
        </p>
        <Link href={next.href} className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-semibold text-header">
          {next.label}
        </Link>
      </div>
    );
  }

  if (payment.status === 'pending' && echec === undefined && polls < MAX_POLLS) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3">
        {/* Rechargement sans JavaScript, le temps que Wave nous confirme. */}
        <meta httpEquiv="refresh" content={`4;url=/paiement/retour?id=${id}&n=${polls + 1}`} />
        <h1 className="text-2xl font-bold">Confirmation en cours…</h1>
        <p className="text-muted">
          Wave nous confirme votre paiement. Cette page se met à jour toute
          seule ; vous pouvez aussi la fermer, votre droit apparaîtra dans
          votre compte dès la confirmation.
        </p>
      </div>
    );
  }

  if (payment.status === 'pending' && echec === undefined) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <h1 className="text-2xl font-bold">Toujours en attente</h1>
        <p className="text-muted">
          Wave ne nous a pas encore confirmé ce paiement. Si vous avez payé,
          votre droit apparaîtra dans votre compte dès la confirmation. Sinon,
          aucun droit n’a été accordé et vous pouvez réessayer.
        </p>
        {retry}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3">
      <h1 className="text-2xl font-bold">Le paiement n’a pas abouti</h1>
      <p className="text-muted">
        Le paiement a été refusé ou abandonné. Aucun droit n’a été accordé, et
        vous pouvez réessayer quand vous voulez.
      </p>
      {retry}
    </div>
  );
}
