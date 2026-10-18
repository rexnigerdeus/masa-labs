import Image from 'next/image';
import {
  CONTACT_EMAIL, VITAE_LINK, WHATSAPP_CHANNEL_URL, WORKSHOP_SUBJECT,
} from '../lib/config';
import { FOUNDER } from '../lib/founder';
import { SiteFooter } from '../components/SiteFooter';
import { LabsHero, type LabsHeroSlide } from '@everyday/labs-ui/hero';
import { LabsPageScript } from '@everyday/labs-ui/script';

/**
 * Page d'accueil de The Everyday Co.
 *
 * ── Présentation ──────────────────────────────────────────────────────
 * Le langage visuel est emprunté à labs.google — d'où le préfixe `labs-`
 * des classes dans `globals.css`, qui nomme ce langage et non un
 * brouillon :
 *  1. hero plein cadre, voiles dégradés, très grand titre en bas à gauche,
 *     pastille « lieu », boutons pilules ;
 *  2. une carte produit visuelle (photo + nom posé dessus + description
 *     + lien) ;
 *  3. un rythme éditorial : une grande section par idée, titres énormes,
 *     respirations généreuses, boutons « liquides ».
 *
 * ── Brief v2 (17 octobre 2026) ────────────────────────────────────────
 * Le public a changé : les jeunes vont directement sur Vitae, la vitrine
 * parle aux écoles, partenaires, journalistes et investisseurs. D'où :
 *  - une seule app active, Vitae : l'app d'audiovisuel est archivée et
 *    n'apparaît plus, ni dans la page, ni dans les métadonnées ;
 *  - « premier CV gratuit pour toujours » remplace « tout est gratuit » :
 *    des options payantes viendront, la page ne promet que ce qui tiendra ;
 *  - chaque chiffre affiché porte un lien vers sa source ;
 *  - l'équipe est présentée comme une équipe, seul le nom de la fondatrice
 *    apparaît ;
 *  - une section « Écoles et partenaires », avant l'équipe.
 * Les textes viennent mot pour mot du brief (docs/brief-v2.md).
 *
 * Ce qui n'y figure pas est volontaire : pas de preuve sociale chiffrée,
 * pas de témoignage, pas de logo partenaire. Nous n'en avons pas, et on ne
 * les fabrique pas.
 *
 * ── Budget ────────────────────────────────────────────────────────────
 * Réseau lent, téléphone d'entrée de gamme : tout ce qui pouvait être
 * fait en CSS l'est (révélations, parallaxe, barre de lecture, boutons
 * liquides) ; `motion` n'est chargé, à la demande, que par le hero. Les
 * photos sont en WebP, 1 600 px au plus, et différées sous la ligne de
 * flottaison.
 */

const NAV = [
  { href: '#probleme', label: 'Le problème' },
  { href: '#vitae', label: 'Vitae' },
  { href: '#vision', label: 'Vision' },
  { href: '#apres', label: 'Et après ?' },
  { href: '#ecoles', label: 'Écoles' },
  { href: '#equipe', label: 'L’équipe' },
];

/** Le seul problème auquel une app répond aujourd'hui. */
const ACTIVE_PROBLEM = {
  title: 'Le CV qui ne passe pas',
  body: 'Un diplômé envoie trente candidatures et n’obtient aucune réponse. Souvent, ce n’est pas son parcours qui bloque : c’est un fichier mal construit, illisible pour le logiciel de tri ou pour le recruteur pressé.',
};

/** Problèmes à l'étude : annoncés comme tels, sans app promise. */
const STUDIED_PROBLEMS = [
  {
    title: 'La caisse dans un cahier',
    body: 'Une couturière connaît son chiffre du jour, mais pas sa marge du mois. Les logiciels de gestion coûtent plus cher que son bénéfice.',
  },
  {
    title: 'La tontine sur WhatsApp',
    body: 'Huit personnes, une cagnotte, aucune trace commune. La confiance tient jusqu’au premier désaccord sur qui a payé quoi.',
  },
];

