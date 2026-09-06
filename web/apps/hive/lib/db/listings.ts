import { createClient } from '../supabase/server';
import { publicClient } from '../supabase/public';
import { categoryWithDescendants } from '../catalog';
import type { Listing } from '../types';

/**
 * Lecture des annonces.
 *
 * Toutes les requêtes passent par la session de l'appelant : c'est la RLS qui
 * décide de ce qui remonte, jamais un filtre écrit ici. Un `status = 'publie'`
 * oublié dans un `where` ne peut donc pas exposer une annonce retirée.
 */

export type ListingWithOwner = Listing & {
  owner: { id: string; full_name: string | null } | null;
};

export type SearchFilters = {
  q?: string;
  category?: string;
  commune?: string;
  mode?: 'location' | 'vente';
  condition?: string;
  maxPrice?: number;
  page?: number;
};

export const PAGE_SIZE = 24;

export async function searchListings(
  filters: SearchFilters,
): Promise<{ rows: ListingWithOwner[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);

  let query = supabase
    .from('hive_listings')
    .select('*, owner:profiles!hive_listings_user_id_fkey(id, full_name)', { count: 'exact' })
    .eq('status', 'publie');

  // Chercher « Sonorisation » doit remonter les enceintes comme les micros :
  // personne ne pense d'abord en catégorie feuille.
  if (filters.category !== undefined && filters.category !== '') {
    query = query.in('category_id', categoryWithDescendants(filters.category));
  }
  if (filters.commune !== undefined && filters.commune !== '') {
    query = query.eq('commune', filters.commune);
  }
  if (filters.condition !== undefined && filters.condition !== '') {
    query = query.eq('condition', filters.condition);
  }
  if (filters.mode === 'location') query = query.eq('for_rent', true);
  if (filters.mode === 'vente') query = query.eq('for_sale', true);

  if (filters.q !== undefined && filters.q.trim() !== '') {
    // Recherche volontairement naïve sur le titre. Un index plein texte
    // demanderait une extension et une colonne générée pour un catalogue qui,
    // au lancement, se compte en dizaines d'annonces.
    const term = filters.q.trim().replace(/[%,()]/g, ' ');
    query = query.ilike('title', `%${term}%`);
  }

  // Le prix filtré est celui du mode demandé : filtrer un prix de vente sur
  // une annonce de location n'aurait aucun sens pour celui qui cherche.
  if (filters.maxPrice !== undefined && Number.isFinite(filters.maxPrice)) {
    const column = filters.mode === 'vente' ? 'sale_price' : 'rent_price_day';
    query = query.lte(column, filters.maxPrice);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error !== null) throw new Error(`Recherche impossible : ${error.message}`);
  return { rows: (data ?? []) as ListingWithOwner[], total: count ?? 0 };
}

/** `null` quand l'annonce n'existe pas ou n'est pas visible par l'appelant. */
export async function getListing(id: string): Promise<ListingWithOwner | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('hive_listings')
    .select('*, owner:profiles!hive_listings_user_id_fkey(id, full_name)')
    .eq('id', id)
    .maybeSingle();
  return (data as ListingWithOwner | null) ?? null;
}

/** Annonces d'un utilisateur, retirées comprises — c'est son propre inventaire. */
export async function listingsOf(userId: string): Promise<Listing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('hive_listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Listing[];
}

/**
 * Les dernières annonces publiées, pour la page d'accueil.
 *
 * Seule lecture qui passe par le client anonyme : la page d'accueil est
 * identique pour tout le monde, et lire les cookies la rendrait dynamique.
 * C'est l'écran le plus consulté et le premier qu'on ouvre sur un réseau
 * lent — il doit sortir du cache, pas d'une requête.
 */
export async function latestListings(limit = 8): Promise<ListingWithOwner[]> {
  const supabase = publicClient();
  const { data } = await supabase
    .from('hive_listings')
    .select('*, owner:profiles!hive_listings_user_id_fkey(id, full_name)')
    .eq('status', 'publie')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as ListingWithOwner[];
}
