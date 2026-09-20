import type { Metadata } from 'next';
// Feuille propre à cette route : voir l'en-tête du fichier.
import './proposition.css';
import Link from 'next/link';
import { LabsHero, type LabsHeroSlide } from '@everyday/labs-ui/hero';
import { LabsPageScript } from '@everyday/labs-ui/script';
import { ListingCard } from '../../components/ListingCard';
import { CATEGORIES } from '../../lib/catalog';
import { latestListings } from '../../lib/db/listings';

/**
 * PROPOSITION DE DESIGN — accueil de Hive en langage `labs-ui`.
 *
 * Même langage visuel que la vitrine The Everyday Co. : hero plein cadre,
 * voiles dégradés, titres géants, boutons « liquides », révélations au
 * défilement. La forme vient de `@everyday/labs-ui`, la palette de Hive.
 *
 * ── Ce qui est adapté, et non copié ───────────────────────────────────
 * La vitrine fait tourner ses deux applications dans le hero. Hive n'a
 * qu'un produit mais deux publics qui ne se ressemblent pas : celui qui
 * cherche du matériel et celui qui en possède. Ce sont eux qui tournent.
 * C'est la même idée que les deux colonnes de « Comment ça marche » sur
 * la page actuelle, portée cette fois dès la première image.
 *
 * ── Ce qui ne change pas ──────────────────────────────────────────────
 * Le champ de recherche reste dans le hero. C'est la vraie porte d'entrée
 * d'une place de marché — le remplacer par un bouton de plus rallongerait
 * le chemin de quelqu'un qui sait déjà ce qu'il cherche. Le hero partagé
 * accepte pour cela un contenu libre sous ses boutons.
 *
 * Les annonces réelles sont affichées, et l'état vide reste un argument
 * plutôt qu'un manque (brief §6.3) : les premières annonces publiées sont
 * celles qu'on met en avant.
 *
 * Aucune preuve sociale inventée : les quatre garanties affichées sont les
 * règles du jeu, toutes vérifiables en publiant une annonce.
 *
 * ── Contraintes tenues ────────────────────────────────────────────────
 * Composant serveur, aucune police téléchargée. Le seul JavaScript client
 * est le hero, et `motion` n'y est chargé qu'à la demande pour la
 * parallaxe. La page en production (app/page.tsx) n'est pas modifiée tant
 * que cette proposition n'est pas validée.
 */

// Même cache que l'accueil en production : les annonces bougent, mais pas
// à la seconde.
export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Proposition de design',
  description: 'Proposition de refonte visuelle de l’accueil de Hive. Non publiée.',
  robots: { index: false, follow: false },
};

/** Les deux côtés du marché, en vedette à tour de rôle. */
const HERO_SLIDES: LabsHeroSlide[] = [
  {
    eyebrow: 'Vous cherchez du matériel',
    label: 'Louer',
    subtitle: 'Caméras, enceintes, projecteurs, instruments — à la journée, dans votre commune.',
    cta: 'Parcourir les annonces',
    href: '/annonces',
    photo: '/hero-chercher.jpg',
    focus: '55% 45%',
    // Photo d'extérieur en plein jour : au réglage courant, le titre corail
    // n'atteignait que 2,4:1 sur la zone la plus claire.
    dim: 0.4,
    tint: '48 12 15',
    accent: 'var(--color-primary)',
    glow: 'var(--color-primary-glow)',
    on: '#fff',
  },
  {
    eyebrow: 'Vous avez du matériel',
    label: 'Publier',
    subtitle: 'Cinq photos, un prix par jour, et votre annonce est en ligne. Sans commission.',
    cta: 'Publier une annonce',
    href: '/publier',
    photo: '/hero-louer.jpg',
    focus: '50% 40%',
    tint: '40 16 12',
    accent: 'var(--color-primary)',
    glow: 'var(--color-primary-glow)',
    on: '#fff',
  },
];