/** Carte de Vitae.
 *
 *  La vignette est une photo de la personne à qui l'application sert — un
 *  jeune diplômé devant son ordinateur — et non une capture d'écran de
 *  l'app : réduite à la taille d'une carte, une capture n'est plus lisible.
 *
 *  `id` reprend l'ancre de l'ancienne page (#vitae) : les liens déjà
 *  partagés continuent d'atterrir au bon endroit. */
const VITAE_CARD = {
  id: 'vitae',
  name: 'Vitae',
  tag: 'Emploi',
  status: 'En ligne',
  pitch: 'Le CV qui passe les filtres.',
  desc: 'Dans les grandes entreprises, un logiciel lit souvent votre CV avant un humain. Vitae guide la rédaction section par section, note le CV en direct et produit un PDF propre que le logiciel comme le recruteur savent lire.',
  features: [
    'Premier CV gratuit pour toujours, modifiable à volonté',
    '8 modèles relus automatiquement avant d’être proposés',
    'Score et conseils de correction en direct',
    'Offres de stage et de premier emploi en Côte d’Ivoire, mises à jour chaque jour',
  ],
  href: VITAE_LINK,
  cta: 'Ouvrir Vitae',
  accent: 'var(--color-vitae)',
  // Le vert vif ne passe pas en texte sur blanc : l'encre prend le relais.
  accentInk: 'var(--color-vitae-ink)',
  thumbnail: '/thumbnail-vitae.webp',
  alt: 'Un jeune homme souriant devant son ordinateur portable, dans un espace de travail partagé',
};

/** Le hero ne montre plus qu'une slide : sans seconde app, le composant
 *  partagé masque de lui-même les barres de progression. Trois couleurs :
 *  l'aplat remplit le bouton, `glow` écrit sur le fond sombre, `on` écrit
 *  par-dessus l'aplat. */
const HERO_SLIDES: LabsHeroSlide[] = [
  {
    eyebrow: 'Emploi',
    label: 'Vitae',
    subtitle: 'Notre première app, Vitae, aide les jeunes à créer un CV pro depuis leur téléphone. Le premier CV est gratuit, pour toujours.',
    cta: 'Créer mon CV avec Vitae',
    href: VITAE_LINK,
    photo: '/hero-vitae-1600.webp',
    srcSet: '/hero-vitae-800.webp 800w, /hero-vitae-1600.webp 1600w',
    tint: '20 34 8',
    accent: 'var(--color-vitae)',
    glow: 'var(--color-vitae-glow)',
    on: 'var(--color-dark)',
  },
];

const PRINCIPLES = [
  {
    title: 'Mobile d’abord',
    body: 'Ici, le téléphone est déjà la banque, la boutique et le bureau. Nos outils partent de là — ils ne s’y adaptent pas après coup.',
  },
  {
    title: 'Un problème. Une app.',
    body: 'Chaque produit règle une seule chose, complètement. Pas de tableau de bord dont personne n’a besoin.',
  },
  {
    title: 'Marche en 3G',
    body: 'Téléphone d’entrée de gamme, connexion capricieuse, forfait compté. Ce n’est pas un cas limite : c’est le cahier des charges.',
  },
];

/**
 * Objectifs déclarés, par horizon.
 *
 * Formulés comme des intentions et non comme des résultats : rien ici n'est
 * présenté comme déjà atteint, hormis la mise en ligne de Vitae.
 */
const OBJECTIVES = [
  {
    horizon: 'Aujourd’hui',
    title: 'Vitae en ligne.',
    body: 'Le CV et les offres d’emploi, depuis le téléphone.',
    done: true,
  },
  {
    horizon: 'Prochains mois',
    title: 'Faire la preuve de l’usage.',
    body: 'Mesurer ce qui compte : combien de CV sont menés jusqu’au téléchargement, et combien aident à décrocher un entretien.',
    done: false,
  },
  {
    horizon: 'Ensuite',
    title: 'Le deuxième problème.',
    body: 'Le même travail sur un autre problème du quotidien, annoncé quand il est prêt.',
    done: false,
  },
];

