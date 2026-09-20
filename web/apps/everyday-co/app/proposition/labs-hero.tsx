'use client';

/**
 * Hero plein écran de la proposition — façon labs.google.
 *
 * Repris de labs.google :
 *  - plein cadre, hauteur écran, voile dégradé pour la lisibilité ;
 *  - très grand titre en bas à gauche, sous-titre court, boutons pilules ;
 *  - barres de progression cliquables qui font tourner les « expériences »
 *    vedettes (auto-défilement, reprise au clic).
 *
 * Le fond change avec l’app vedette et illustre son usage réel (Pexels,
 * libre d’usage) plutôt qu’un décor générique : bureau/ordinateur pour
 * Vitae (CV, candidature), matériel audiovisuel pour Hive (caméras, son,
 * accessoires). labs.google, lui, sert des vidéos de plusieurs Mo ; ici,
 * deux JPEG de ~60-450 Ko.
 *
 * ── Lisibilité ────────────────────────────────────────────────────────
 * Les deux photos sont claires (mur blanc, papier kraft) : un simple voile
 * translucide ne suffisait pas, le texte blanc s'y perdait. Le traitement
 * est donc en trois couches, toutes décrites dans `globals.css` — filtre
 * sur la photo, teinte produit, dégradés haut et bas. Le rapport de
 * contraste du sous-titre passe ainsi d'environ 2:1 à plus de 10:1.
 *
 * ── Mobile ────────────────────────────────────────────────────────────
 * Sur téléphone le hero est plafonné à 40rem au lieu d'un plein écran :
 * à 100svh, le texte collé en bas laissait un vide de plusieurs centaines
 * de pixels sous la barre de navigation. La hauteur plafonnée et la
 * pastille de lieu remontée en haut occupent cet espace.
 *
 * ── Animation ─────────────────────────────────────────────────────────
 * Deux règles ont guidé les choix, dictées par le mobile d'entrée de gamme :
 *  1. La barre de progression est une animation CSS (`labs-fill`), pas un
 *     `requestAnimationFrame` qui re-rendrait React soixante fois par
 *     seconde. Le composant ne connaît que l'index de la slide.
 *  2. Le défilement automatique s'arrête quand le hero sort de l'écran ou
 *     que l'onglet passe en arrière-plan — inutile de faire tourner un
 *     minuteur et une animation pour personne.
 * L'entrée du titre et la parallaxe de la photo passent par `motion`
 * (motion.dev), en import `mini` : des animations WAAPI que le navigateur
 * exécute hors du fil principal, pour ~3 Ko une fois compressées.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const HERO_SLIDES = [
  {
    eyebrow: 'Emploi · En ligne',
    title: 'Vitae',
    subtitle: 'Le CV qui passe les filtres. Gratuit, sans filigrane.',
    cta: 'Essayer Vitae',
    accent: 'var(--color-vitae)',
    backdrop: 'labs-hero__backdrop--vitae',
    photo: '/hero-vitae.jpg',
  },
  {
    eyebrow: 'Événementiel · En ligne',
    title: 'Hive',
    subtitle: 'Le matériel qui dort chez l’un tourne chez l’autre.',
    cta: 'Découvrir Hive',
    accent: 'var(--color-hive)',
    backdrop: 'labs-hero__backdrop--hive',
    photo: '/hero-hive.jpg',
  },
];

const SLIDE_DURATION_MS = 7000;

/** Au-delà de ce déplacement horizontal, un glissement change de slide. */
const SWIPE_THRESHOLD_PX = 48;

