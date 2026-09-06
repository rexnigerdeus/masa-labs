import type { MetadataRoute } from 'next';
import { APP_URL } from '../lib/config';

/**
 * Directives d'exploration.
 *
 * Tout ce qui n'a de sens que connecté est écarté : ces pages redirigent vers
 * la connexion pour un robot, et les laisser explorer gaspille le budget de
 * crawl sur des redirections au lieu des annonces, qui sont le seul contenu
 * que Hive a intérêt à voir indexé.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/compte', '/connexion', '/messages', '/mes-annonces', '/mes-commandes', '/publier'],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
