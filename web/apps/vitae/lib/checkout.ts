'use server';

import { redirect } from 'next/navigation';
import { createClient, currentUser } from './supabase/server';
import { APP_URL } from './config';
import { PAYMENTS_ENABLED, isOffer } from './payments';
import { WaveError, createCheckoutSession } from './wave';

/**
 * Lancement d'un paiement (brief v2, étapes 1 et 2).
 *
 * 1. `vitae_create_payment` crée la ligne `pending` ; le montant est fixé par
 *    la base, jamais transmis par le navigateur.
 * 2. Session Wave avec ce montant, l'identifiant du paiement en
 *    `client_reference`, puis redirection vers Wave.
 *
 * Interrupteur éteint : aucune requête ne part, retour à la page de l'offre
 * (qui affiche alors la liste d'attente).
 */
export async function startCheckout(form: FormData): Promise<void> {
  const offer = form.get('offre');
  if (!isOffer(offer)) redirect('/tarifs');
  if (!PAYMENTS_ENABLED) redirect(`/paiement?offre=${offer}`);

  const user = await currentUser();
  if (user === null) redirect(`/connexion?suite=${encodeURIComponent(`/paiement?offre=${offer}`)}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('vitae_create_payment', { p_offer: offer });
  const payment = (data as { id: string; amount_xof: number }[] | null)?.[0];
  if (error !== null || payment === undefined) {
    redirect(`/paiement?offre=${offer}&erreur=creation`);
  }

  let launchUrl: string;
  try {
    const session = await createCheckoutSession({
      amountXof: payment.amount_xof,
      clientReference: payment.id,
      successUrl: `${APP_URL}/paiement/retour?id=${payment.id}`,
      errorUrl: `${APP_URL}/paiement/retour?id=${payment.id}&echec=1`,
    });
    await supabase.rpc('vitae_attach_payment_session', { p_payment: payment.id, p_ref: session.id });
    launchUrl = session.waveLaunchUrl;
  } catch (error) {
    console.error('[paiement] session Wave impossible', error instanceof WaveError ? error.message : error);
    redirect(`/paiement?offre=${offer}&erreur=wave`);
  }
  // Hors du try : `redirect` lève une exception que le catch avalerait.
  redirect(launchUrl);
}
