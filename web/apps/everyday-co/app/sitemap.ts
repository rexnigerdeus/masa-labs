import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/config';

/**
 * Plan du site, sur le domaine de `SITE_URL`.
 *
 * L'accueil est une page unique à ancres : déclarer les ancres comme des URL
 * distinctes reviendrait à annoncer du contenu dupliqué. Seules s'y ajoutent
 * les deux pages légales. Les applications ont leur propre plan.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/confidentialite`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
