import type { Metadata } from 'next';
// Feuille propre à cette route : voir l'en-tête du fichier.
import './proposition.css';
import Link from 'next/link';
import { SAMPLE_RESUME, TEMPLATE_LIST, scoreResume } from '@everyday/cv-core';
import { LabsHero, type LabsHeroSlide } from '@everyday/labs-ui/hero';
import { LabsPageScript } from '@everyday/labs-ui/script';
import { TemplateSketch } from '../../components/TemplateSketch';

/**
 * PROPOSITION DE DESIGN — accueil de Vitae en langage `labs-ui`.
 *
 * Même langage visuel que la vitrine The Everyday Co. : hero plein cadre,
 * voiles dégradés, titres géants, boutons « liquides », révélations au
 * défilement. La forme vient de `@everyday/labs-ui`, la palette de Vitae.
 *
 * ── Ce qui est adapté, et non copié ───────────────────────────────────
 * La vitrine fait tourner ses deux applications dans le hero. Vitae n'a
 * qu'un produit : ce sont ses trois usages qui tournent — créer, postuler,
 * progresser. Ce sont déjà les trois cartes du bas de la page actuelle ;
 * elles remontent simplement là où on les voit.
 *
 * ── Ce qui ne change pas ──────────────────────────────────────────────
 * Les modèles restent montrés en croquis et non en photo ni en CV de
 * démonstration. C'est une décision de produit, pas de mise en page : un
 * CV complet réduit à 200 px ne se lit pas, et un faux CV passerait pour
 * un modèle imposé. Le croquis est dérivé du descripteur du modèle — il
 * ne peut pas mentir sur ce que produit le modèle.
 *
 * Le score affiché est celui du CV d'exemple, calculé au rendu par la même
 * fonction que l'éditeur. Aucun chiffre n'est écrit à la main ici.
 *
 * ── Contraintes tenues ────────────────────────────────────────────────
 * Composant serveur, aucune police téléchargée. Le seul JavaScript client
 * est le hero, et `motion` n'y est chargé qu'à la demande pour la
 * parallaxe. La page en production (app/page.tsx) n'est pas modifiée tant
 * que cette proposition n'est pas validée.
 */

export const metadata: Metadata = {
  title: 'Proposition de design',
  description: 'Proposition de refonte visuelle de l’accueil de Vitae. Non publiée.',
  robots: { index: false, follow: false },
};

/** Les trois usages de Vitae, en vedette à tour de rôle. */
const HERO_SLIDES: LabsHeroSlide[] = [
  {
    eyebrow: 'Créer · Gratuit',
    label: 'Créer',
    subtitle: 'Un formulaire guidé, un score en direct, un PDF propre en quelques minutes.',
    cta: 'Créer mon CV',
    href: '/cv',
    photo: '/hero-creer.jpg',
    focus: '38% 40%',
    tint: '20 34 8',
    accent: 'var(--color-accent)',
    glow: 'var(--color-accent-glow)',
    on: 'var(--color-header)',
  },
  {
    eyebrow: 'Postuler · Mis à jour chaque jour',
    label: 'Postuler',
    subtitle: 'Des offres de stage et d’emploi réelles, avec le lien de candidature direct.',
    cta: 'Voir les offres',
    href: '/offres',
    photo: '/hero-postuler.jpg',
    focus: '62% 45%',
    tint: '26 30 14',
    accent: 'var(--color-accent)',
    glow: 'var(--color-accent-glow)',
    on: 'var(--color-header)',
  },
  {
    eyebrow: 'Progresser · Conseils',
    label: 'Progresser',
    subtitle: 'Entretien, relance, droit du travail : les codes du recrutement expliqués.',
    cta: 'Lire les conseils',
    href: '/conseils',
    photo: '/hero-progresser.jpg',
    focus: '50% 55%',
    tint: '24 28 10',
    accent: 'var(--color-accent)',
    glow: 'var(--color-accent-glow)',
    on: 'var(--color-header)',
  },
];

/**
 * Ce que le logiciel de tri écarte, en quatre cas.
 *
 * La page actuelle l'explique en deux paragraphes. Les quatre pièges y
 * sont nommés en fin de phrase (« colonnes, tableaux, icônes, texte en
 * image ») : les sortir en scènes leur donne le poids qu'ils méritent,
 * puisque c'est précisément ce que le visiteur ignore.
 */
