'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, currentUser } from '../supabase/server';
import { computeRentQuote } from '../pricing';
import { canTransition, hasDateConflict, type Party } from '../orders';
import { ONLINE_PAYMENT_ENABLED } from '../payments';
import type { OrderStatus, PaymentMethod } from '../types';

export type FormState = { error: string } | null;

/**
 * Demande de réservation ou d'achat.
 *
 * Le montant est recalculé ici à partir de l'annonce relue en base : le total
 * affiché au client sert à l'informer, il n'est jamais repris tel quel. Sans
 * ça, n'importe qui réserverait une caméra à 100 FCFA en modifiant un champ.
 */
export async function requestOrder(_prev: FormState, form: FormData): Promise<FormState> {
  const listingId = String(form.get('listing_id') ?? '');

  const user = await currentUser();
  if (user === null) redirect(`/connexion?suite=/annonces/${listingId}`);

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from('hive_listings')
    .select('*')
    .eq('id', listingId)
    .eq('status', 'publie')
    .maybeSingle();

  if (listing === null) return { error: 'Cette annonce n’est plus disponible.' };
  if (listing.user_id === user.id) {
    return { error: 'Vous ne pouvez pas réserver votre propre matériel.' };
  }

  const kind = form.get('kind') === 'achat' ? 'achat' : 'location';
  if (kind === 'location' && !listing.for_rent) {
    return { error: 'Ce matériel n’est pas proposé à la location.' };
  }
  if (kind === 'achat' && !listing.for_sale) {
    return { error: 'Ce matériel n’est pas proposé à la vente.' };
  }

  let startDate: string | null = null;
  let endDate: string | null = null;
  let total: number;

  if (kind === 'location') {
    startDate = String(form.get('start_date') ?? '');
    endDate = String(form.get('end_date') ?? '');

    const quote = computeRentQuote(listing, startDate, endDate);
    if (quote === null) {
      return { error: 'Vérifiez les dates : la fin ne peut pas précéder le début.' };
    }

    // Les commandes visibles ici sont celles que la RLS laisse passer — les
    // siennes. Le vrai arbitrage reste la confirmation par le loueur, qui
    // voit, lui, toutes les réservations de son matériel.
    const { data: existing } = await supabase
      .from('hive_orders')
      .select('status, start_date, end_date')
      .eq('listing_id', listingId);

    if (hasDateConflict(existing ?? [], startDate, endDate)) {
      return { error: 'Vous avez déjà une réservation confirmée sur ces dates.' };
    }

    total = quote.total;
  } else {
    total = listing.sale_price ?? 0;
  }

  const requested = form.get('payment_method') === 'en_ligne' ? 'en_ligne' : 'main_propre';
  // Tant que le compte marchand n'est pas ouvert, un seul mode existe
  // réellement. On retombe dessus plutôt que de refuser la commande.
  const paymentMethod: PaymentMethod = ONLINE_PAYMENT_ENABLED ? requested : 'main_propre';

  const { error } = await supabase.from('hive_orders').insert({
    listing_id: listingId,
    buyer_id: user.id,
    seller_id: listing.user_id,
    kind,
    start_date: startDate,
    end_date: endDate,
    total_amount: total,
    payment_method: paymentMethod,
    message: String(form.get('message') ?? '').trim() || null,
  });

  if (error !== null) return { error: `Demande impossible : ${error.message}` };

  revalidatePath('/mes-commandes');
  redirect('/mes-commandes');
}

/**
 * Avancement du statut d'une commande.
 *
 * L'état de départ est relu en base, jamais accepté du formulaire : sinon il
 * suffirait d'annoncer « je pars de confirmee » pour sauter la confirmation
 * du loueur. La table des transitions (lib/orders.ts) tranche ensuite.
 */
export async function advanceOrder(form: FormData): Promise<void> {
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/mes-commandes');

  const id = String(form.get('id') ?? '');
  const to = String(form.get('to') ?? '') as OrderStatus;

  const supabase = await createClient();
  const { data: order } = await supabase
    .from('hive_orders')
    .select('id, status, buyer_id, seller_id')
    .eq('id', id)
    .maybeSingle();

  if (order === null) return;

  const party: Party | null = order.buyer_id === user.id
    ? 'buyer'
    : order.seller_id === user.id ? 'seller' : null;

  if (party === null || !canTransition(order.status, to, party)) return;

  await supabase.from('hive_orders').update({ status: to }).eq('id', id);

  revalidatePath('/mes-commandes');
  revalidatePath('/mes-annonces');
}
