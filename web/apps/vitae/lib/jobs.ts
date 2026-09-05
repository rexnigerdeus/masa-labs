import { unstable_cache } from 'next/cache';
import { publicClient } from './supabase/public';

/**
 * Lecture des offres d'emploi.
 *
 * La table est alimentée par l'Edge Function `scrape-job-offers` (pg_cron,
 * 06:00 UTC) et garantit un `apply_url` pointant sur l'annonce elle-même —
 * jamais une page de liste. Vitae ne fait que lire : aucune candidature n'est
 * gérée ici, on renvoie vers la source.
 *
 * Accessible sans compte : la migration `20260904100100` ouvre la lecture au
 * rôle `anon`.
 */

export interface JobOffer {
  id: string;
  type: 'emploi' | 'stage';
  category: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  contractType: string | null;
  postedAt: string;
  applyUrl: string;
  isRemote: boolean;
}

export interface JobFilters {
  type?: string;
  category?: string;
  city?: string;
  /** Nombre de jours de fraîcheur maximum. */
  days?: number;
}

export interface JobResults {
  offers: JobOffer[];
  /** Nombre total d'offres correspondant aux filtres, au-delà de la page. */
  total: number;
  /** Publication la plus récente, toutes offres confondues. */
  lastUpdate: string | null;
  /** Villes présentes en base, pour alimenter le filtre. */
  cities: string[];
}

const PAGE_SIZE = 40;

export async function fetchJobs(filters: JobFilters): Promise<JobResults> {
  const supabase = publicClient();

  let query = supabase
    .from('vitae_job_offers')
    .select(
      'id, type, category, title, company, location, description, contract_type, posted_at, apply_url, is_remote',
      { count: 'exact' },
    )
    .order('posted_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (filters.type === 'emploi' || filters.type === 'stage') {
    query = query.eq('type', filters.type);
  }
  if (filters.category !== undefined && filters.category !== '') {
    query = query.eq('category', filters.category);
  }
  if (filters.city !== undefined && filters.city !== '') {
    // Les lieux sont du texte libre venu du scraping (« Abidjan, Côte
    // d'Ivoire », « Abidjan »), donc une correspondance partielle.
    query = query.ilike('location', `%${filters.city}%`);
  }
  if (filters.days !== undefined && Number.isFinite(filters.days)) {
    const since = new Date(Date.now() - filters.days * 86_400_000).toISOString();
    query = query.gte('posted_at', since);
  }

  const { data, error, count } = await query;
  if (error !== null || data === null) {
    return { offers: [], total: 0, lastUpdate: null, cities: [] };
  }

  const offers: JobOffer[] = data.map((row) => ({
    id: row.id as string,
    type: row.type as 'emploi' | 'stage',
    category: row.category as string,
    title: row.title as string,
    company: row.company as string,
    location: row.location as string | null,
    description: row.description as string | null,
    contractType: row.contract_type as string | null,
    postedAt: row.posted_at as string,
    applyUrl: row.apply_url as string,
    isRemote: row.is_remote as boolean,
  }));

  const [lastUpdate, cities] = await Promise.all([cachedLastUpdate(), cachedCities()]);

  return { offers, total: count ?? offers.length, lastUpdate, cities };
}

/**
 * Métadonnées de la page, mises en cache une heure.
 *
 * Elles sont identiques pour tous les visiteurs et ne changent qu'au passage
 * du scraper, une fois par jour. Les recalculer à chaque affichage coûtait
 * deux requêtes — dont une qui ramène un millier de lignes — pour un résultat
 * inchangé : c'est exactement ce que la contrainte de réseau lent interdit.
 */
const cachedLastUpdate = unstable_cache(
  () => fetchLastUpdate(),
  ['vitae-jobs-last-update'],
  { revalidate: 3600 },
);

const cachedCities = unstable_cache(
  () => fetchCities(),
  ['vitae-jobs-cities'],
  { revalidate: 3600 },
);

/** Date de l'offre la plus récente — c'est ce qui prouve que le flux est vivant. */
async function fetchLastUpdate(): Promise<string | null> {
  const supabase = publicClient();
  const { data } = await supabase
    .from('vitae_job_offers')
    .select('posted_at')
    .order('posted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.posted_at as string | undefined) ?? null;
}

/**
 * Villes proposées au filtre.
 *
 * Extraites du texte libre des offres : on garde le premier segment avant la
 * virgule (« Abidjan, Côte d'Ivoire » → « Abidjan ») et on ne conserve que
 * celles qui reviennent assez pour être utiles.
 */
async function fetchCities(): Promise<string[]> {
  const supabase = publicClient();
  const { data } = await supabase
    .from('vitae_job_offers')
    .select('location')
    .not('location', 'is', null)
    .limit(1000);
  if (data === null) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    const raw = (row.location as string | null) ?? '';
    const city = raw.split(',')[0]?.trim() ?? '';
    if (city.length < 3) continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([city]) => city)
    .sort((a, b) => a.localeCompare(b, 'fr'));
}
