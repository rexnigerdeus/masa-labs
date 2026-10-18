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
 * Accessible sans compte : la base n'ouvre aux visiteurs que les offres au
 * statut `published` (migration `20261018120000_vitae_lot_a.sql`).
 *
 * Brief v2, « Offres d'emploi » :
 * - vue par défaut : stages, débutants et niveau inconnu ; `all` montre le
 *   reste ;
 * - offres masquées après 45 jours ou une fois la date limite passée ;
 * - ville normalisée (colonne `city`) et source affichée sous chaque offre.
 *
 * Tant que la migration n'est pas appliquée, les colonnes `level`, `city`,
 * `status` et la table des sources n'existent pas : la requête retombe alors
 * sur l'ancienne forme plutôt que d'afficher une page vide.
 */

export type JobLevel = 'stage' | 'debutant' | 'confirme' | 'senior' | 'inconnu';

/** Niveaux montrés par défaut : ceux d'un étudiant ou d'un jeune diplômé. */
export const BEGINNER_LEVELS: JobLevel[] = ['stage', 'debutant', 'inconnu'];

/** Au-delà, une offre ne s'affiche plus, date limite ou pas. */
export const MAX_AGE_DAYS = 45;

export interface JobOffer {
  id: string;
  type: 'emploi' | 'stage';
  level: JobLevel;
  /** Nom de la source (« Novojob »), `null` si inconnue. */
  source: string | null;
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
  /** Mots cherchés dans l'intitulé ou le nom de l'entreprise. */
  query?: string;
  /** Nombre d'offres à renvoyer ; `PAGE_SIZE` par défaut. */
  limit?: number;
  /** true : toutes les offres ; false (défaut) : stages et débutants. */
  all?: boolean;
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

export const PAGE_SIZE = 20;
const MAX_LIMIT = 200;

/**
 * Nettoie une recherche libre avant de l'insérer dans un filtre PostgREST.
 *
 * La valeur est posée dans une expression `or=(…)` : une virgule, une
 * parenthèse ou un joker y changeraient le sens de la requête. On ne garde
 * que des lettres, des chiffres, des espaces et quelques signes inoffensifs.
 */
export function cleanQuery(raw: string | undefined): string {
  return (raw ?? '')
    .replace(/[^\p{L}\p{N}\s'’-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

const COLUMNS =
  'id, type, level, category, title, company, location, city, description, contract_type, '
  + 'posted_at, apply_url, is_remote, source:vitae_job_sources(name)';
const LEGACY_COLUMNS =
  'id, type, category, title, company, location, description, contract_type, posted_at, apply_url, is_remote';

/** Colonne ou relation absente : la migration du lot A n'est pas encore passée. */
function schemaNotReady(code: string | undefined): boolean {
  return code === '42703' || code === 'PGRST200' || code === 'PGRST100';
}

function toOffer(row: Record<string, unknown>): JobOffer {
  const source = row.source as { name?: string } | { name?: string }[] | null | undefined;
  const sourceName = Array.isArray(source) ? source[0]?.name : source?.name;
  return {
    id: row.id as string,
    type: row.type as 'emploi' | 'stage',
    level: (row.level as JobLevel | undefined) ?? 'inconnu',
    source: sourceName ?? null,
    category: row.category as string,
    title: row.title as string,
    company: row.company as string,
    // La ville normalisée remplace le lieu brut à l'affichage : « Abidjan,
    // Abidjan, Côte d'Ivoire » devient « Abidjan ».
    location: (row.city as string | null | undefined) ?? (row.location as string | null),
    description: row.description as string | null,
    contractType: row.contract_type as string | null,
    postedAt: row.posted_at as string,
    applyUrl: row.apply_url as string,
    isRemote: row.is_remote as boolean,
  };
}

export async function fetchJobs(filters: JobFilters): Promise<JobResults> {
  const supabase = publicClient();
  const limit = Math.min(Math.max(filters.limit ?? PAGE_SIZE, 1), MAX_LIMIT);
  const words = cleanQuery(filters.query);
  const now = Date.now();

  const build = (legacy: boolean) => {
    let query = supabase
      .from('vitae_job_offers')
      .select(legacy ? LEGACY_COLUMNS : COLUMNS, { count: 'exact' })
      .order('posted_at', { ascending: false })
      .limit(limit);

    if (words !== '') {
      query = query.or(`title.ilike.*${words}*,company.ilike.*${words}*`);
    }
    if (filters.type === 'emploi' || filters.type === 'stage') {
      query = query.eq('type', filters.type);
    }
    if (filters.category !== undefined && filters.category !== '') {
      query = query.eq('category', filters.category);
    }
    if (filters.city !== undefined && filters.city !== '') {
      query = legacy
        // Ancienne forme : lieux en texte libre, correspondance partielle.
        ? query.ilike('location', `%${filters.city}%`)
        : query.eq('city', filters.city);
    }
    const maxAge = Math.min(filters.days ?? MAX_AGE_DAYS, MAX_AGE_DAYS);
    query = query.gte('posted_at', new Date(now - maxAge * 86_400_000).toISOString());
    if (!legacy) {
      query = query
        .eq('status', 'published')
        .or(`deadline.is.null,deadline.gte.${new Date(now).toISOString().slice(0, 10)}`);
      if (filters.all !== true) query = query.in('level', BEGINNER_LEVELS);
    }
    return query;
  };

  let legacy = false;
  let { data, error, count } = await build(false);
  if (error !== null && schemaNotReady(error.code)) {
    legacy = true;
    ({ data, error, count } = await build(true));
  }
  if (error !== null || data === null) {
    return { offers: [], total: 0, lastUpdate: null, cities: [] };
  }

  const offers = (data as unknown as Record<string, unknown>[]).map(toOffer);

  const [lastUpdate, cities] = await Promise.all([
    cachedLastUpdate(),
    legacy ? cachedLegacyCities() : cachedCities(),
  ]);

  return { offers, total: count ?? offers.length, lastUpdate, cities };
}

/** Une offre publiée, par son identifiant (version ciblée, lettre). */
export async function fetchJob(id: string): Promise<JobOffer | null> {
  if (!/^[0-9a-zA-Z-]{8,64}$/.test(id)) return null;
  const { data, error } = await publicClient()
    .from('vitae_job_offers')
    .select(LEGACY_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error !== null || data === null) return null;
  return toOffer(data as unknown as Record<string, unknown>);
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
  ['vitae-jobs-cities-v2'],
  { revalidate: 3600 },
);

const cachedLegacyCities = unstable_cache(
  () => fetchLegacyCities(),
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
 * Villes proposées au filtre : la liste fixe du brief, telle que la base l'a
 * normalisée (colonne `city`), donc sans doublon possible. Ordre
 * alphabétique, « lieu non précisé » en dernier.
 */
async function fetchCities(): Promise<string[]> {
  const { data } = await publicClient()
    .from('vitae_job_offers')
    .select('city')
    .eq('status', 'published')
    .not('city', 'is', null)
    .limit(2000);
  if (data === null) return [];
  const cities = [...new Set(data.map((row) => row.city as string))];
  const unknown = (c: string): boolean => c.includes('non précisé');
  return cities.sort((a, b) => {
    if (unknown(a) !== unknown(b)) return unknown(a) ? 1 : -1;
    return a.localeCompare(b, 'fr');
  });
}

/**
 * Villes proposées au filtre, avant la migration du lot A.
 *
 * Extraites du texte libre des offres : on garde le premier segment avant la
 * virgule (« Abidjan, Côte d'Ivoire » → « Abidjan ») et on ne conserve que
 * celles qui reviennent assez pour être utiles.
 */
async function fetchLegacyCities(): Promise<string[]> {
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
