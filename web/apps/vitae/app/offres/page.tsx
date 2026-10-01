import type { Metadata } from 'next';
import Link from 'next/link';
import { PAGE_SIZE, cleanQuery, fetchJobs } from '../../lib/jobs';
import {
  JOB_CATEGORIES, formatAge, formatLongDate, jobCategoryLabel,
} from '../../lib/catalog';

export const metadata: Metadata = {
  title: 'Offres de stage et d’emploi en Côte d’Ivoire',
  alternates: { canonical: '/offres' },
  description:
    'Offres de stage et d’emploi en Côte d’Ivoire, collectées chaque jour depuis '
    + 'des sources vérifiées, avec le lien de candidature direct.',
};

/**
 * Liste des offres.
 *
 * Rendu serveur, consultable sans compte, et revalidé toutes les heures : le
 * scraper tourne une fois par jour, une page recalculée à chaque visite ne
 * ferait qu'ajouter de la latence sur une connexion lente.
 *
 * ── Pourquoi cette forme ─────────────────────────────────────────────
 * L'ancienne page ouvrait d'emblée quatre rangées de pastilles — douze
 * secteurs, quinze villes — avant la première offre : sur téléphone, on
 * faisait défiler un écran de filtres pour voir un emploi. Désormais :
 *
 * - le seul choix que tout le monde fait (emploi ou stage) reste visible,
 *   en trois onglets ;
 * - une recherche libre couvre l'essentiel des autres besoins ;
 * - secteur, ville et date sont repliés dans « Filtres », en listes
 *   déroulantes natives — le téléphone affiche son propre sélecteur, bien
 *   plus confortable que quinze pastilles ;
 * - les filtres actifs apparaissent en étiquettes qu'on retire d'un toucher.
 *
 * Aucun JavaScript : un formulaire GET et `<details>`. Les filtres restent
 * dans l'URL, donc partageables et compatibles avec le bouton retour.
 */
export const revalidate = 3600;

const FRESHNESS: Record<string, string> = {
  '1': 'Depuis hier',
  '7': '7 derniers jours',
  '30': '30 derniers jours',
};

const TYPES = [
  { value: '', label: 'Tout' },
  { value: 'emploi', label: 'Emploi' },
  { value: 'stage', label: 'Stage' },
];

interface Params {
  q?: string;
  type?: string;
  secteur?: string;
  ville?: string;
  jours?: string;
  plus?: string;
}

/** URL de la liste avec ces critères, les autres conservés. */
function offersHref(current: Params, patch: Params, hash = ''): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const query = params.toString();
  return `${query === '' ? '/offres' : `/offres?${query}`}${hash}`;
}

const selectClass =
  'w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base focus:border-accent focus:outline-none';

