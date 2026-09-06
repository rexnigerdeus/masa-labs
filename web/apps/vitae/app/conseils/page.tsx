import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchArticles } from '../../lib/articles';
import {
  ARTICLE_CATEGORIES, LEGAL_CATEGORY, LEGAL_DISCLAIMER, articleCategoryLabel,
} from '../../lib/catalog';

export const metadata: Metadata = {
  title: 'Conseils carrière',
  alternates: { canonical: '/conseils' },
  description:
    'Recherche d’emploi, entretien, réseautage et droit du travail en Côte '
    + 'd’Ivoire : des articles courts et actionnables.',
};

// Contenu éditorial, il bouge rarement.
export const revalidate = 86400;

export default async function ConseilsPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const { categorie } = await searchParams;
  const articles = await fetchArticles(categorie);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Conseils</h1>
        <p className="max-w-2xl text-sm text-muted">
          Les codes du recrutement en Côte d’Ivoire, expliqués simplement :
          comment chercher, comment se présenter, et ce que dit la loi.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Catégories">
        <Link
          href="/conseils"
          aria-current={categorie === undefined ? 'true' : undefined}
          className={`rounded-full px-3 py-1.5 text-sm ${
            categorie === undefined ? 'bg-header text-white' : 'border border-line bg-white'
          }`}
        >
          Tout
        </Link>
        {Object.entries(ARTICLE_CATEGORIES).map(([id, label]) => (
          <Link
            key={id}
            href={`/conseils?categorie=${id}`}
            aria-current={categorie === id ? 'true' : undefined}
            className={`rounded-full px-3 py-1.5 text-sm ${
              categorie === id ? 'bg-header text-white' : 'border border-line bg-white'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {categorie === LEGAL_CATEGORY ? (
        <p className="rounded-lg bg-warn-soft px-4 py-3 text-sm">{LEGAL_DISCLAIMER}</p>
      ) : null}

      {articles.length === 0 ? (
        <p className="text-sm text-muted">Aucun article dans cette catégorie pour le moment.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {articles.map((article) => (
            <li key={article.id} className="card p-4">
              <p className="text-xs text-muted">{articleCategoryLabel(article.category)}</p>
              <h2 className="mt-1 font-semibold">
                <Link href={`/conseils/${article.id}`} className="hover:underline">
                  {article.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-muted">{article.excerpt}</p>
              {article.readTimeMinutes !== null ? (
                <p className="mt-2 text-xs text-muted">
                  {article.readTimeMinutes} min de lecture
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
