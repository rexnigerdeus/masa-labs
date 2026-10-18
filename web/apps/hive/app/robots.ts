import type { MetadataRoute } from 'next';

/**
 * Hive en pause : exploration permise mais rien à indexer.
 *
 * On n'interdit pas l'exploration : un robot qui ne peut pas lire la page ne
 * voit pas son `noindex`, et garderait en index les anciennes annonces.
 * La désindexation passe par la balise (layout.tsx) et l'en-tête
 * `X-Robots-Tag` (next.config.ts). Plus de plan du site.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/' } };
}
