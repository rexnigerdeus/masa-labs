import type { Metadata } from 'next';
import Link from 'next/link';
import { ListingCard } from '../../components/ListingCard';
import { EmptyState, Select } from '../../components/ui';
import { CATEGORIES, COMMUNES, CONDITIONS } from '../../lib/catalog';
import { PAGE_SIZE, searchListings } from '../../lib/db/listings';

export const metadata: Metadata = {
  title: 'Matériel à louer et à vendre',
  description:
    'Caméras, enceintes, projecteurs, instruments : cherchez par commune, '
    + 'catégorie et budget parmi les annonces de particuliers et de '
    + 'professionnels d’Abidjan.',
  alternates: { canonical: '/annonces' },
};

type Params = {
  q?: string; categorie?: string; commune?: string;
  mode?: string; etat?: string; prix?: string; page?: string;
};

/**
 * Recherche et filtres.
 *
 * Le formulaire est un simple `GET` : les filtres vivent dans l'URL, ce qui
 * les rend partageables sur WhatsApp et évite d'expédier du JavaScript pour
 * ce que le navigateur sait faire seul.
 */
export default async function AnnoncesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const mode = params.mode === 'location' || params.mode === 'vente' ? params.mode : undefined;
  const maxPrice = params.prix !== undefined && params.prix !== '' ? Number(params.prix) : undefined;

  const { rows, total } = await searchListings({
    q: params.q,
    category: params.categorie,
    commune: params.commune,
    condition: params.etat,
    mode,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    page,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number): string => {
    const next = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][],
    );
    next.set('page', String(n));
    return `/annonces?${next.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Matériel disponible à Abidjan</h1>

      <form className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <label className="col-span-2 flex flex-col gap-1 sm:col-span-3 lg:col-span-2">
          <span className="text-xs font-medium">Recherche</span>
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="caméra, enceinte…"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium">Catégorie</span>
          <Select name="categorie" defaultValue={params.categorie ?? ''}>
            <option value="">Toutes</option>
            {CATEGORIES.map((parent) => (
              <optgroup key={parent.id} label={parent.label}>
                <option value={parent.id}>Tout {parent.label.toLowerCase()}</option>
                {parent.children.map((child) => (
                  <option key={child.id} value={child.id}>{child.label}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium">Commune</span>
          <Select name="commune" defaultValue={params.commune ?? ''}>
            <option value="">Toutes</option>
            {COMMUNES.map((commune) => <option key={commune}>{commune}</option>)}
          </Select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium">Mode</span>
          <Select name="mode" defaultValue={mode ?? ''}>
            <option value="">Location et vente</option>
            <option value="location">Location</option>
            <option value="vente">Vente</option>
          </Select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium">État</span>
          <Select name="etat" defaultValue={params.etat ?? ''}>
            <option value="">Neuf et occasion</option>
            {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium">
            {mode === 'vente' ? 'Prix max' : 'Prix max / jour'}
          </span>
          <input
            type="number"
            name="prix"
            min={0}
            step={500}
            defaultValue={params.prix ?? ''}
            placeholder="FCFA"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>

        <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-6">
          <button
            type="submit"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-light"
          >
            Filtrer
          </button>
          <Link href="/annonces" className="text-sm text-muted underline">
            Tout effacer
          </Link>
        </div>
      </form>

      <p className="text-sm text-muted">
        {total === 0 ? 'Aucun résultat' : `${total} annonce${total > 1 ? 's' : ''}`}
      </p>

      {rows.length === 0 ? (
        <EmptyState title="Rien ne correspond à cette recherche">
          Élargissez la commune ou la catégorie, ou{' '}
          <Link href="/publier" className="text-primary underline">publiez votre matériel</Link>.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((listing) => (
            <li key={listing.id}><ListingCard listing={listing} /></li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 ? <Link className="underline" href={pageHref(page - 1)}>Précédent</Link> : null}
          <span className="text-muted">Page {page} sur {pages}</span>
          {page < pages ? <Link className="underline" href={pageHref(page + 1)}>Suivant</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