/**
 * Ce qui lève les objections d'un premier visiteur.
 *
 * Hive est nouveau et n'a aucune preuve sociale à montrer — on n'en
 * fabrique pas. Ce qui reste, et qui est vrai, ce sont les règles du jeu.
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

/** Le parcours, de chaque côté du marché. */
const SIDES = [
  {
    side: 'Vous cherchez du matériel',
    accent: 'var(--color-primary)',
    accentInk: 'var(--color-primary)',
    steps: [
      'Cherchez, filtrez par commune, par catégorie et par budget.',
      'Envoyez une demande avec vos dates. Rien n’est débité.',
      'Le loueur confirme, vous récupérez le matériel et vous le réglez sur place.',
    ],
  },
  {
    side: 'Vous avez du matériel',
    accent: 'var(--color-accent)',
    // Le corail vif borde la carte ; son encre écrit le texte.
    accentInk: 'var(--color-accent-ink)',
    steps: [
      'Photographiez-le et publiez : cinq photos, un prix par jour, c’est tout.',
      'Recevez les demandes et acceptez celles qui vous arrangent.',
      'Remettez le matériel, encaissez directement. Hive ne prend rien.',
    ],
  },
];

export default async function PropositionPage() {
  const listings = await latestListings(8);

  return (
    // Le gabarit de l'application centre chaque page dans un `max-w-6xl
    // px-4 py-6`. Le hero et les bandes sombres doivent en sortir : une
    // seule échappée à la racine, plutôt qu'une par section.
    <div className="labs-bleed labs-page -my-6">
      <LabsHero
        place="Abidjan, Côte d’Ivoire"
        lead="Le matériel qui dort"
        headline="tourne chez l’autre."
        slides={HERO_SLIDES}
        scrollTo="#etapes"
      >
        {/* La porte d'entrée d'une place de marché est un champ de
            recherche, pas un bouton de plus. Formulaire GET vers /annonces :
            il fonctionne avant tout JavaScript. */}
        <form action="/annonces" className="labs-search" role="search">
          <input
            type="search"
            name="q"
            placeholder="Caméra, enceinte, projecteur…"
            aria-label="Rechercher du matériel"
            className="labs-search__field"
          />
          <button type="submit" className="labs-search__submit">Rechercher</button>
        </form>
      </LabsHero>

      {/* Manifeste : la phrase qui contient tout le produit, seule sur sa
          bande. Le hero fait tourner les deux publics, il ne peut pas
          porter en plus une vérité qui ne change jamais. */}
      <section className="labs-manifesto">
        <div className="labs-manifesto__inner labs-reveal">
          <p className="labs-manifesto__text">
            Une caméra à deux millions sert huit jours par mois. À côté, un
            vidéaste refuse un mariage faute de matériel. Les deux habitent la
            même commune et ne se connaissent pas.
          </p>
          <p className="labs-manifesto__claim">Zéro commission au lancement.</p>
        </div>
      </section>

      {/* Les deux parcours, côte à côte */}
      <section id="etapes" className="labs-section">
        <div className="labs-section-head labs-reveal">
          <p className="labs-eyebrow">Comment ça marche</p>
          <h2 className="labs-h2 labs-h2--max">
            Deux façons d’utiliser Hive. Aucune ne demande de carte bancaire.
          </h2>
        </div>

        <div className="labs-sides">
          {SIDES.map((column, i) => (
            <div
              key={column.side}
              className="labs-side labs-reveal"
              style={{
                ['--i' as string]: i,
                ['--side-accent' as string]: column.accent,
                ['--side-accent-ink' as string]: column.accentInk,
              }}
            >
              <p className="labs-side__title">{column.side}</p>
              <ol className="labs-side__steps">
                {column.steps.map((step, index) => (
                  <li key={step}>
                    <span aria-hidden className="labs-side__num">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* Les règles du jeu — la seule « preuve » qu'on affiche */}
      <section id="garanties" className="labs-section">
        <div className="labs-section-head labs-reveal">
          <p className="labs-eyebrow">Ce qui est garanti</p>
          <h2 className="labs-h2">Quatre règles, et rien d’écrit en petit.</h2>
        </div>

        <ul className="labs-problem-grid">
          {REASSURANCE.map((item, i) => (
            <li
              key={item.title}
              className="labs-problem labs-reveal"
              style={{ ['--i' as string]: i }}
            >
              <span className="labs-problem__num" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Catégories */}
      <section id="categories" className="labs-section">
        <div className="labs-section-head labs-reveal">
          <p className="labs-eyebrow">Parcourir</p>
          <h2 className="labs-h2">Quatre familles de matériel.</h2>
        </div>

        <ul className="labs-cats">
          {CATEGORIES.map((category, i) => (
            <li key={category.id} className="labs-reveal" style={{ ['--i' as string]: i }}>
              <Link href={`/annonces?categorie=${category.id}`}>
                <span className="labs-cats__label">{category.label}</span>
                <span className="labs-cats__children">
                  {category.children.map((c) => c.label).join(' · ')}
                </span>
                <span className="labs-cats__go" aria-hidden>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Dernières annonces, ou l'état vide assumé */}
      <section id="annonces" className="labs-section">
        <div className="labs-section-head labs-reveal">
          <p className="labs-eyebrow">En ce moment</p>
          <h2 className="labs-h2">Dernières annonces.</h2>
        </div>

        {listings.length === 0 ? (
          // Un catalogue vide est la vérité du premier jour. Plutôt que de
          // le masquer, on en fait l'argument (brief §6.3).
          <div className="labs-note labs-reveal">
            <h3>Hive démarre à Abidjan.</h3>
            <p>
              Le catalogue se construit en ce moment même. Les premières
              annonces publiées sont celles que nous mettons en avant — et il
              n’y a aucune commission à payer pendant toute la période de
              lancement.
            </p>
            <Link href="/publier" className="labs-inline-link">
              Publier la première annonce
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
          </div>
        ) : (
          <>
            <ul className="labs-listings labs-reveal">
              {listings.map((listing) => (
                <li key={listing.id}>
                  <ListingCard listing={listing} />
                </li>
              ))}
            </ul>
            <Link href="/annonces" className="labs-inline-link labs-reveal">
              Voir toutes les annonces
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
          </>
        )}
      </section>

      {/* Double appel à l'action final */}
      <section className="labs-section labs-section--final">
        <div className="labs-final-grid">
          <Link
            href="/publier"
            className="labs-final-card labs-reveal"
            style={{
              background: 'var(--color-primary)',
              ['--on-accent' as string]: '#fff',
              ['--i' as string]: 0,
            }}
          >
            <p className="labs-final-card__eyebrow">Vous possédez</p>
            <h3>Votre caméra ne rapporte rien au fond de son sac.</h3>
            <p className="labs-final-card__body">
              Publier prend deux minutes, l’annonce est en ligne
              immédiatement, et vous gardez cent pour cent de ce que vous
              louez.
            </p>
            <span className="labs-final-card__cta">Publier une annonce →</span>
          </Link>
          <Link
            href="/annonces"
            className="labs-final-card labs-reveal"
            style={{
              background: '#2a1715',
              ['--on-accent' as string]: '#fff',
              ['--i' as string]: 1,
            }}
          >
            <p className="labs-final-card__eyebrow">Vous cherchez</p>
            <h3>Le matériel est déjà dans votre commune.</h3>
            <p className="labs-final-card__body">
              Filtrez par commune, par catégorie et par budget. Vous ne payez
              qu’à la remise, en main propre.
            </p>
            <span className="labs-final-card__cta">Parcourir les annonces →</span>
          </Link>
        </div>
      </section>

      <LabsPageScript />
    </div>
  );
}
