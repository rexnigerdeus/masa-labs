import Link from 'next/link';
import { ListingCard } from '../components/ListingCard';
import { CATEGORIES } from '../lib/catalog';
import { latestListings } from '../lib/db/listings';
import { APP_URL } from '../lib/config';

// Les annonces bougent, mais pas à la seconde : trente secondes de cache
// épargnent une requête par visiteur sur l'écran le plus consulté.
export const revalidate = 30;

/**
 * Comment fonctionne Hive, des deux côtés du marché.
 *
 * Une place de marché doit convaincre deux personnes qui ne se ressemblent
 * pas : celle qui cherche du matériel et celle qui en possède. Les mélanger
 * dans un même paragraphe ne parle ni à l'une ni à l'autre.
 */
const STEPS = [
  {
    side: 'Vous cherchez du matériel',
    steps: [
      'Cherchez, filtrez par commune, par catégorie et par budget.',
      'Envoyez une demande avec vos dates. Rien n’est débité.',
      'Le loueur confirme, vous récupérez le matériel et vous le réglez sur place.',
    ],
  },
  {
    side: 'Vous avez du matériel',
    steps: [
      'Photographiez-le et publiez : cinq photos, un prix par jour, c’est tout.',
      'Recevez les demandes et acceptez celles qui vous arrangent.',
      'Remettez le matériel, encaissez directement. Hive ne prend rien.',
    ],
  },
];

/**
 * Ce qui lève les objections d'un premier visiteur.
 *
 * Hive est nouveau et n'a aucune preuve sociale à montrer — on n'en fabrique
 * pas. Ce qui reste, et qui est vrai, ce sont les règles du jeu : elles se
 * disent en une ligne chacune.
 */
const REASSURANCE = [
  {
    title: 'Zéro commission',
    body: 'Pendant la période de lancement, Hive ne prélève rien — ni sur vos locations, ni sur vos ventes.',
  },
  {
    title: 'Payé en main propre',
    body: 'Vous réglez le loueur à la remise du matériel. Aucun argent ne transite par la plateforme.',
  },
  {
    title: 'En ligne tout de suite',
    body: 'Pas de validation à attendre : votre annonce est visible à la seconde où vous la publiez.',
  },
  {
    title: 'Dans votre commune',
    body: 'Cocody, Marcory, Yopougon… on filtre par commune, parce qu’un jeu de projecteurs ne traverse pas Abidjan.',
  },
];

export default async function AccueilPage() {
  const listings = await latestListings(8);

  // Décrit le site aux moteurs et leur donne le point d'entrée de la
  // recherche, ce que le balisage seul ne permet pas d'exprimer.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Hive',
    alternateName: 'Le Vinted de l’audiovisuel',
    url: APP_URL,
    inLanguage: 'fr',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${APP_URL}/annonces?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="flex flex-col gap-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="card flex flex-col gap-5 bg-surface p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Le Vinted de l’audiovisuel · Abidjan
        </p>

        <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">
          Le matériel qui dort chez l’un tourne chez l’autre.
        </h1>

        <p className="max-w-2xl text-lg text-muted">
          Caméras, enceintes, projecteurs, instruments. Louez ce dont vous avez
          besoin le temps d’un mariage, d’un tournage ou d’une soirée — auprès
          de quelqu’un de votre commune. Et si le vôtre dort dans un placard,
          mettez-le en location : il finira par payer le prochain.
        </p>

        <form action="/annonces" className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            name="q"
            placeholder="Que cherchez-vous ? (caméra, enceinte, projecteur…)"
            aria-label="Rechercher du matériel"
            className="w-full rounded-full border border-line bg-white px-4 py-3 focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-primary px-6 py-3 font-medium text-white hover:bg-primary-light"
          >
            Rechercher
          </button>
        </form>

        <p className="text-sm text-muted">
          Vous avez du matériel qui dort ?{' '}
          <Link href="/publier" className="font-medium text-primary underline">
            Publiez une annonce
          </Link>{' '}
          — c’est gratuit et sans commission.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REASSURANCE.map((item) => (
          <div key={item.title} className="card flex flex-col gap-1.5 p-4">
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-muted">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-xl font-bold">Comment ça marche</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((column) => (
            <div key={column.side} className="card flex flex-col gap-3 p-5">
              <p className="font-semibold text-primary">{column.side}</p>
              <ol className="flex flex-col gap-3">
                {column.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm">
                    <span
                      aria-hidden
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-primary"
                    >
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Parcourir par catégorie</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((category) => (
            <li key={category.id}>
              <Link
                href={`/annonces?categorie=${category.id}`}
                className="card flex h-full flex-col gap-1 p-4 hover:border-primary"
              >
                <span className="font-medium">{category.label}</span>
                <span className="text-xs text-muted">
                  {category.children.map((c) => c.label).join(', ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Dernières annonces</h2>
          <Link href="/annonces" className="text-sm text-primary underline">
            Tout voir
          </Link>
        </div>

        {listings.length === 0 ? (
          // Un catalogue vide est la vérité du premier jour. Plutôt que de le
          // masquer, on en fait l'argument : les premières annonces sont
          // celles qu'on met en avant (brief §6.3).
          <div className="card flex flex-col items-start gap-3 p-6">
            <p className="text-lg font-semibold">Hive démarre à Abidjan.</p>
            <p className="max-w-xl text-muted">
              Le catalogue se construit en ce moment même. Les premières
              annonces publiées sont celles que nous mettons en avant — et il
              n’y a aucune commission à payer pendant toute la période de
              lancement.
            </p>
            <Link
              href="/publier"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-light"
            >
              Publier la première annonce
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card flex flex-col items-start gap-3 bg-primary p-6 text-white sm:p-8">
        <h2 className="max-w-2xl text-2xl font-bold">
          Votre caméra ne rapporte rien au fond de son sac.
        </h2>
        <p className="max-w-xl text-white/80">
          Publier une annonce prend deux minutes, elle est en ligne
          immédiatement, et vous gardez cent pour cent de ce que vous louez.
        </p>
        <Link
          href="/publier"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-primary hover:bg-surface"
        >
          Mettre mon matériel en location
        </Link>
      </section>
    </div>
  );
}
