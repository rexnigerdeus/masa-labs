import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/config';

/**
 * Plan du site.
 *
 * Une seule page : le site vitrine est une page unique à ancres, et déclarer
 * des ancres comme des URL distinctes reviendrait à annoncer du contenu
 * dupliqué. Les applications, elles, ont leur propre plan sur leur domaine.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL, changeFrequency: 'monthly', priority: 1 }];
}
