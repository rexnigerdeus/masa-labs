import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '../supabase/server';
import type { Listing, Order } from '../types';

/**
 * Lecture des commandes.
 *
 * La RLS ne laisse remonter que celles dont l'appelant est le client ou le
 * loueur : les filtres ci-dessous servent à séparer les deux points de vue à
 * l'écran, pas à protéger quoi que ce soit.
 */

export type OrderWithListing = Order & {
  listing: Pick<Listing, 'id' | 'title' | 'photos' | 'commune'> | null;
  buyer: { id: string; full_name: string | null; phone: string | null } | null;
  seller: { id: string; full_name: string | null; phone: string | null } | null;
};

// Pas de `phone` ici : la colonne n'est plus lisible depuis l'app. Les
// numéros arrivent par `withPhones`, et seulement quand ils doivent arriver.
const SELECT =
  '*, listing:hive_listings(id, title, photos, commune), '
  + 'buyer:profiles!hive_orders_buyer_id_fkey(id, full_name), '
  + 'seller:profiles!hive_orders_seller_id_fkey(id, full_name)';

/**
 * Ajoute les numéros des deux parties aux commandes confirmées ou en cours.
 *
 * La règle — pas de numéro avant confirmation, et seulement entre les deux
 * parties — est tenue par la base (`hive_telephones_commandes`, migration
 * 20261002150000_durcissement_securite.sql), plus seulement par l'écran.
 * En cas d'échec, les commandes s'affichent sans numéro : la messagerie
 * reste là pour se joindre.
 */
async function withPhones(
  supabase: SupabaseClient,
  rows: OrderWithListing[],
): Promise<OrderWithListing[]> {
  const orders = rows.map((o) => ({
    ...o,
    buyer: o.buyer === null ? null : { ...o.buyer, phone: null },
    seller: o.seller === null ? null : { ...o.seller, phone: null },
  }));
  const ids = orders
    .filter((o) => o.status === 'confirmee' || o.status === 'en_cours')
    .map((o) => o.id);
  if (ids.length === 0) return orders;

  const { data } = await supabase.rpc('hive_telephones_commandes', { p_order_ids: ids });
  const phones = new Map(
    ((data ?? []) as Array<{ order_id: string; buyer_phone: string | null; seller_phone: string | null }>)
      .map((p) => [p.order_id, p]),
  );
  return orders.map((o) => {
    const p = phones.get(o.id);
    if (p === undefined) return o;
    return {
      ...o,
      buyer: o.buyer === null ? null : { ...o.buyer, phone: p.buyer_phone },
      seller: o.seller === null ? null : { ...o.seller, phone: p.seller_phone },
    };
  });
}

export async function ordersAsBuyer(userId: string): Promise<OrderWithListing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('hive_orders')
    .select(SELECT)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });
  return withPhones(supabase, (data ?? []) as unknown as OrderWithListing[]);
}

export async function ordersAsSeller(userId: string): Promise<OrderWithListing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('hive_orders')
    .select(SELECT)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });
  return withPhones(supabase, (data ?? []) as unknown as OrderWithListing[]);
}

/**
 * Commandes déjà passées sur une annonce, pour le calcul de disponibilité.
 *
 * Ne remonte que ce que la RLS autorise : un client ne voit que ses propres
 * commandes. Le calendrier affiché à un visiteur est donc incomplet par
 * construction — c'est assumé, la vérification qui compte est celle du
 * serveur au moment de la demande, et c'est le loueur qui tranche.
 */
export async function ordersForListing(listingId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('hive_orders')
    .select('id, listing_id, buyer_id, seller_id, kind, start_date, end_date, status')
    .eq('listing_id', listingId);
  return (data ?? []) as Order[];
}

export async function getOrder(id: string): Promise<OrderWithListing | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('hive_orders').select(SELECT).eq('id', id).maybeSingle();
  if (data === null) return null;
  const [order] = await withPhones(supabase, [data as unknown as OrderWithListing]);
  return order ?? null;
}
