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
  if (listing === null) return { title: 'Annonce introuvable' };

  // La description reprend ce qu'on taperait pour trouver l'annonce : l'objet,
  // le mode et la commune. Le texte libre du loueur complète s'il reste
  // de la place — 160 caractères, au-delà les moteurs coupent.
  const modes = [
    listing.for_rent ? 'à louer' : null,
    listing.for_sale ? 'à vendre' : null,
  ].filter((m) => m !== null).join(' et ');

  return {
    title: listing.title,
    description:
      `${listing.title} ${modes} à ${listing.commune}, Abidjan. ${listing.description}`
        .trim().slice(0, 160),
    alternates: { canonical: `/annonces/${listing.id}` },
    // L'aperçu WhatsApp est le premier contact avec Hive pour la plupart des
    // visiteurs : la photo compte autant que le titre.
    openGraph: {
      type: 'article',
      title: listing.title,
      images: listing.photos.map((p) => photoUrl(p)).slice(0, 1),
    },
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

  // Balisage produit : c'est lui qui permet au prix et à la disponibilité
  // d'apparaître directement dans les résultats de recherche. Le prix annoncé
  // est celui du jour de location quand l'annonce en propose une, sinon le
  // prix de vente — c'est aussi l'ordre dans lequel la fiche les affiche.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || listing.title,
    category: CATEGORY_LABELS[listing.category_id] ?? listing.category_id,
    itemCondition: listing.condition === 'neuf'
      ? 'https://schema.org/NewCondition'
      : 'https://schema.org/UsedCondition',
    image: listing.photos.map((p) => photoUrl(p)),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'XOF',
      price: listing.for_rent ? listing.rent_price_day : listing.sale_price,
      availability: listing.status === 'publie'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      areaServed: { '@type': 'City', name: `${listing.commune}, Abidjan` },
      seller: { '@type': 'Person', name: listing.owner?.full_name ?? 'Loueur Hive' },
    },
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
            <Link
              href={`/annonces/${listing.id}/modifier`}
              className="rounded-full bg-primary px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-light"
            >
              Modifier l’annonce
            </Link>
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
