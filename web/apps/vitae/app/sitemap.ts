import type { MetadataRoute } from 'next';
import { APP_URL } from '../lib/config';
import { fetchArticles } from '../lib/articles';

// Les articles changent rarement ; un plan par jour suffit largement.
export const revalidate = 86400;

/**
 * Plan du site.
 *
 * Les articles de conseils en sont l'essentiel : ce sont les seules pages de
 * Vitae qui répondent à une question tapée dans un moteur (« comment écrire
 * un CV en Côte d'Ivoire »). L'éditeur et les offres sont des outils, on les
 * déclare mais ils ne rapportent pas de visites de recherche.
 *
 * Les offres d'emploi ne figurent pas ici : elles sont collectées ailleurs et
 * renvoient vers le site d'origine. Les déclarer comme du contenu de Vitae
 * reviendrait à revendiquer ce qui ne nous appartient pas.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statiques: MetadataRoute.Sitemap = [
    { url: APP_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${APP_URL}/cv`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${APP_URL}/conseils`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${APP_URL}/offres`, changeFrequency: 'daily', priority: 0.7 },
  ];

  const articles = await fetchArticles();

  return [
    ...statiques,
    ...articles.map((a) => ({
      url: `${APP_URL}/conseils/${a.id}`,
      lastModified: new Date(a.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