export default async function OffresPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const raw = await searchParams;
  // `plus` ne survit pas à un changement de critère : un nouveau filtre
  // repart de la première page.
  const params: Params = { ...raw, q: cleanQuery(raw.q) || undefined };
  const base: Params = { ...params, plus: undefined };
  const days = params.jours === undefined ? undefined : Number.parseInt(params.jours, 10);
  const pages = Math.min(Math.max(Number.parseInt(params.plus ?? '1', 10) || 1, 1), 10);

  const { offers, total, lastUpdate, cities } = await fetchJobs({
    query: params.q,
    type: params.type,
    category: params.secteur,
    city: params.ville,
    limit: pages * PAGE_SIZE,
    ...(days !== undefined && Number.isFinite(days) ? { days } : {}),
  });

  const active: { label: string; href: string }[] = [];
  if (params.q !== undefined) active.push({ label: `« ${params.q} »`, href: offersHref(base, { q: '' }) });
  if (params.secteur) active.push({ label: jobCategoryLabel(params.secteur), href: offersHref(base, { secteur: '' }) });
  if (params.ville) active.push({ label: params.ville, href: offersHref(base, { ville: '' }) });
  if (params.jours && FRESHNESS[params.jours]) {
    active.push({ label: FRESHNESS[params.jours] as string, href: offersHref(base, { jours: '' }) });
  }
  const panelCount = [params.secteur, params.ville, params.jours].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Offres d’emploi et de stage</h1>
        <p className="mt-1 text-sm text-muted">
          Mises à jour chaque jour
          {lastUpdate !== null ? <> · dernière offre le {formatLongDate(lastUpdate)}</> : null}
        </p>
      </header>

      {/* Le choix que tout le monde fait : toujours visible, en onglets. */}
      <nav aria-label="Type d’offre" className="grid grid-cols-3 gap-1 rounded-full bg-white p-1 shadow-[inset_0_0_0_1px_var(--color-line)]">
        {TYPES.map((t) => {
          const selected = (params.type ?? '') === t.value;
          return (
            <Link
              key={t.value || 'tout'}
              href={offersHref(base, { type: t.value })}
              aria-current={selected ? 'page' : undefined}
              className={`flex min-h-11 items-center justify-center rounded-full text-sm font-semibold ${
                selected ? 'bg-header text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <form action="/offres" method="get" role="search" className="flex flex-col gap-3">
        {params.type ? <input type="hidden" name="type" value={params.type} /> : null}

        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Rechercher un poste ou une entreprise</span>
            <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M13 13l4.5 4.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ''}
              enterKeyHint="search"
              placeholder="Poste, entreprise…"
              className="w-full rounded-full border border-line bg-white py-3 pl-11 pr-4 text-base placeholder:text-muted/70 focus:border-accent focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="min-h-12 shrink-0 rounded-full bg-header px-5 text-sm font-semibold text-white hover:bg-ink"
          >
            Chercher
          </button>
        </div>

        {/* Les critères secondaires, repliés. Le même formulaire les envoie :
            la recherche tapée n'est pas perdue en ajoutant un filtre. */}
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold hover:border-ink [&::-webkit-details-marker]:hidden">
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 5h14M6 10h8M8.5 15h3" />
            </svg>
            Filtres
            {panelCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs text-header">
                {panelCount}
              </span>
            ) : null}
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </summary>

          <div className="card mt-3 grid gap-4 p-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Secteur</span>
              <select name="secteur" defaultValue={params.secteur ?? ''} className={selectClass}>
                <option value="">Tous les secteurs</option>
                {Object.entries(JOB_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            {cities.length > 0 ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold">Ville</span>
                <select name="ville" defaultValue={params.ville ?? ''} className={selectClass}>
                  <option value="">Toutes les villes</option>
                  {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>
            ) : null}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Publiée</span>
              <select name="jours" defaultValue={params.jours ?? ''} className={selectClass}>
                <option value="">N’importe quand</option>
                {Object.entries(FRESHNESS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
              <button
                type="submit"
                className="min-h-12 flex-1 rounded-full bg-accent px-6 text-base font-semibold text-header hover:bg-accent-dark sm:flex-none"
              >
                Voir les offres
              </button>
              <Link href={offersHref({}, { type: params.type })} className="min-h-11 px-2 py-3 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
                Tout effacer
              </Link>
            </div>
          </div>
        </details>
      </form>

      {active.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Filtres actifs">
          {active.map((a) => (
            <li key={a.label}>
              <Link
                href={a.href}
                aria-label={`Retirer le filtre ${a.label}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent-soft py-1 pl-3 pr-2 text-sm text-header"
              >
                {a.label}
                <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 opacity-60" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-sm font-medium" aria-live="polite">
        {total === 0
          ? 'Aucune offre ne correspond.'
          : `${total} offre${total > 1 ? 's' : ''}`}
      </p>

      {total === 0 ? (
        <div className="card flex flex-col items-start gap-3 p-5">
          <p className="text-sm text-muted">
            Essayez un mot plus court, ou retirez un filtre.
          </p>
          <Link href="/offres" className="inline-flex min-h-11 items-center rounded-full border-2 border-accent px-4 text-sm font-semibold text-accent-ink">
            Voir toutes les offres
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {offers.map((offer, i) => (
            <li key={offer.id} id={`offre-${i}`} className="card flex scroll-mt-4 flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${
                  offer.type === 'stage' ? 'bg-accent-soft text-header' : 'bg-header text-white'
                }`}
                >
                  {offer.type === 'stage' ? 'Stage' : 'Emploi'}
                </span>
                {offer.isRemote ? (
                  <span className="rounded-full border border-line px-2 py-0.5 text-muted">Télétravail</span>
                ) : null}
                <span className="text-muted">Publiée {formatAge(offer.postedAt)}</span>
              </div>

              <h2 className="text-base font-semibold leading-snug">{offer.title}</h2>
              <p className="text-sm text-muted">
                {[offer.company, offer.location].filter(Boolean).join(' · ')}
              </p>
              {offer.description !== null && offer.description.trim() !== '' ? (
                <p className="line-clamp-2 text-sm text-muted">{offer.description}</p>
              ) : null}

              <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                <span className="min-w-0 truncate text-xs text-muted">
                  {[jobCategoryLabel(offer.category), offer.contractType].filter(Boolean).join(' · ')}
                </span>
                <a
                  href={offer.applyUrl}
                  target="_blank"
                  // noreferrer autant que noopener : on n'envoie pas le
                  // parcours de nos utilisateurs aux sites d'annonces.
                  rel="noopener noreferrer"
                  aria-label={`Postuler : ${offer.title} (ouvre le site de l’annonce)`}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-semibold text-header hover:bg-accent-dark"
                >
                  Postuler
                  <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 3h7v7M13 3L4 12" />
                  </svg>
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      {offers.length < total && pages < 10 ? (
        // Un lien plutôt qu'un chargement en JavaScript : la page suivante
        // s'ouvre à la première offre nouvelle, et le retour arrière marche.
        <Link
          href={offersHref(params, { plus: String(pages + 1) }, `#offre-${offers.length}`)}
          className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-accent bg-white px-6 text-base font-semibold text-accent-ink hover:bg-accent-soft"
        >
          Afficher plus d’offres ({total - offers.length} restantes)
        </Link>
      ) : null}

      <aside className="card flex flex-col items-start gap-2 p-4">
        <h2 className="font-semibold">Votre CV est-il prêt ?</h2>
        <p className="text-sm text-muted">
          La plupart de ces annonces passent par un logiciel de tri avant d’être
          lues par un humain. Vérifiez que le vôtre est lisible.
        </p>
        <Link
          href="/cv"
          className="mt-1 inline-flex min-h-11 items-center rounded-full border-2 border-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-soft"
        >
          Créer ou améliorer mon CV
        </Link>
      </aside>
    </div>
  );
}