const PITFALLS = [
  {
    title: 'Deux colonnes',
    body: 'Le logiciel lit de gauche à droite, ligne par ligne. Votre colonne de gauche se mélange à celle de droite, et votre parcours devient illisible.',
  },
  {
    title: 'Un tableau',
    body: 'Les dates rangées dans une grille sortent collées les unes aux autres. L’expérience la plus récente se retrouve datée de 2016.',
  },
  {
    title: 'Des icônes',
    body: 'Le pictogramme du téléphone n’est pas un numéro. Le champ « contact » repart vide, et personne ne peut vous rappeler.',
  },
  {
    title: 'Du texte en image',
    body: 'Un titre exporté en image ne contient aucun caractère. Le poste que vous visez n’est tout simplement pas dans le fichier.',
  },
];

/** Les trois temps du produit. Mêmes textes que la page en production. */
const STEPS = [
  {
    title: 'Créer',
    body: 'Un formulaire guidé, un score en direct, un PDF propre en quelques minutes.',
    href: '/cv',
    link: 'Ouvrir l’éditeur',
  },
  {
    title: 'Postuler',
    body: 'Des offres de stage et d’emploi réelles, avec le lien de candidature direct.',
    href: '/offres',
    link: 'Voir les offres',
  },
  {
    title: 'Progresser',
    body: 'Entretien, relance, droit du travail : les codes du recrutement expliqués.',
    href: '/conseils',
    link: 'Lire les conseils',
  },
];

/**
 * Ce qui est vrai et vérifiable, pas de la preuve sociale.
 *
 * Vitae n'a ni utilisateurs à citer ni chiffres d'usage à montrer, et on
 * n'en invente pas. Les quatre nombres ci-dessous décrivent le produit
 * lui-même : ils se vérifient en ouvrant l'éditeur.
 */
const FACTS = [
  { figure: '4', label: 'Modèles, tous vérifiés lisibles par les logiciels de tri' },
  { figure: '0 F', label: 'Pour créer, corriger et télécharger le PDF' },
  { figure: '0', label: 'Filigrane sur le document, jamais' },
  { figure: '/100', label: 'Un score recalculé à chaque mot que vous tapez' },
];

