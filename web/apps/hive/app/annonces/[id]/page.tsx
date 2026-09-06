import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReservationForm } from '../../../components/ReservationForm';
import { ReportForm } from '../../../components/ReportForm';
import { Badge, Button } from '../../../components/ui';
import { CATEGORY_LABELS } from '../../../lib/catalog';
import { formatFcfa } from '../../../lib/pricing';
import { availablePaymentMethods } from '../../../lib/payments';
import { photoUrl } from '../../../lib/storage';
import { getListing } from '../../../lib/db/listings';
import { hiveProfile } from '../../../lib/db/profile';
import { currentUser } from '../../../lib/supabase/server';
import { openConversation } from '../../../lib/actions/messages';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (listing === null) return { title: 'Annonce introuvable — Hive' };
  return {
    title: `${listing.title} — Hive`,
    description: `${listing.title} à ${listing.commune}. ${listing.description}`.slice(0, 160),
    // L'aperçu WhatsApp est le premier contact avec Hive pour la plupart des
    // visiteurs : la photo compte autant que le titre.
    openGraph: { images: listing.photos.map((p) => photoUrl(p)).slice(0, 1) },
  };
}

export default async function AnnoncePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (listing === null) notFound();

  const user = await currentUser();
  const isOwner = user !== null && user.id === listing.user_id;
  const seller = await hiveProfile(listing.user_id);
  const methods = availablePaymentMethods(seller);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-4">
        {listing.photos.length === 0 ? (
          <div className="card flex aspect-4/3 items-center justify-center bg-surface text-sm text-muted">
            Ce matériel n’a pas de photo
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {listing.photos.map((path, index) => (
              <li key={path} className={index === 0 ? 'col-span-2' : ''}>
                <img
                  src={photoUrl(path)}
                  alt={`${listing.title} — photo ${index + 1}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  className="w-full rounded-[14px] border border-line object-cover"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-1.5">
          {listing.for_rent ? <Badge tone="rent">Location</Badge> : null}
          {listing.for_sale ? <Badge tone="sale">Vente</Badge> : null}
          <Badge>{listing.condition === 'neuf' ? 'Neuf' : 'Occasion'}</Badge>
          <Badge>{CATEGORY_LABELS[listing.category_id] ?? listing.category_id}</Badge>
        </div>

        <h1 className="text-2xl font-bold">{listing.title}</h1>

        <p className="text-lg font-semibold text-primary">
          {listing.for_rent && listing.rent_price_day !== null
            ? `${formatFcfa(listing.rent_price_day)} / jour`
            : null}
          {listing.for_rent && listing.rent_price_week !== null
            ? ` · ${formatFcfa(listing.rent_price_week)} / semaine`
            : null}
          {listing.for_rent && listing.for_sale ? ' · ' : null}
          {listing.for_sale && listing.sale_price !== null
            ? `${formatFcfa(listing.sale_price)} à l’achat`
            : null}
        </p>

        {listing.description !== '' ? (
          <p className="whitespace-pre-line text-muted">{listing.description}</p>
        ) : null}

        <div className="card flex flex-col gap-1 p-4 text-sm">
          <p className="font-medium">{listing.owner?.full_name ?? 'Loueur Hive'}</p>
          <p className="text-muted">{listing.commune}</p>
          {seller.bio !== null ? <p className="text-muted">{seller.bio}</p> : null}
        </div>

        {!isOwner ? <ReportForm listingId={listing.id} /> : null}
      </div>

      <aside className="flex w-full flex-col gap-3 lg:max-w-sm">
        {isOwner ? (
          <div className="card flex flex-col gap-3 p-5">
            <p className="font-medium">C’est votre annonce.</p>
            <p className="text-sm text-muted">
              Les demandes de réservation arrivent dans « Mes annonces ».
            </p>
            <Link href="/mes-annonces" className="text-sm text-primary underline">
              Voir mes annonces
            </Link>
          </div>
        ) : listing.status !== 'publie' ? (
          <div className="card p-5 text-sm text-muted">Cette annonce n’est plus en ligne.</div>
        ) : (
          <>
            <ReservationForm listing={listing} methods={methods} />
            <form action={openConversation}>
              <input type="hidden" name="listing_id" value={listing.id} />
              <Button type="submit" className="w-full">Poser une question au loueur</Button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}
