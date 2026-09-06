import Link from 'next/link';
import { ListingCard } from '../components/ListingCard';
import { EmptyState } from '../components/ui';
import { CATEGORIES } from '../lib/catalog';
import { latestListings } from '../lib/db/listings';

// Les annonces bougent, mais pas à la seconde : trente secondes de cache
// épargnent une requête par visiteur sur l'écran le plus consulté.
export const revalidate = 30;

export default async function AccueilPage() {
  const listings = await latestListings(8);

  return (
    <div className="flex flex-col gap-8">
      <section className="card flex flex-col gap-4 bg-surface p-6">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Le matériel dont vous avez besoin, à côté de chez vous
        </h1>
        <p className="max-w-2xl text-muted">
          Caméras, enceintes, projecteurs, instruments : louez ou achetez
          auprès de particuliers et de professionnels d’Abidjan. Vous payez en
          main propre à la remise du matériel.
        </p>

        <form action="/annonces" className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            name="q"
            placeholder="Que cherchez-vous ? (caméra, enceinte, projecteur…)"
            className="w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-light"
          >
            Rechercher
          </button>
        </form>

        <p className="text-sm text-muted">
          Vous avez du matériel qui dort ?{' '}
          <Link href="/publier" className="font-medium text-primary underline">
            Publiez une annonce gratuitement
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Parcourir par catégorie</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((category) => (
            <li key={category.id}>
              <Link
                href={`/annonces?categorie=${category.id}`}
                className="card flex h-full flex-col gap-1 p-4 hover:border-primary"
              >
                <span className="font-medium">{category.label}</span>
                <span className="text-xs text-muted">
                  {category.children.map((c) => c.label).join(', ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Dernières annonces</h2>
          <Link href="/annonces" className="text-sm text-primary underline">
            Tout voir
          </Link>
        </div>

        {listings.length === 0 ? (
          <EmptyState title="Aucune annonce pour le moment">
            Hive démarre à Abidjan.{' '}
            <Link href="/publier" className="text-primary underline">
              Publiez la première annonce
            </Link>
            .
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
