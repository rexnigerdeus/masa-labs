import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchJobs } from '../../lib/jobs';
import {
  JOB_CATEGORIES, formatAge, formatLongDate, jobCategoryLabel,
} from '../../lib/catalog';

export const metadata: Metadata = {
  title: 'Offres de stage et d’emploi en Côte d’Ivoire — Vitae',
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
 */
export const revalidate = 3600;

const FRESHNESS = [
  { value: '', label: 'Toutes' },
  { value: '7', label: '7 derniers jours' },
  { value: '30', label: '30 derniers jours' },
];

interface Params {
  type?: string;
  secteur?: string;
  ville?: string;
  jours?: string;
}

/** Construit une URL de filtre en conservant les autres critères actifs. */
function filterHref(current: Params, patch: Params): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const query = params.toString();
  return query === '' ? '/offres' : `/offres?${query}`;
}

function FilterRow({ label, options, active, current, param }: {
  label: string;
  options: { value: string; label: string }[];
  active: string;
  current: Params;
  param: keyof Params;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="w-20 shrink-0 text-xs font-medium text-muted">{label}</span>
      {options.map((option) => {
        const selected = active === option.value;
        return (
          <Link
            key={option.value || 'tous'}
            href={filterHref(current, { [param]: option.value })}
            aria-current={selected ? 'true' : undefined}
            className={`rounded-full px-3 py-1 text-xs ${
              selected ? 'bg-header text-white' : 'border border-line bg-white hover:bg-accent-soft'
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

export default async function OffresPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const days = params.jours === undefined ? undefined : Number.parseInt(params.jours, 10);

  const { offers, total, lastUpdate, cities } = await fetchJobs({
    type: params.type,
    category: params.secteur,
    city: params.ville,
    ...(days !== undefined && Number.isFinite(days) ? { days } : {}),
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Offres de stage et d’emploi</h1>
        <p className="max-w-2xl text-sm text-muted">
          Collectées chaque jour depuis des sources vérifiées. Chaque annonce
          renvoie directement à la page de candidature d’origine — Vitae ne
          collecte aucune candidature.
          {lastUpdate !== null ? (
            <> Dernière offre publiée le {formatLongDate(lastUpdate)}.</>
          ) : null}
        </p>
      </header>

      <section className="card flex flex-col gap-3 p-4" aria-label="Filtres">
        <FilterRow
          label="Type" param="type" current={params} active={params.type ?? ''}
          options={[
            { value: '', label: 'Tout' },
            { value: 'emploi', label: 'Emploi' },
            { value: 'stage', label: 'Stage' },
          ]}
        />
        <FilterRow
          label="Secteur" param="secteur" current={params} active={params.secteur ?? ''}
          options={[
            { value: '', label: 'Tous' },
            ...Object.entries(JOB_CATEGORIES).map(([value, label]) => ({ value, label })),
          ]}
        />
        {cities.length > 0 ? (
          <FilterRow
            label="Ville" param="ville" current={params} active={params.ville ?? ''}
            options={[
              { value: '', label: 'Toutes' },
              ...cities.map((city) => ({ value: city, label: city })),
            ]}
          />
        ) : null}
        <FilterRow
          label="Publiée" param="jours" current={params} active={params.jours ?? ''}
          options={FRESHNESS}
        />
      </section>

      <p className="text-sm text-muted">
        {total === 0
          ? 'Aucune offre ne correspond à ces critères.'
          : `${total} offre${total > 1 ? 's' : ''}${offers.length < total ? ` — les ${offers.length} plus récentes` : ''}`}
      </p>

      {total === 0 ? (
        <p className="text-sm">
          <Link href="/offres" className="text-accent-dark underline">
            Retirer les filtres
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {offers.map((offer) => (
            <li key={offer.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold">{offer.title}</h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {[offer.company, offer.location].filter(Boolean).join(' — ')}
                  </p>
                </div>
                <a
                  href={offer.applyUrl}
                  target="_blank"
                  // noreferrer autant que noopener : on n'envoie pas le
                  // parcours de nos utilisateurs aux sites d'annonces.
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
                >
                  Postuler
                </a>
              </div>

              <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <li className="rounded-full bg-accent-soft px-2 py-0.5 text-header">
                  {offer.type === 'stage' ? 'Stage' : 'Emploi'}
                </li>
                <li className="rounded-full border border-line px-2 py-0.5 text-muted">
                  {jobCategoryLabel(offer.category)}
                </li>
                {offer.isRemote ? (
                  <li className="rounded-full border border-line px-2 py-0.5 text-muted">
                    Télétravail
                  </li>
                ) : null}
                {offer.contractType !== null ? (
                  <li className="rounded-full border border-line px-2 py-0.5 text-muted">
                    {offer.contractType}
                  </li>
                ) : null}
                <li className="px-1 py-0.5 text-muted">Publiée {formatAge(offer.postedAt)}</li>
              </ul>

              {offer.description !== null && offer.description.trim() !== '' ? (
                <p className="mt-2 line-clamp-3 text-sm text-muted">{offer.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <aside className="card p-4">
        <h2 className="font-semibold">Votre CV est-il prêt ?</h2>
        <p className="mt-1 text-sm text-muted">
          La plupart de ces annonces passent par un logiciel de tri avant d’être
          lues par un humain. Vérifiez que le vôtre est lisible.
        </p>
        <Link
          href="/cv"
          className="mt-3 inline-block rounded-full border border-accent px-4 py-1.5 text-sm font-medium text-accent-dark hover:bg-accent-soft"
        >
          Créer ou améliorer mon CV
        </Link>
      </aside>
    </div>
  );
}
