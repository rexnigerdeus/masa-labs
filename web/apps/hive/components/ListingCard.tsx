import Link from 'next/link';
import { Badge } from './ui';
import { CATEGORY_LABELS } from '../lib/catalog';
import { formatFcfa } from '../lib/pricing';
import { coverUrl } from '../lib/storage';
import type { Listing } from '../lib/types';

/** Vignette d'annonce, identique en recherche, sur l'accueil et dans « Mes annonces ». */
export function ListingCard({ listing }: { listing: Listing }) {
  const cover = coverUrl(listing.photos);

  return (
    <Link href={`/annonces/${listing.id}`} className="card flex flex-col overflow-hidden">
      <div className="aspect-4/3 w-full bg-surface">
        {cover === null ? (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            Pas de photo
          </div>
        ) : (
          // eslint n'est pas configuré ici, et l'optimiseur d'images de Next
          // est désactivé (next.config.ts) : une balise <img> ordinaire est
          // exactement ce qu'il faut pour une photo déjà compressée.
          <img
            src={cover}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex flex-wrap gap-1.5">
          {listing.for_rent ? <Badge tone="rent">Location</Badge> : null}
          {listing.for_sale ? <Badge tone="sale">Vente</Badge> : null}
          {listing.condition === 'neuf' ? <Badge>Neuf</Badge> : null}
        </div>

        <p className="line-clamp-2 font-medium">{listing.title}</p>

        <p className="text-sm text-muted">
          {CATEGORY_LABELS[listing.category_id] ?? listing.category_id} · {listing.commune}
        </p>

        <p className="mt-auto pt-1 font-semibold text-primary">
          {listing.for_rent && listing.rent_price_day !== null
            ? `${formatFcfa(listing.rent_price_day)} / jour`
            : null}
          {listing.for_rent && listing.for_sale ? ' · ' : null}
          {listing.for_sale && listing.sale_price !== null
            ? `${formatFcfa(listing.sale_price)} à l’achat`
            : null}
        </p>
      </div>
    </Link>
  );
}
