import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OrderCard } from '../../components/OrderCard';
import { Badge, EmptyState } from '../../components/ui';
import { setListingStatus } from '../../lib/actions/listings';
import { listingsOf } from '../../lib/db/listings';
import { ordersAsSeller } from '../../lib/db/orders';
import { formatFcfa } from '../../lib/pricing';
import { coverUrl } from '../../lib/storage';
import { currentUser } from '../../lib/supabase/server';

export const metadata: Metadata = { title: 'Mes annonces — Hive' };

export default async function MesAnnoncesPage() {
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/mes-annonces');

  const [listings, orders] = await Promise.all([
    listingsOf(user.id),
    ordersAsSeller(user.id),
  ]);

  // Les demandes en attente passent devant : c'est la seule chose sur cet
  // écran qui attend une décision du loueur.
  const pending = orders.filter((o) => o.status === 'demandee');
  const others = orders.filter((o) => o.status !== 'demandee');

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">Mes annonces</h1>
          <Link href="/publier" className="text-sm text-primary underline">Publier</Link>
        </div>

        {listings.length === 0 ? (
          <EmptyState title="Vous n’avez pas encore d’annonce">
            <Link href="/publier" className="text-primary underline">
              Publiez votre premier matériel
            </Link>
            . C’est gratuit et visible immédiatement.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {listings.map((listing) => {
              const cover = coverUrl(listing.photos);
              return (
                <li key={listing.id} className="card flex items-center gap-3 p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface">
                    {cover !== null ? (
                      <img src={cover} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-1">
                    <Link href={`/annonces/${listing.id}`} className="font-medium hover:underline">
                      {listing.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {listing.commune}
                      {listing.rent_price_day !== null
                        ? ` · ${formatFcfa(listing.rent_price_day)} / jour`
                        : null}
                    </p>
                  </div>

                  {listing.status !== 'publie' ? (
                    <Badge>{listing.status === 'retire' ? 'Retirée' : 'Suspendue'}</Badge>
                  ) : null}

                  <Link
                    href={`/annonces/${listing.id}/modifier`}
                    className="text-sm text-primary underline"
                  >
                    Modifier
                  </Link>

                  {/* Une annonce suspendue par la modération ne se remet pas
                      en ligne d'un clic : seul le retrait volontaire s'annule. */}
                  {listing.status !== 'suspendu' ? (
                    <form action={setListingStatus}>
                      <input type="hidden" name="id" value={listing.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={listing.status === 'publie' ? 'retire' : 'publie'}
                      />
                      <button type="submit" className="text-sm text-muted underline">
                        {listing.status === 'publie' ? 'Retirer' : 'Remettre en ligne'}
                      </button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Demandes reçues</h2>

        {orders.length === 0 ? (
          <EmptyState title="Aucune demande pour l’instant" />
        ) : (
          <ul className="flex flex-col gap-3">
            {[...pending, ...others].map((order) => (
              <li key={order.id}><OrderCard order={order} party="seller" /></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