export function LabsHero({ vitaeUrl, hiveUrl }: { vitaeUrl: string; hiveUrl: string }) {
  const urls = [vitaeUrl, hiveUrl];
  const [index, setIndex] = useState(0);
  /** Faux dès que le hero quitte l'écran ou que l'onglet passe derrière. */
  const [running, setRunning] = useState(true);
  const heroRef = useRef<HTMLElement | null>(null);
  const photosRef = useRef<HTMLDivElement | null>(null);
  const swipeStartRef = useRef<number | null>(null);

  const goTo = useCallback((i: number) => {
    setIndex(((i % HERO_SLIDES.length) + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  /* Défilement automatique : un simple minuteur, calé sur la durée de
     l'animation CSS de la barre. Relancé à chaque changement d'index —
     un clic sur une barre redémarre donc le compte à zéro. */
  useEffect(() => {
    if (!running) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, SLIDE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [index, running]);

  /* Rien ne tourne pour un hero invisible : ni minuteur, ni animation de
     barre. Sur un téléphone d'entrée de gamme, c'est la différence entre
     un scroll fluide et un scroll qui accroche. */
  useEffect(() => {
    const hero = heroRef.current;
    if (hero === null) return;

    const onVisibility = () => setRunning(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    if (!('IntersectionObserver' in window)) {
      return () => document.removeEventListener('visibilitychange', onVisibility);
    }
    const io = new IntersectionObserver(
      ([entry]) => setRunning(entry !== undefined && entry.isIntersecting && !document.hidden),
      { threshold: 0.15 },
    );
    io.observe(hero);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  /* Parallaxe : la photo remonte plus lentement que la page. Chargée à la
     demande pour ne pas peser sur le premier rendu, et ignorée si
     l'utilisateur a demandé moins d'animations. */
  useEffect(() => {
    const hero = heroRef.current;
    const photos = photosRef.current;
    if (hero === null || photos === null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let stop: (() => void) | undefined;

    void Promise.all([import('motion/mini'), import('motion')]).then(
      ([{ animate }, { scroll }]) => {
        if (cancelled) return;
        stop = scroll(
          animate(
            photos,
            { transform: ['translateY(-4%) scale(1.14)', 'translateY(4%) scale(1.14)'] },
            { ease: 'linear' },
          ),
          { target: hero, offset: ['start start', 'end start'] },
        );
      },
    );

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  /* Glissement horizontal : sur téléphone, les barres de 3 px de haut sont
     une cible difficile ; le pouce, lui, balaie naturellement. */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    swipeStartRef.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (start === null) return;
    const delta = e.clientX - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goTo(index + (delta < 0 ? 1 : -1));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
  };

  const slide = HERO_SLIDES[index] ?? HERO_SLIDES[0];
  if (slide === undefined) return null;
  const slideUrl = urls[index] ?? urls[0] ?? '#';

  return (
    <section
      ref={heroRef}
      className="labs-hero"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{ ['--hero-duration' as string]: `${SLIDE_DURATION_MS}ms` }}
    >
      {/* Fonds plein cadre, un par app, fondu enchaîné */}
      <div className="labs-hero__photos" ref={photosRef} aria-hidden>
        {HERO_SLIDES.map((s, i) => (
          <div
            key={s.title}
            className={`labs-hero__backdrop ${s.backdrop} ${i === index ? 'is-visible' : ''}`}
          >
            {/* Les deux en eager : la deuxième devient visible par simple
                bascule d'opacité, sans re-layout, et doit donc être déjà en
                cache quand l'onglet Hive s'ouvre. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.photo}
              alt=""
              className="labs-hero__photo"
              loading="eager"
              fetchPriority={i === 0 ? 'high' : 'low'}
            />
          </div>
        ))}
      </div>

      {/* Voiles dégradés : bande sombre en haut sous la navigation, bande
          plus dense en bas sous le titre. Détail du calcul dans globals.css */}
      <div className="labs-hero__veil" aria-hidden />

      {/* Blob organique flottant — les formes d'arrière-plan de labs.google,
          décliné dans notre jaune signature */}
      <div className="labs-hero__blob" aria-hidden>
        <svg viewBox="0 0 200 200" fill="none">
          <path
            className="labs-blob-shape"
            d="M63 15c28-7 61 2 78 25s14 55-3 76-49 27-75 18-46-38-49-66 21-46 49-53Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="labs-hero__content">
        {/* Haut : ce qui comblait mal l'espace entre la nav et le titre.
            Le lieu à gauche, l'app vedette à droite — la slide s'annonce
            avant même qu'on lise le titre. */}
        <div className="labs-hero__top">
          <p className="labs-eyebrow labs-hero__place">
            <span className="labs-hero__ping" aria-hidden />
            Abidjan, Côte d’Ivoire
          </p>
          <p key={`${slide.title}-tag`} className="labs-hero__slide-tag">
            <span className="labs-hero__slide-dot" style={{ background: slide.accent }} aria-hidden />
            {slide.eyebrow}
          </p>
        </div>

        <div className="labs-hero__title-group">
          <h1 className="labs-hero__title">
            {/* Chaque ligne dans son masque : elle monte depuis le bas au
                chargement, comme les titres de labs.google */}
            <span className="labs-hero__line"><span>Les bons outils.</span></span>
            <span className="labs-hero__line">
              <span className="labs-hero__title-accent" style={{ color: slide.accent }}>
                Enfin faits pour ici.
              </span>
            </span>
          </h1>

          <p key={slide.title} className="labs-hero__subtitle">
            {slide.subtitle}
          </p>

          <div className="labs-hero__actions">
            <a
              key={`${slide.title}-cta`}
              href={slideUrl}
              className="gl-btn gl-btn--cta is-liquid"
              style={{ ['--liquid-fill' as string]: slide.accent }}
            >
              <span>{slide.cta}</span>
            </a>
            <a href="#probleme" className="gl-btn gl-btn--ghost is-liquid">
              <span>Le problème</span>
            </a>
          </div>

          {/* Barres de progression cliquables — reprises du featured hero.
              Le remplissage est une animation CSS relancée par la `key` :
              changer d'index remonte un nouvel élément, donc une nouvelle
              animation, sans toucher à React à chaque image. */}
          <div
            className="labs-hero__progress"
            role="tablist"
            aria-label="Nos applications"
            onKeyDown={onKeyDown}
          >
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                role="tab"
                aria-selected={i === index}
                tabIndex={i === index ? 0 : -1}
                className={`labs-progress-bar ${i === index ? 'is-active' : ''}`}
                onClick={() => goTo(i)}
              >
                <span className="labs-progress-bar__track" aria-hidden>
                  <span
                    key={`${i}-${index}-${running}`}
                    className="labs-progress-bar__fill"
                    style={running ? undefined : { animationPlayState: 'paused' }}
                  />
                </span>
                <span className="labs-progress-bar__label">{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invitation à descendre — seulement là où le hero fait un plein écran */}
      <a href="#probleme" className="labs-hero__scroll" aria-label="Aller au problème">
        <span aria-hidden />
      </a>
    </section>
  );
}
