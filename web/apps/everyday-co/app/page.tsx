import Image from 'next/image';
import { CONTACT_EMAIL, HIVE_URL, VITAE_URL } from '../lib/config';
import { FOUNDER } from '../lib/founder';
import { LabsHero } from '../components/LabsHero';

/**
 * Page d'accueil de The Everyday Co.
 *
 * ── Présentation ──────────────────────────────────────────────────────
 * Le langage visuel est emprunté à labs.google — d'où le préfixe `labs-`
 * des classes dans `globals.css`, qui nomme ce langage et non un
 * brouillon :
 *  1. hero plein cadre, voiles dégradés, très grand titre en bas à gauche,
 *     pastille « lieu », boutons pilules et barres de progression
 *     cliquables qui font défiler les applications vedettes ;
 *  2. des cartes produit visuelles (photo + nom posé dessus + description
 *     + lien), défilement par à-coups sur téléphone, grille sur écran
 *     large ;
 *  3. un rythme éditorial : une grande section par idée, titres énormes,
 *     respirations généreuses, boutons « liquides ».
 *
 * ── Ce qui ne change pas ──────────────────────────────────────────────
 * Le rythme de fond reste celui du brief §8 (themobilefirstcompany.com) :
 * constat, promesse, action, produit — puis l'argumentaire long.
 *
 * Le texte tient deux lectures à la fois. Un jeune diplômé cherche « à
 * quoi ça me sert, maintenant » : il trouve des phrases courtes, des
 * scènes concrètes et un bouton. Un investisseur cherche le problème, la
 * taille du marché, la stratégie et le modèle : il trouve les sections
 * Vision, Et après ? et Pourquoi maintenant. Aucune des deux lectures ne
 * dilue l'autre, parce qu'elles ne se disputent pas les mêmes blocs.
 *
 * Ce qui n'y figure pas est volontaire : pas de preuve sociale chiffrée,
 * pas de levée de fonds, pas de client cité. Le site de référence en
 * affiche ; nous n'en avons pas, et on ne les fabrique pas. La seule
 * preuve avancée — « En ligne » sur chaque carte — se vérifie en un clic.
 *
 * ── Budget ────────────────────────────────────────────────────────────
 * Réseau lent, téléphone d'entrée de gamme : tout ce qui pouvait être
 * fait en CSS l'est (révélations, parallaxe, barre de lecture, boutons
 * liquides) ; `motion` n'est chargé, à la demande, que par le hero.
 */

const NAV = [
  { href: '#probleme', label: 'Le problème' },
  { href: '#apps', label: 'Nos apps' },
  { href: '#vision', label: 'Vision' },
  { href: '#apres', label: 'Et après ?' },
  { href: '#fondatrice', label: 'Fondatrice' },
];

/** Scènes concrètes plutôt qu'un paragraphe d'analyse. */
const PROBLEMS = [
  {
    title: 'Le CV qui ne passe pas',
    body: 'Un diplômé envoie trente candidatures, n’obtient aucune réponse, et ne saura jamais que son CV a été écarté par un logiciel avant d’être lu.',
  },
  {
    title: 'La caisse dans un cahier',
    body: 'Une couturière connaît son chiffre du jour, mais pas sa marge du mois. Les logiciels de gestion coûtent plus cher que son bénéfice.',
  },
  {
    title: 'La tontine sur WhatsApp',
    body: 'Huit personnes, une cagnotte, aucune trace commune. La confiance tient jusqu’au premier désaccord sur qui a payé quoi.',
  },
  {
    title: 'La caméra qui dort',
    body: 'Un vidéaste possède un boîtier à deux millions qui sert huit jours par mois. À côté, un autre refuse un mariage faute de matériel.',
  },
];

/** Cartes des applications.
 *
 *  La vignette est une photo de la personne à qui l'application sert — un
 *  jeune diplômé devant son ordinateur, un vidéaste en tournage — et non
 *  une capture d'écran de l'app. Deux raisons : réduite à la taille d'une
 *  carte, une capture n'est plus lisible, on y devine une page web sans
 *  distinguer laquelle ; et les personnes montrées sont celles qui se
 *  servent de ces outils ici, ce que des captures ne disent pas.
 *
 *  `id` reprend les ancres de l'ancienne page (#vitae, #hive) : les liens
 *  déjà partagés continuent d'atterrir au bon endroit. */