const DATAREPORTAL = {
  name: 'DataReportal',
  url: 'https://datareportal.com/reports/digital-2026-cote-divoire',
};

/**
 * « Pourquoi maintenant » : quatre chiffres, chacun avec sa source en lien
 * (brief v2). Un chiffre sans lien ne doit plus entrer ici. Les espaces des
 * nombres sont insécables : « 142 863 » ne se coupe pas en fin de ligne.
 */
const MARKET = [
  {
    figure: '13,4 M',
    label: 'internautes en Côte d’Ivoire (octobre 2025)',
    source: DATAREPORTAL,
  },
  {
    figure: '8,4 M',
    label: 'utilisateurs actifs des réseaux sociaux',
    source: DATAREPORTAL,
  },
  {
    figure: '142 863',
    label: 'candidats aux concours de la fonction publique en 2025',
    source: {
      name: 'Afrique-sur7',
      url: 'https://www.afrique-sur7.fr/fonction-publique-48-353-admis-en-cote-divoire-en-2025',
    },
  },
  {
    figure: '64 081',
    label: 'étudiants inscrits à l’Université Félix Houphouët-Boigny',
    source: {
      name: 'AIP via Abidjan.net',
      url: 'https://news.abidjan.net/articles/467032/pres-de-90-561-etudiants-inscrits-dans-les-universites-publiques',
    },
  },
];