export default function PropositionPage() {
  const demo = scoreResume(SAMPLE_RESUME);

  return (
    // Le gabarit de l'application centre chaque page dans un `max-w-6xl
    // px-4 py-6`. Le hero et les bandes sombres doivent en sortir : une
    // seule échappée à la racine, plutôt qu'une par section.
    <div className="labs-bleed labs-page -my-6">
      <LabsHero
        place="Abidjan, Côte d’Ivoire"
        lead="Lisible par la machine."
        headline="Lu par le recruteur."
        slides={HERO_SLIDES}
        secondary={{ label: 'Pourquoi ça bloque', href: '#tri' }}
        scrollTo="#tri"
      />

      {/* Manifeste : la phrase qui explique tout le produit, seule sur sa
          bande. Le hero fait tourner les usages, il ne peut pas porter en
          plus une vérité qui ne change jamais. */}
      <section className="labs-manifesto">
        <div className="labs-manifesto__inner labs-reveal">
          <p className="labs-manifesto__text">
            Avant d’arriver sur le bureau d’un recruteur, la plupart des
            candidatures passent par un logiciel qui lit le fichier et écarte
            ce qu’il ne comprend pas.
          </p>
          <p className="labs-manifesto__claim">
            Un beau CV illisible ne sera jamais lu.
          </p>
        </div>
      </section>

      {/* Le tri automatique, en quatre pièges concrets */}
      <section id="tri" className="labs-section">
        <div className="labs-section-head labs-reveal">
          <p className="labs-eyebrow">Pourquoi votre CV n’a pas de réponse</p>
          <h2 className="labs-h2 labs-h2--max">
            Ce n’est pas votre parcours qu’on a refusé. C’est votre fichier
            qu’on n’a pas su lire.
          </h2>
        </div>

        <ul className="labs-problem-grid">
          {PITFALLS.map((pitfall, i) => (
            <li
              key={pitfall.title}
              className="labs-problem labs-reveal"
              style={{ ['--i' as string]: i }}
            >
              <span className="labs-problem__num" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{pitfall.title}</h3>
              <p>{pitfall.body}</p>
            </li>
          ))}
        </ul>

        <p className="labs-note labs-reveal">
          Les modèles de Vitae sont conçus pour franchir cette étape — et
          vérifiés automatiquement, en réextrayant le texte de chaque PDF
          produit. Un modèle qui ne se relit pas ne sort pas.
        </p>
      </section>

      {/* Les modèles. Croquis et non photos : voir le bloc d'en-tête. */}
      <section id="modeles" className="labs-section">
        <div className="labs-section-head labs-reveal">
          <p className="labs-eyebrow">Les quatre modèles</p>
          <h2 className="labs-h2">Une seule colonne. Aucune icône. Aucun tableau.</h2>
          <p className="labs-sub">
            C’est ce qui les rend relisibles par la machine. Chacun accepte
            votre photo et la couleur de votre choix ; les croquis montrent la
            mise en page réelle, pas un CV inventé.
          </p>
        </div>

        <ul className="labs-templates">
          {TEMPLATE_LIST.map((t, i) => (
            <li key={t.id} className="labs-reveal" style={{ ['--i' as string]: i }}>
              <TemplateSketch templateId={t.id} className="labs-template__sketch" />
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <p className="labs-template__for">Idéal pour : {t.bestFor}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Le score, montré plutôt que promis */}
      <section className="labs-section">
        <div className="labs-mission labs-reveal">
          <p className="labs-eyebrow">Le score</p>
          <p className="labs-mission__text">
            Vitae note votre CV pendant que vous l’écrivez et vous dit quoi
            corriger, section par section. Le CV d’exemple atteint{' '}
            <strong className="labs-score">{demo.total}/100</strong> — le vôtre
            part de là.
          </p>
        </div>
      </section>

      {/* Les trois temps du produit */}
      <section id="etapes" className="labs-section">
        <div className="labs-section-head labs-reveal">
          <p className="labs-eyebrow">Ce que Vitae fait pour vous</p>
          <h2 className="labs-h2">Créer, postuler, progresser.</h2>
        </div>

        <ul className="labs-principles">
          {STEPS.map((step, i) => (
            <li key={step.title} className="labs-reveal" style={{ ['--i' as string]: i }}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <Link href={step.href} className="labs-inline-link">
                {step.link}
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Ce qui est vrai, chiffré */}
      <section className="labs-section">
        <div className="labs-section-head labs-reveal">
          <p className="labs-eyebrow">Ce que ça vous coûte</p>
          <h2 className="labs-h2">Rien, et sans contrepartie cachée.</h2>
        </div>

        <ul className="labs-stats">
          {FACTS.map((fact, i) => (
            <li key={fact.label} className="labs-reveal" style={{ ['--i' as string]: i }}>
              <p className="labs-stat__figure">{fact.figure}</p>
              <p className="labs-stat__label">{fact.label}</p>
            </li>
          ))}
        </ul>

        <div className="labs-note labs-reveal">
          <h3>Pourquoi c’est gratuit</h3>
          <p>
            À ce stade, ce qui compte est que des CV sortent et soient lus, pas
            le revenu. Le modèle viendra plus tard de fonctionnalités avancées
            — jamais de la porte d’entrée, et jamais en rendant payant ce qui
            est gratuit aujourd’hui.
          </p>
        </div>
      </section>

      {/* Double appel à l'action final */}
      <section className="labs-section labs-section--final">
        <div className="labs-final-grid">
          <Link
            href="/cv"
            className="labs-final-card labs-reveal"
            style={{
              background: 'var(--color-accent)',
              ['--on-accent' as string]: 'var(--color-header)',
              ['--i' as string]: 0,
            }}
          >
            <p className="labs-final-card__eyebrow">Créer</p>
            <h3>Votre CV, en quelques minutes et sans compte.</h3>
            <p className="labs-final-card__body">
              Le formulaire vous guide, le score vous corrige, le PDF sort
              gratuit et sans filigrane.
            </p>
            <span className="labs-final-card__cta">Créer mon CV →</span>
          </Link>
          <Link
            href="/offres"
            className="labs-final-card labs-reveal"
            style={{
              background: 'var(--color-header)',
              ['--on-accent' as string]: '#fff',
              ['--i' as string]: 1,
            }}
          >
            <p className="labs-final-card__eyebrow">Postuler</p>
            <h3>Un CV sans offre à qui l’envoyer ne sert à rien.</h3>
            <p className="labs-final-card__body">
              Des offres de stage et d’emploi en Côte d’Ivoire, mises à jour
              chaque jour, avec le lien de candidature direct.
            </p>
            <span className="labs-final-card__cta">Voir les offres →</span>
          </Link>
        </div>
      </section>

      <LabsPageScript />
    </div>
  );
}
