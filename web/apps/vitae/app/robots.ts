import type { MetadataRoute } from 'next';
import { APP_URL } from '../lib/config';

/**
 * Directives d'exploration.
 *
 * Ce qui n'a de sens que connecté est écarté : ces pages redirigent vers la
 * connexion pour un robot, et les explorer gaspille le budget de crawl au
 * lieu des conseils et des offres, qui sont le contenu que Vitae a intérêt
 * à voir indexé.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/connexion', '/hors-ligne'],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
