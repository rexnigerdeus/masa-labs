import type { MetadataRoute } from 'next';
import { APP_URL } from '../lib/config';
import { CATEGORIES } from '../lib/catalog';
import { publicClient } from '../lib/supabase/public';

// Le plan du site suit le rythme des annonces, pas celui des déploiements.
export const revalidate = 3600;

/**
 * Plan du site.
 *
 * Les fiches d'annonces en sont l'essentiel : ce sont elles qui portent les
 * mots que les gens tapent — « louer caméra Cocody », « enceinte Marcory ».
 * Les pages de catégorie viennent ensuite, comme portes d'entrée stables
 * quand une annonce précise a disparu.
 *
 * Lecture par le client anonyme : la RLS ne laisse remonter que les annonces
 * publiées, donc une annonce retirée sort du plan d'elle-même.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statiques: MetadataRoute.Sitemap = [
    { url: APP_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${APP_URL}/annonces`, changeFrequency: 'daily', priority: 0.9 },
  ];

  const categories: MetadataRoute.Sitemap = CATEGORIES.flatMap((parent) => [
    parent,
    ...parent.children,
  ]).map((c) => ({
    url: `${APP_URL}/annonces?categorie=${c.id}`,
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  const { data } = await publicClient()
    .from('hive_listings')
    .select('id, updated_at')
    .eq('status', 'publie')
    .order('updated_at', { ascending: false })
    // Google ignore au-delà de 50 000 URL par fichier ; on est très loin du
    // compte, et ce plafond garde la génération du plan bornée en temps.
    .limit(5000);

  const annonces: MetadataRoute.Sitemap = (data ?? []).map(
    (l: { id: string; updated_at: string }) => ({
      url: `${APP_URL}/annonces/${l.id}`,
      lastModified: new Date(l.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }),
  );

  return [...statiques, ...categories, ...annonces];
}
