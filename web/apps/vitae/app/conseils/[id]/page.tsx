import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchArticle, fetchArticles, parseContent } from '../../../lib/articles';
import {
  LEGAL_CATEGORY, LEGAL_DISCLAIMER, articleCategoryLabel, formatLongDate,
} from '../../../lib/catalog';

export const revalidate = 86400;

/** Les articles sont peu nombreux et stables : on les prérend tous. */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  const articles = await fetchArticles();
  return articles.map((a) => ({ id: a.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticle(id);
  if (article === null) return { title: 'Article introuvable — Vitae' };
  return { title: `${article.title} — Vitae`, description: article.excerpt };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await fetchArticle(id);
  if (article === null) notFound();

  const blocks = parseContent(article.content);

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4">
      <nav className="text-sm">
        <Link href="/conseils" className="text-muted hover:text-ink">
          ← Tous les conseils
        </Link>
      </nav>

      <header className="flex flex-col gap-2">
        <p className="text-xs text-muted">{articleCategoryLabel(article.category)}</p>
        <h1 className="text-2xl font-bold leading-tight">{article.title}</h1>
        <p className="text-sm text-muted">
          {[
            article.author,
            article.readTimeMinutes !== null ? `${article.readTimeMinutes} min de lecture` : null,
            formatLongDate(article.publishedAt),
          ].filter(Boolean).join(' · ')}
        </p>
      </header>

      {article.category === LEGAL_CATEGORY ? (
        <p className="rounded-lg bg-warn-soft px-4 py-3 text-sm">{LEGAL_DISCLAIMER}</p>
      ) : null}

      <div className="flex flex-col gap-3 leading-relaxed">
        {blocks.map((block, i) => {
          const content = block.spans.map((span, j) =>
            (span.bold ? <strong key={j}>{span.text}</strong> : <span key={j}>{span.text}</span>));

          if (block.kind === 'heading') {
            return <h2 key={i} className="mt-3 text-lg font-semibold">{content}</h2>;
          }
          if (block.kind === 'listItem') {
            return (
              <p key={i} className="flex gap-2 pl-1">
                <span aria-hidden>•</span>
                <span>{content}</span>
              </p>
            );
          }
          return <p key={i}>{content}</p>;
        })}
      </div>

      {article.sourceUrl !== null ? (
        <p className="text-sm text-muted">
          Source :{' '}
          <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {article.sourceUrl}
          </a>
        </p>
      ) : null}

      <aside className="card mt-4 p-4">
        <h2 className="font-semibold">Passez à la pratique</h2>
        <p className="mt-1 text-sm text-muted">
          Un bon CV vaut mieux qu’un bon conseil non appliqué.
        </p>
        <Link
          href="/cv"
          className="mt-3 inline-block rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Créer mon CV
        </Link>
      </aside>
    </article>
  );
}