export default function HomePage() {
  return (
    <>
      {/* Barre de lecture : pur CSS (`animation-timeline: scroll()`),
          masquée là où la propriété n'existe pas plutôt que figée à zéro. */}
      <div className="labs-scroll-progress" aria-hidden />

      <header className="labs-nav" id="labs-nav">
        {/* Logo sticker en SVG : 3,5 Ko gzip, aucune police à charger, et
            `priority` parce qu'il est dans le premier écran. Next ne
            réencode pas les SVG ; `unoptimized` le dit explicitement. */}
        <a href="#top" className="labs-nav__logo">
          <Image
            src="/logo-ligne.svg"
            alt="The Everyday Co."
            width={1044}
            height={181}
            priority
            unoptimized
          />
        </a>
        <ul className="labs-nav__links">
          {NAV.map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
        <div className="labs-nav__ctas">
          <a
            href={VITAE_LINK}
            className="gl-btn gl-btn--small is-liquid"
            style={{ ['--liquid-fill' as string]: 'var(--color-vitae)' }}
          >
            <span>Ouvrir Vitae</span>
          </a>
        </div>
      </header>

      <main id="top">
        <LabsHero
          place="Abidjan, Côte d’Ivoire"
          lead="Les bons outils."
          headline="Enfin faits pour ici."
          slides={HERO_SLIDES}
          secondary={{ label: 'Le problème', href: '#probleme' }}
          scrollTo="#probleme"
        />

        {/* Manifeste : la promesse de marque, seule sur sa bande. */}
        <section className="labs-manifesto">
          <div className="labs-manifesto__inner labs-reveal">
            <p className="labs-manifesto__text">
              Nos parents ont géré leur travail dans des cahiers, faute de
              mieux. Nous construisons les outils qu’ils n’ont jamais eus —
              pour le téléphone qu’on a déjà dans la poche.
            </p>
            <p className="labs-manifesto__claim">Un problème. Une app. Réglé.</p>
          </div>
        </section>

        {/* Le problème. Un seul est traité aujourd'hui ; les deux suivants
            sont présentés comme des pistes à l'étude, sans app promise. */}
        <section id="probleme" className="labs-section">
          <div className="labs-section-head labs-reveal">
            <p className="labs-eyebrow">Le problème</p>
            <h2 className="labs-h2 labs-h2--max">
              Ce n’est pas que les gens manquent d’ambition. C’est qu’ils
              travaillent sans outils.
            </h2>
          </div>

          <ul className="labs-problem-grid">
            <li className="labs-problem labs-reveal">
              <span className="labs-problem__num" aria-hidden>01</span>
              <h3>{ACTIVE_PROBLEM.title}</h3>
              <p>{ACTIVE_PROBLEM.body}</p>
            </li>
          </ul>

          <p className="labs-eyebrow site-subhead labs-reveal">Ce qu’on étudie ensuite</p>

          <ul className="labs-problem-grid">
            {STUDIED_PROBLEMS.map((problem, i) => (
              <li
                key={problem.title}
                className="labs-problem labs-reveal"
                style={{ ['--i' as string]: i }}
              >
                <span className="labs-problem__num" aria-hidden>
                  {String(i + 2).padStart(2, '0')}
                </span>
                <h3>{problem.title}</h3>
                <p>{problem.body}</p>
              </li>
            ))}
          </ul>

          <p className="labs-note labs-reveal">
            Les logiciels qui règlent ces problèmes existent — ailleurs. Ils
            coûtent en euros, s’apprennent en formation et supposent une
            connexion stable. Aucune de ces trois conditions n’est vraie ici.
          </p>
        </section>

        {/* L'application. Une seule carte : sur grand écran elle prend
            toute la largeur, photo à gauche (voir `.labs-carousel--single`). */}
        <section id="apps" className="labs-carousel-section">
          <div className="labs-section-head labs-reveal">
            <p className="labs-eyebrow">Nos applications</p>
            <h2 className="labs-h2">Une app en ligne. Les suivantes quand elles seront prêtes.</h2>
            <p className="labs-sub">
              Chaque application règle un seul problème, complètement. La
              première s’attaque à l’emploi.
            </p>
          </div>

          <div className="labs-carousel labs-carousel--single labs-reveal">
            <ul className="labs-carousel__track">
              <li id={VITAE_CARD.id} className="labs-card-slot">
                <a
                  href={VITAE_CARD.href}
                  className="labs-card"
                  style={{
                    ['--accent' as string]: VITAE_CARD.accent,
                    ['--accent-ink' as string]: VITAE_CARD.accentInk,
                  }}
                >
                  <div className="labs-card__media">
                    {/* Sous la ligne de flottaison : chargée en différé. */}
                    <Image
                      src={VITAE_CARD.thumbnail}
                      alt={VITAE_CARD.alt}
                      fill
                      sizes="(min-width: 1024px) 40rem, (min-width: 768px) 90vw, 100vw"
                      className="labs-card__img"
                      loading="lazy"
                    />
                    {/* Dégradé du bas : le nom de l'app est posé sur la
                        photo, il lui faut le même socle sombre que le hero */}
                    <span aria-hidden className="labs-card__scrim" />
                    <span className="labs-card__badge">
                      <span className="labs-card__badge-dot" aria-hidden />
                      {VITAE_CARD.status}
                    </span>
                    <div className="labs-card__overlay">
                      <p className="labs-card__tag">{VITAE_CARD.tag}</p>
                      <h3 className="labs-card__name">{VITAE_CARD.name}</h3>
                    </div>
                    <span aria-hidden className="labs-card__accent-bar" />
                  </div>
                  <div className="labs-card__body">
                    <p className="labs-card__pitch">{VITAE_CARD.pitch}</p>
                    <p className="labs-card__desc">{VITAE_CARD.desc}</p>
                    <ul className="labs-card__features">
                      {VITAE_CARD.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <span className="labs-card__cta">
                      {VITAE_CARD.cta}
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M3 8h10M9 4l4 4-4 4" />
                      </svg>
                    </span>
                  </div>
                </a>
              </li>
            </ul>
          </div>
        </section>

        {/* Vision et mission — deux phrases à citer de mémoire */}
        <section id="vision" className="labs-section">
          <div className="labs-section-head labs-reveal">
            <p className="labs-eyebrow">Notre vision</p>
            <h2 className="labs-h2">
              Que chacun ici travaille avec des outils aussi bons que ceux
              d’une grande entreprise — depuis un téléphone, et gratuitement
              pour commencer.
            </h2>
          </div>

          <ul className="labs-principles">
            {PRINCIPLES.map((principle, i) => (
              <li key={principle.title} className="labs-reveal" style={{ ['--i' as string]: i }}>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </li>
            ))}
          </ul>

          <div className="labs-mission labs-reveal">
            <p className="labs-eyebrow">Notre mission</p>
            <p className="labs-mission__text">
              Sortir une application à la fois, qui règle complètement un
              problème du quotidien et qui marche sur le téléphone que les
              gens ont déjà.
            </p>
          </div>
        </section>

        {/* « Et après ? » — les objectifs, section que lit un investisseur.
            `#objectifs` reste en ancre secondaire pour les liens déjà
            partagés vers l'ancienne page. */}
        <section id="apres" className="labs-after">
          <div className="labs-after__inner">
            <span id="objectifs" className="labs-anchor" aria-hidden />
            <p className="labs-eyebrow">La suite</p>
            <h2 className="labs-after__title">Et après ?</h2>
            <p className="labs-after__desc">
              Chaque application sort quand elle est prête — annoncée une fois,
              jamais avant. Une chose à la fois, dans cet ordre.
            </p>

            <ol className="labs-timeline">
              {OBJECTIVES.map((objective, i) => (
                <li
                  key={objective.title}
                  className={`labs-timeline__item labs-reveal ${objective.done ? 'is-done' : ''}`}
                  style={{ ['--i' as string]: i }}
                >
                  <span
                    className={`labs-timeline__dot ${objective.done ? 'is-done' : ''}`}
                    aria-hidden
                  />
                  <p className="labs-timeline__horizon">
                    {objective.horizon}{objective.done ? ' · fait' : null}
                  </p>
                  <h3 className="labs-timeline__title">{objective.title}</h3>
                  <p className="labs-timeline__body">{objective.body}</p>
                </li>
              ))}
            </ol>

            {/* La seule inscription que propose le site : une annonce par
                app, sur la chaîne WhatsApp. Absente tant que l'adresse de la
                chaîne n'est pas configurée. */}
            {WHATSAPP_CHANNEL_URL === null ? null : (
              <div className="site-follow labs-reveal">
                <a
                  href={WHATSAPP_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="whatsapp_follow"
                  className="gl-btn is-liquid"
                  style={{ ['--liquid-fill' as string]: 'var(--color-vitae)' }}
                >
                  <span>Suivre sur WhatsApp</span>
                </a>
                <p className="site-follow__note">
                  Une annonce quand une nouvelle app sort. Rien d’autre.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Marché — la lecture investisseur. Chaque chiffre renvoie à sa
            source : un lecteur doit pouvoir le vérifier en un clic. */}
        <section id="marche" className="labs-section">
          <div className="labs-section-head labs-reveal">
            <p className="labs-eyebrow">Pourquoi maintenant</p>
            <h2 className="labs-h2">Un continent sous-outillé. Un marché immense.</h2>
          </div>

          <ul className="labs-stats">
            {MARKET.map((stat, i) => (
              <li key={stat.figure} className="labs-reveal" style={{ ['--i' as string]: i }}>
                <p className="labs-stat__figure">{stat.figure}</p>
                <p className="labs-stat__label">{stat.label}</p>
                <a
                  className="site-stat__source"
                  href={stat.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Source : {stat.source.name}
                </a>
              </li>
            ))}
          </ul>

          {/* Le modèle économique, dit franchement : un partenaire le
              cherche, et un utilisateur a le droit de savoir ce qui est
              gratuit et ce qui ne le sera pas. */}
          <div className="labs-note labs-reveal">
            <h3>Comment ça se finance</h3>
            <p>
              Le premier CV est gratuit, pour toujours. Plus tard, deux options
              payantes, à prix affiché et sans abonnement caché : des versions
              supplémentaires du CV, ciblées sur une offre, et un pass de
              candidature de 30 jours. Les écoles pourront aussi équiper leurs
              promotions.
            </p>
          </div>
        </section>

        {/* Écoles et partenaires — le public premier de la vitrine depuis
            le brief v2. Le bouton n'existe que si une boîte sur le domaine
            est configurée : jamais d'adresse personnelle. */}
        <section id="ecoles" className="labs-section">
          <div className="labs-section-head labs-reveal">
            <p className="labs-eyebrow">Écoles et partenaires</p>
            <h2 className="labs-h2">Des promotions dont les CV sont prêts le jour du forum.</h2>
            <p className="labs-sub">
              Nous animons des ateliers CV dans les écoles d’Abidjan : en deux
              heures, chaque étudiant repart avec un CV propre, fait sur son
              téléphone. Votre école, votre association ou votre programme
              d’insertion veut en organiser un ?
            </p>
            {CONTACT_EMAIL === null ? null : (
              <div>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(WORKSHOP_SUBJECT)}`}
                  data-track="school_contact"
                  className="gl-btn is-liquid site-btn-ink"
                  style={{ ['--liquid-fill' as string]: 'var(--color-vitae)' }}
                >
                  <span>Organiser un atelier</span>
                </a>
              </div>
            )}
          </div>
        </section>

        {/* L'équipe. `#fondatrice` reste en ancre secondaire pour les liens
            déjà partagés. Seul le nom de la fondatrice apparaît. */}
        <section id="equipe" className="labs-section">
          <span id="fondatrice" className="labs-anchor" aria-hidden />
          <div className="labs-section-head labs-reveal">
            <p className="labs-eyebrow">Qui construit</p>
            <h2 className="labs-h2">Une petite équipe à Abidjan, menée par sa fondatrice.</h2>
          </div>

          <div className="labs-founder labs-reveal">
            {FOUNDER.photo === '' ? null : (
              // Cadrage sur le visage, en CSS, sans toucher au fichier :
              // l'image est agrandie à 400 % du cadre et décalée pour amener
              // le visage au centre — voir `.labs-founder__img`.
              <div className="labs-founder__photo">
                <Image
                  src={FOUNDER.photo}
                  alt={FOUNDER.name}
                  width={960}
                  height={1280}
                  // 704 px et non 176 : l'image est rendue à 400 % du cadre.
                  sizes="704px"
                  className="labs-founder__img"
                />
              </div>
            )}
            <div className="labs-founder__info">
              <h3>{FOUNDER.name}</h3>
              <p className="labs-founder__role">
                {FOUNDER.role} · {FOUNDER.location}
              </p>
              {FOUNDER.bio === '' ? null : (
                <p className="labs-founder__bio">{FOUNDER.bio}</p>
              )}
              <div className="labs-founder__links">
                <a
                  href={FOUNDER.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gl-btn gl-btn--small is-liquid"
                  style={{ ['--liquid-fill' as string]: 'var(--color-text)' }}
                >
                  <span>Profil LinkedIn</span>
                </a>
                {CONTACT_EMAIL === null ? null : (
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="gl-btn gl-btn--small is-liquid"
                    style={{ ['--liquid-fill' as string]: 'var(--color-text)' }}
                  >
                    <span>Nous écrire</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Appel à l'action final : Vitae seule. */}
        <section className="labs-section labs-section--final">
          <div className="labs-final-grid">
            <a
              href={VITAE_LINK}
              className="labs-final-card labs-reveal"
              style={{
                background: 'var(--color-vitae)',
                ['--on-accent' as string]: 'var(--color-dark)',
              }}
            >
              <p className="labs-final-card__eyebrow">Emploi</p>
              <h3>Votre prochain emploi commence par un CV qu’on peut lire.</h3>
              <p className="labs-final-card__body">
                Vitae est en ligne, et le premier CV est gratuit.
              </p>
              <span className="labs-final-card__cta">Ouvrir Vitae →</span>
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />

      <LabsPageScript />
    </>
  );
}
