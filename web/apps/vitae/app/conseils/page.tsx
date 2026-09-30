import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchArticles, type Article } from '../../lib/articles';
import { articleImage, imageSources } from '../../lib/articleImages';
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

/**
 * Liste des conseils.
 *
 * Un article à la une, en grand, puis les autres. Sur téléphone, les autres
 * sont des lignes — vignette à gauche, titre à droite — qu'on parcourt d'un
 * pouce comme une messagerie ; sur grand écran, une grille de cartes.
 * Chaque carte est un seul lien : on touche où l'on veut.
 *
 * Les catégories défilent sur une ligne au lieu de s'empiler : cinq
 * pastilles sur trois lignes repoussaient le premier article sous la ligne
 * de flottaison.
 */

function Meta({ article }: { article: Article }) {
  return (
    <p className="text-xs font-medium text-muted">
      <span className="text-accent-ink">{articleCategoryLabel(article.category)}</span>
      {article.readTimeMinutes !== null ? <> · {article.readTimeMinutes} min</> : null}
    </p>
  );
}

function Featured({ article }: { article: Article }) {
  const image = articleImage(article.id, article.category);
  return (
    <Link
      href={`/conseils/${article.id}`}
      className="card group grid overflow-hidden md:grid-cols-[1.4fr_1fr]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...imageSources(image)}
        sizes="(min-width: 768px) 640px, 100vw"
        alt={image.alt}
        width={640}
        height={360}
        // L'article à la une est au-dessus de la ligne de flottaison : on le
        // charge tout de suite, les vignettes suivantes attendent.
        fetchPriority="high"
        className="aspect-video h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      />
      <div className="flex flex-col justify-center gap-2 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">À la une</p>
        <h2 className="text-xl font-bold leading-snug group-hover:underline sm:text-2xl">{article.title}</h2>
        <p className="line-clamp-3 text-sm text-muted">{article.excerpt}</p>
        <Meta article={article} />
      </div>
    </Link>
  );
}

function Card({ article }: { article: Article }) {
  const image = articleImage(article.id, article.category);
  return (
    <li>
      <Link
        href={`/conseils/${article.id}`}
        className="group flex h-full gap-3 rounded-[var(--radius-card)] p-1 sm:card sm:flex-col sm:gap-0 sm:overflow-hidden sm:p-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...imageSources(image)}
          sizes="(min-width: 640px) 360px, 112px"
          alt=""
          width={640}
          height={360}
          loading="lazy"
          decoding="async"
          className="h-20 w-28 shrink-0 rounded-xl object-cover sm:aspect-video sm:h-auto sm:w-full sm:rounded-none"
        />
        <div className="flex min-w-0 flex-col gap-1 py-0.5 sm:gap-2 sm:p-4">
          <h2 className="line-clamp-3 text-[0.95rem] font-semibold leading-snug group-hover:underline sm:text-base">
            {article.title}
          </h2>
          <p className="hidden text-sm text-muted sm:line-clamp-2">{article.excerpt}</p>
          <Meta article={article} />
        </div>
      </Link>
    </li>
  );
}

export default async function ConseilsPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const { categorie } = await searchParams;
  const articles = await fetchArticles(categorie);
  const [first, ...rest] = articles;

  const tabs = [
    { id: undefined, label: 'Tout' },
    ...Object.entries(ARTICLE_CATEGORIES).map(([id, label]) => ({ id, label })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Conseils</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Les codes du recrutement en Côte d’Ivoire, expliqués simplement :
          comment chercher, comment se présenter, et ce que dit la loi.
        </p>
      </header>

      <nav aria-label="Catégories" className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {tabs.map((tab) => {
            const selected = categorie === tab.id;
            return (
              <li key={tab.id ?? 'tout'}>
                <Link
                  href={tab.id === undefined ? '/conseils' : `/conseils?categorie=${tab.id}`}
                  aria-current={selected ? 'page' : undefined}
                  className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold ${
                    selected ? 'bg-header text-white' : 'border border-line bg-white text-muted hover:text-ink'
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {categorie === LEGAL_CATEGORY ? (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm">{LEGAL_DISCLAIMER}</p>
      ) : null}

      {first === undefined ? (
        <p className="text-sm text-muted">Aucun article dans cette catégorie pour le moment.</p>
      ) : (
        <>
          <Featured article={first} />
          {rest.length > 0 ? (
            <ul className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {rest.map((article) => <Card key={article.id} article={article} />)}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