const APP_CARDS = [
  {
    id: 'vitae',
    name: 'Vitae',
    tag: 'Emploi',
    status: 'En ligne',
    pitch: 'Le CV qui passe les filtres.',
    desc: 'La plupart des candidatures sont écartées par un logiciel de tri avant qu’un humain ne les lise. Vitae guide la rédaction section par section, note le CV en direct, et produit un PDF que ces logiciels savent relire.',
    features: [
      'Modèles vérifiés lisibles par les logiciels de tri (ATS)',
      'Score et conseils de correction en direct, section par section',
      'Offres de stage et d’emploi en Côte d’Ivoire, mises à jour chaque jour',
      'Téléchargement PDF gratuit, sans filigrane',
    ],
    href: VITAE_URL,
    cta: 'Ouvrir Vitae',
    accent: 'var(--color-vitae)',
    // Le vert vif ne passe pas en texte sur blanc : l'encre prend le relais.
    accentInk: 'var(--color-vitae-ink)',
    thumbnail: '/thumbnail-vitae.jpg',
    alt: 'Un jeune homme souriant devant son ordinateur portable, dans un espace de travail partagé',
  },
  {
    id: 'hive',
    name: 'Hive',
    tag: 'Événementiel',
    status: 'En ligne',
    pitch: 'Le Vinted de l’audiovisuel.',
    desc: 'Une caméra à deux millions sert huit jours par mois. À côté, un vidéaste refuse un mariage faute de matériel. Hive met les deux en relation, à la journée, dans la même commune.',
    features: [
      'Location et vente, entre particuliers comme avec des professionnels',
      'Recherche par commune, catégorie et budget — Cocody, Marcory, Yopougon…',
      'Demande de réservation avec dates, confirmée par le loueur',
      'Paiement en main propre à la remise, aucune commission au lancement',
    ],
    href: HIVE_URL,
    cta: 'Ouvrir Hive',
    accent: 'var(--color-hive)',
    // Déjà à 7,6:1 sur blanc : le rouge de Hive est sa propre encre.
    accentInk: 'var(--color-hive)',
    thumbnail: '/thumbnail-hive.jpg',
    alt: 'Un jeune vidéaste filmant en extérieur, caméra montée sur stabilisateur',
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
 * présenté comme déjà atteint, hormis la mise en ligne des deux apps.
 */
const OBJECTIVES = [
  {
    horizon: 'Aujourd’hui',
    title: 'Deux applications en ligne, gratuites',
    body: 'Vitae pour le CV et l’emploi, Hive pour la location de matériel audiovisuel. Fait — ce sont les produits que vous pouvez ouvrir maintenant.',
    done: true,
  },
  {
    horizon: 'Prochains mois',
    title: 'Faire la preuve de l’usage',
    body: 'Mesurer ce qui compte vraiment : combien de CV sont menés jusqu’au téléchargement, et combien de locations sont réellement conclues entre deux inconnus.',
    done: false,
  },
  {
    horizon: 'Ensuite',
    title: 'Le troisième problème',
    body: 'Le même travail sur un autre problème du quotidien. Une application à la fois, annoncée quand elle est prête — pas avant.',
    done: false,
  },
];

const MARKET = [
  { figure: '15M+', label: 'Internautes connectés en Côte d’Ivoire en 2025' },
  { figure: '89 %', label: 'Des emplois sont informels — sans outil de gestion adapté' },
  { figure: '40K', label: 'Diplômés par an en Côte d’Ivoire cherchant leur voie' },
  { figure: '10M', label: 'Emplois numériques attendus en Afrique d’ici 2030 (Banque mondiale)' },
];

export default function HomePage() {
  return (
    <>
      {/* Barre de lecture : pur CSS (`animation-timeline: scroll()`),
          masquée là où la propriété n'existe pas plutôt que figée à zéro. */}
      <div className="labs-scroll-progress" aria-hidden />

      <header className="labs-nav" id="labs-nav">
        <a href="#top" className="labs-nav__logo">
          The Everyday Co.
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
            href={VITAE_URL}
            className="gl-btn gl-btn--small is-liquid"
            style={{ ['--liquid-fill' as string]: 'var(--color-vitae)' }}
          >
            <span>Vitae</span>
          </a>
          {/* Les deux applications valent la même chose : elles ont le même
              traitement jusque dans la barre de navigation. Hive n'apparaît
              qu'à partir de 380 px, faute de place avant. */}
          <a
            href={HIVE_URL}
            className="gl-btn gl-btn--small gl-btn--wide is-liquid"
            style={{ ['--liquid-fill' as string]: 'var(--color-hive)' }}
          >
            <span>Hive</span>
          </a>
        </div>
      </header>

      <main id="top">
        <LabsHero vitaeUrl={VITAE_URL} hiveUrl={HIVE_URL} />

        {/* Manifeste : la promesse de marque, seule sur sa bande. Le hero
            fait défiler les produits, il ne peut pas porter en plus une
            phrase qui ne change jamais. */}
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

        {/* Le problème. Un jeune s'y reconnaît, un investisseur y lit le
            marché adressable. */}
        <section id="probleme" className="labs-section">
          <div className="labs-section-head labs-reveal">
            <p className="labs-eyebrow">Le problème</p>
            <h2 className="labs-h2 labs-h2--max">
              Ce n’est pas que les gens manquent d’ambition. C’est qu’ils
              travaillent sans outils.
            </h2>
          </div>

          <ul className="labs-problem-grid">
            {PROBLEMS.map((problem, i) => (
              <li
                key={problem.title}
                className="labs-problem labs-reveal"
                style={{ ['--i' as string]: i }}
              >
                <span className="labs-problem__num" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
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

        {/* Les applications — défilement par à-coups sur téléphone, grille
            ensuite. Même gabarit pour les deux : deux produits présentés
            différemment donneraient l'impression que l'un compte moins. */}
        <section id="apps" className="labs-carousel-section">
          <div className="labs-section-head labs-reveal">
            <p className="labs-eyebrow">Nos applications</p>
            <h2 className="labs-h2">Deux applications en ligne. Gratuites.</h2>
            <p className="labs-sub">
              Chaque application règle un seul problème, complètement — comme
              les expérimentations d’un labo, mais pour le quotidien d’ici.
            </p>
          </div>

          {/* La révélation est portée par la piste, pas par chaque carte :
              sur téléphone la seconde carte est hors de l'écran à droite, un
              observateur posé sur elle ne se déclencherait jamais — elle
              resterait invisible et on perdrait l'indice qu'il y en a deux. */}
          <div className="labs-carousel labs-reveal">
            <ul className="labs-carousel__track">
              {APP_CARDS.map((app, i) => (
                <li key={app.name} id={app.id} className="labs-card-slot">
                  <a
                    href={app.href}
                    className="labs-card"
                    style={{
                      ['--i' as string]: i,
                      ['--accent' as string]: app.accent,
                      ['--accent-ink' as string]: app.accentInk,
                    }}
                  >
                    <div className="labs-card__media">
                      <Image
                        src={app.thumbnail}
                        alt={app.alt}
                        fill
                        sizes="(min-width: 768px) 36rem, 86vw"
                        className="labs-card__img"
                        loading="eager"
                      />
                      {/* Dégradé du bas : le nom de l'app est posé sur la
                          photo, il lui faut le même socle sombre que le hero */}
                      <span aria-hidden className="labs-card__scrim" />
                      <span className="labs-card__badge">
                        <span className="labs-card__badge-dot" aria-hidden />
                        {app.status}
                      </span>
                      <div className="labs-card__overlay">
                        <p className="labs-card__tag">{app.tag}</p>
                        <h3 className="labs-card__name">{app.name}</h3>
                      </div>
                      <span aria-hidden className="labs-card__accent-bar" />
                    </div>
                    <div className="labs-card__body">
                      <p className="labs-card__pitch">{app.pitch}</p>
                      <p className="labs-card__desc">{app.desc}</p>
                      {/* Le détail que cherchent ceux qui hésitent encore :
                          quatre lignes vérifiables, pas des arguments. */}
                      <ul className="labs-card__features">
                        {app.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                      <span className="labs-card__cta">
                        {app.cta}
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M3 8h10M9 4l4 4-4 4" />
                        </svg>
                      </span>
                    </div>
                  </a>
                </li>
              ))}
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
          </div>
        </section>

        {/* Marché — la lecture investisseur */}
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
              </li>
            ))}
          </ul>

          {/* Le modèle économique, dit franchement : un investisseur le
              cherche, et un utilisateur a le droit de savoir ce qui est
              gratuit et pourquoi. */}
          <div className="labs-note labs-reveal">
            <h3>Comment ça se finance</h3>
            <p>
              Tout est gratuit aujourd’hui, y compris le téléchargement du CV :
              à ce stade, ce qui compte est l’usage, pas le revenu. Le modèle
              viendra plus tard des fonctionnalités avancées — jamais de la
              porte d’entrée, et jamais en rendant payant ce qui est gratuit
              aujourd’hui.
            </p>
          </div>
        </section>

        {/* Fondatrice */}
        <section id="fondatrice" className="labs-section">
          <div className="labs-section-head labs-reveal">
            <p className="labs-eyebrow">Qui construit</p>
            <h2 className="labs-h2">Une fondatrice, à Abidjan.</h2>
          </div>

          <div className="labs-founder labs-reveal">
            {FOUNDER.photo === '' ? null : (
              // Cadrage sur le visage, en CSS, sans toucher au fichier.
              //
              // `object-fit: cover` ne suffit pas : sur un portrait 3:4 ramené
              // dans un carré, il ne rogne qu'un quart de la hauteur, et la
              // personne reste minuscule au milieu du décor. L'image est donc
              // agrandie à 400 % du cadre et décalée pour amener le visage au
              // centre — voir `.labs-founder__img`. Les valeurs valent pour
              // cette photo précise : une autre photo en demandera d'autres.
              <div className="labs-founder__photo">
                <Image
                  src={FOUNDER.photo}
                  alt={FOUNDER.name}
                  width={960}
                  height={1280}
                  // 704 px et non 176 : l'image est rendue à 400 % du cadre.
                  // Annoncer la taille du cadre ferait choisir au navigateur
                  // une source trop petite, étirée puis floue.
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
                    <span>La contacter</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Double CTA final */}
        <section className="labs-section labs-section--final">
          <div className="labs-final-grid">
            <a
              href={VITAE_URL}
              className="labs-final-card labs-reveal"
              style={{
                background: 'var(--color-vitae)',
                ['--on-accent' as string]: 'var(--color-dark)',
                ['--i' as string]: 0,
              }}
            >
              <p className="labs-final-card__eyebrow">Emploi</p>
              <h3>Votre prochain emploi commence par un CV qu’on peut lire.</h3>
              <p className="labs-final-card__body">
                Vitae est en ligne et gratuit. Rien à installer, aucun compte à
                créer pour commencer, pas de filigrane sur le PDF.
              </p>
              <span className="labs-final-card__cta">Ouvrir Vitae →</span>
            </a>
            <a
              href={HIVE_URL}
              className="labs-final-card labs-reveal"
              style={{
                background: 'var(--color-hive)',
                ['--on-accent' as string]: '#fff',
                ['--i' as string]: 1,
              }}
            >
              <p className="labs-final-card__eyebrow">Événementiel</p>
              <h3>Votre matériel ne rapporte rien au fond de son sac.</h3>
              <p className="labs-final-card__body">
                Hive est en ligne, sans commission pendant le lancement. Publier
                une annonce prend deux minutes et elle est visible aussitôt.
              </p>
              <span className="labs-final-card__cta">Ouvrir Hive →</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="labs-footer">
        <div className="labs-footer__row">
          <p className="labs-nav__logo">The Everyday Co.</p>
          <ul className="labs-footer__links">
            <li><a href={VITAE_URL}>Vitae</a></li>
            <li><a href={HIVE_URL}>Hive</a></li>
            <li><a href="#vision">Vision</a></li>
            <li>
              <a href={FOUNDER.linkedinUrl} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </li>
            {CONTACT_EMAIL === null ? null : (
              <li><a href={`mailto:${CONTACT_EMAIL}`}>Contact</a></li>
            )}
          </ul>
        </div>
        <p className="labs-footer__copy">
          © {new Date().getFullYear()} The Everyday Co. · Abidjan, Côte d’Ivoire ·
          Bâtisseurs de solutions du quotidien
        </p>
      </footer>

      {/*
        Les trois comportements qui ne tiennent pas en CSS, en un seul script
        sans dépendance (~1 Ko) : révélation au scroll, état de la barre de
        navigation, et point d'origine du remplissage des boutons liquides.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
            var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            /* 1. Révélation au scroll. Sans IntersectionObserver (ou en mode
                  animations réduites), tout est affiché d'emblée. */
            var els = document.querySelectorAll('.labs-reveal');
            if (reduce || !('IntersectionObserver' in window)) {
              for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
            } else {
              var io = new IntersectionObserver(function(entries){
                entries.forEach(function(e){
                  if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
                });
              }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
              els.forEach(function(el){ io.observe(el); });
            }

            /* 2. Navigation : fond opaque dès qu'on quitte le hero, et repli
                  vers le haut quand on descend — l'écran d'un téléphone est
                  trop court pour qu'une barre fixe y reste en permanence. */
            var nav = document.getElementById('labs-nav');
            var last = 0;
            var ticking = false;
            function onScroll(){
              var y = window.scrollY;
              nav.classList.toggle('is-scrolled', y > 24);
              nav.classList.toggle('is-hidden', y > 320 && y > last + 4);
              last = y;
              ticking = false;
            }
            window.addEventListener('scroll', function(){
              if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
            }, { passive: true });
            onScroll();

            /* 3. Boutons liquides : la pastille grossit depuis l'endroit où
                  le curseur est entré, pas depuis le centre. */
            document.addEventListener('pointerenter', function(e){
              var btn = e.target instanceof Element ? e.target.closest('.is-liquid') : null;
              if (btn === null) return;
              var r = btn.getBoundingClientRect();
              btn.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100) + '%');
              btn.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100) + '%');
            }, true);
          })();`,
        }}
      />
    </>
  );
}
