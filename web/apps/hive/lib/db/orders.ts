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

const SELECT =
  '*, listing:hive_listings(id, title, photos, commune), '
  + 'buyer:profiles!hive_orders_buyer_id_fkey(id, full_name, phone), '
  + 'seller:profiles!hive_orders_seller_id_fkey(id, full_name, phone)';

export async function ordersAsBuyer(userId: string): Promise<OrderWithListing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('hive_orders')
    .select(SELECT)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as OrderWithListing[];
}

export async function ordersAsSeller(userId: string): Promise<OrderWithListing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('hive_orders')
    .select(SELECT)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as OrderWithListing[];
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
  return (data as unknown as OrderWithListing | null) ?? null;
}
