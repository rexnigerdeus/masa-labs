import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/config';

/** Le site vitrine n'a rien de privé : tout est explorable. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
