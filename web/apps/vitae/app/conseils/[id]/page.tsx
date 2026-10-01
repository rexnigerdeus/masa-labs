import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchArticle, fetchArticles, parseContent } from '../../../lib/articles';
import { articleImage, imageSources } from '../../../lib/articleImages';
import { APP_URL } from '../../../lib/config';
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
  if (article === null) return { title: 'Article introuvable' };
  const image = articleImage(article.id, article.category);
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/conseils/${article.id}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt,
      // L'aperçu partagé sur WhatsApp porte la photo de l'article.
      // En JPEG : WhatsApp et Facebook lisent mal le WebP dans les aperçus.
      images: [{ url: `${image.base}-og.jpg`, width: 1200, height: 630, alt: image.alt }],
    },
  };
}

/**
 * Un article.
 *
 * Mise en page de lecture : photo d'en-tête, colonne d'environ 65 signes,
 * corps à 17 px avec un interligne généreux — la plupart des lecteurs sont
 * sur téléphone, souvent en plein soleil. Les intertitres respirent, les
 * listes ont de vraies puces. En fin d'article, deux ou trois lectures de la
 * même catégorie, pour ne pas finir sur une impasse.
 */
export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await fetchArticle(id);
  if (article === null) notFound();

  const blocks = parseContent(article.content);
  const image = articleImage(article.id, article.category);
  const related = (await fetchArticles(article.category))
    .filter((a) => a.id !== article.id)
    .slice(0, 3);

  // Balisage d'article : c'est lui qui permet à la date et à l'auteur
  // d'accompagner le résultat dans les moteurs, plutôt qu'un titre seul.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    image: `${APP_URL}${image.base}-og.jpg`,
    inLanguage: 'fr',
    author: { '@type': 'Organization', name: article.author ?? 'Vitae' },
    publisher: { '@type': 'Organization', name: 'The Everyday Co.' },
  };

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav>
        <Link href="/conseils" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-muted hover:text-ink">
          <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Tous les conseils
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <Link
          href={`/conseils?categorie=${article.category}`}
          className="self-start rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-header"
        >
          {articleCategoryLabel(article.category)}
        </Link>
        <h1 className="text-[1.7rem] font-bold leading-tight sm:text-4xl">{article.title}</h1>
        <p className="text-lg leading-relaxed text-muted">{article.excerpt}</p>
        <p className="text-sm text-muted">
          {[
            article.author,
            article.readTimeMinutes !== null ? `${article.readTimeMinutes} min de lecture` : null,
            formatLongDate(article.publishedAt),
          ].filter(Boolean).join(' · ')}
        </p>
      </header>

      <figure className="-mx-4 sm:mx-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...imageSources(image)}
          sizes="(min-width: 768px) 768px, 100vw"
          alt={image.alt}
          width={1200}
          height={675}
          fetchPriority="high"
          className="aspect-video w-full object-cover sm:rounded-2xl"
        />
        <figcaption className="mt-2 px-4 text-xs text-muted sm:px-0">
          Photo :{' '}
          <a href={image.source} target="_blank" rel="noopener noreferrer" className="underline">
            {image.credit}
          </a>{' '}
          / Pexels
        </figcaption>
      </figure>

      {article.category === LEGAL_CATEGORY ? (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm">{LEGAL_DISCLAIMER}</p>
      ) : null}

      <div className="mx-auto flex w-full max-w-[65ch] flex-col gap-4 text-[1.0625rem] leading-[1.75]">
        {blocks.map((block, i) => {
          const content = block.spans.map((span, j) =>
            (span.bold ? <strong key={j}>{span.text}</strong> : <span key={j}>{span.text}</span>));

          if (block.kind === 'heading') {
            return <h2 key={i} className="mt-4 text-xl font-bold leading-snug">{content}</h2>;
          }
          if (block.kind === 'listItem') {
            return (
              <p key={i} className="-mt-1 flex gap-3 pl-1">
                <span aria-hidden className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{content}</span>
              </p>
            );
          }
          return <p key={i}>{content}</p>;
        })}

        {article.sourceUrl !== null ? (
          <p className="text-sm text-muted">
            Source :{' '}
            <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all underline">
              {article.sourceUrl}
            </a>
          </p>
        ) : null}
      </div>

      <aside className="mt-2 flex flex-col items-start gap-2 rounded-2xl bg-header p-5 text-white">
        <h2 className="text-lg font-bold">Passez à la pratique</h2>
        <p className="text-sm text-white/80">
          Un bon CV vaut mieux qu’un bon conseil non appliqué.
        </p>
        <Link
          href="/cv"
          className="mt-1 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-header hover:bg-accent-glow"
        >
          Créer mon CV
        </Link>
      </aside>

      {related.length > 0 ? (
        <section className="mt-2 flex flex-col gap-3" aria-labelledby="a-lire">
          <h2 id="a-lire" className="text-lg font-bold">À lire aussi</h2>
          <ul className="flex flex-col gap-3">
            {related.map((r) => {
              const thumb = articleImage(r.id, r.category);
              return (
                <li key={r.id}>
                  <Link href={`/conseils/${r.id}`} className="card group flex items-center gap-3 p-2 pr-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${thumb.base}-640.webp`}
                      alt=""
                      width={640}
                      height={360}
                      loading="lazy"
                      decoding="async"
                      className="h-16 w-24 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:underline">{r.title}</span>
                      {r.readTimeMinutes !== null ? (
                        <span className="text-xs text-muted">{r.readTimeMinutes} min de lecture</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
