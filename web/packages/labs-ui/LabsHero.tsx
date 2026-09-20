'use client';

/**
 * Hero plein cadre du langage `labs-ui` — façon labs.google.
 *
 * Repris de labs.google :
 *  - plein cadre, voiles dégradés pour la lisibilité ;
 *  - très grand titre en bas à gauche, sous-titre court, boutons pilules ;
 *  - barres de progression cliquables qui font tourner les « vedettes »
 *    (auto-défilement, reprise au clic).
 *
 * Ce que chaque produit y met change, la mécanique non : la vitrine fait
 * tourner ses deux applications, Vitae ses trois usages (créer, postuler,
 * progresser), Hive les deux côtés de son marché (chercher, louer). C'est
 * la raison d'être de ce composant partagé — trois pages qui racontent des
 * choses différentes avec le même geste.
 *
 * ── Lisibilité ────────────────────────────────────────────────────────
 * Les photos utilisables sont rarement sombres : un simple voile ne suffit
 * pas, le texte blanc s'y perd. Le traitement est en trois couches, décrit
 * dans `labs.css` — filtre sur la photo, teinte de la slide, dégradés haut
 * et bas.
 *
 * Chaque slide porte trois couleurs et non une seule, parce qu'une teinte
 * ne peut pas tout faire : `accent` remplit, `glow` écrit sur le fond
 * sombre, `on` écrit par-dessus `accent`. Le rouge de Hive vaut 1,01:1 en
 * texte sur le hero — invisible — là où sa version `glow` atteint 4,2:1.
 *
 * ── Animation ─────────────────────────────────────────────────────────
 * Deux règles, dictées par le mobile d'entrée de gamme :
 *  1. la barre de progression est une animation CSS, pas un
 *     `requestAnimationFrame` qui re-rendrait React soixante fois par
 *     seconde. Le composant ne connaît que l'index de la slide ;
 *  2. le défilement automatique s'arrête quand le hero sort de l'écran ou
 *     que l'onglet passe en arrière-plan.
 * L'entrée du titre est en CSS ; seule la parallaxe charge `motion`
 * (motion.dev), à la demande, pour ~6,6 Ko compressés.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface LabsHeroSlide {
  /** Étiquette en haut du hero : « Emploi · En ligne », « Vous cherchez »… */
  eyebrow: string;
  /** Nom court sous la barre de progression. */
  label: string;
  /** Une phrase, sous le titre. */
  subtitle: string;
  /** Intitulé du bouton plein. */
  cta: string;
  href: string;
  photo: string;
  /**
   * Point de la photo à garder au centre quand le cadre la rogne
   * (« 30% 40% »). Le centre géométrique par défaut, qui convient
   * rarement à un portrait recadré en carré sur téléphone.
   */
  focus?: string;
  /**
   * Assombrissement de la photo, 0,55 par défaut. À baisser quand une
   * photo trop lumineuse empêche le titre d'atteindre son contraste.
   */
  dim?: number;
  /**
   * Teinte du voile, en composantes RVB séparées par des espaces
   * (« 20 34 8 ») : la feuille de styles en tire ses trois opacités.
   * Une valeur sombre — c'est un voile, pas un aplat.
   */
  tint: string;
  /** L'aplat : remplissage du bouton, point de la slide. */
  accent: string;
  /** La même couleur, éclaircie, pour écrire sur le fond sombre. */
  glow: string;
  /** La couleur du texte posé SUR `accent`. */
  on: string;
}

export interface LabsHeroProps {
  /** Pastille discrète en haut à gauche : le lieu, le plus souvent. */
  place: string;
  /** Première ligne du titre, toujours en blanc. */
  lead: string;
  /** Seconde ligne, colorée par la slide en cours. */
  headline: string;
  slides: LabsHeroSlide[];
  /** Bouton fantôme à côté de l'appel à l'action. */
  secondary?: { label: string; href: string };
  /** Ancre du chevron de défilement, sur grand écran. */
  scrollTo?: string;
  /**
   * Glissé sous les boutons : Hive y met son champ de recherche, qui est
   * sa vraie porte d'entrée et n'avait pas à être réinventé en bouton.
   */
  children?: React.ReactNode;
}

const SLIDE_DURATION_MS = 7000;

/** Au-delà de ce déplacement horizontal, un glissement change de slide. */
const SWIPE_THRESHOLD_PX = 48;

export function LabsHero({
  place, lead, headline, slides, secondary, scrollTo, children,
}: LabsHeroProps) {
  const [index, setIndex] = useState(0);
  /** Faux dès que le hero quitte l'écran ou que l'onglet passe derrière. */
  const [running, setRunning] = useState(true);
  const heroRef = useRef<HTMLElement | null>(null);
  const photosRef = useRef<HTMLDivElement | null>(null);
  const swipeStartRef = useRef<number | null>(null);

  const count = slides.length;

  const goTo = useCallback((i: number) => {
    setIndex(((i % count) + count) % count);
  }, [count]);

  /* Défilement automatique : un simple minuteur, calé sur la durée de
     l'animation CSS de la barre. Relancé à chaque changement d'index — un
     clic sur une barre redémarre donc le compte à zéro. */
  useEffect(() => {
    if (!running || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [index, running, count]);

  /* Rien ne tourne pour un hero invisible : ni minuteur, ni animation de
     barre. Sur un téléphone d'entrée de gamme, c'est la différence entre un
     défilement fluide et un défilement qui accroche. */
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

  const slide = slides[index] ?? slides[0];
  if (slide === undefined) return null;

  return (
    <section
      ref={heroRef}
      className="labs-hero"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{ ['--hero-duration' as string]: `${SLIDE_DURATION_MS}ms` }}
    >
      {/* Fonds plein cadre, un par slide, fondu enchaîné */}
      <div className="labs-hero__photos" ref={photosRef} aria-hidden>
        {slides.map((s, i) => (
          <div
            key={s.label}
            className={`labs-hero__backdrop ${i === index ? 'is-visible' : ''}`}
            style={{
              ['--slide-tint' as string]: s.tint,
              ...(s.focus === undefined ? {} : { ['--slide-focus' as string]: s.focus }),
              ...(s.dim === undefined ? {} : { ['--slide-dim' as string]: s.dim }),
            }}
          >
            {/* Toutes en eager : une slide devient visible par simple bascule
                d'opacité, sans re-layout, et doit donc être déjà en cache au
                moment où elle s'ouvre. */}
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

      {/* Voiles dégradés : bande sombre en haut, bande plus dense en bas
          sous le titre. Détail du calcul dans labs.css */}
      <div className="labs-hero__veil" aria-hidden />

      {/* Forme organique flottante — les fonds de labs.google, déclinés dans
          la couleur d'attention de la maison */}
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
        {/* Haut : ce qui, sinon, laisse un grand vide entre l'en-tête et le
            titre. Le lieu à gauche, la slide en cours à droite. */}
        <div className="labs-hero__top">
          <p className="labs-eyebrow labs-hero__place">
            <span className="labs-hero__ping" aria-hidden />
            {place}
          </p>
          <p key={`${slide.label}-tag`} className="labs-hero__slide-tag">
            <span className="labs-hero__slide-dot" style={{ background: slide.glow }} aria-hidden />
            {slide.eyebrow}
          </p>
        </div>

        <div className="labs-hero__title-group">
          <h1 className="labs-hero__title">
            {/* Chaque ligne dans son masque : elle monte depuis le bas au
                chargement, comme les titres de labs.google */}
            <span className="labs-hero__line"><span>{lead}</span></span>
            <span className="labs-hero__line">
              <span className="labs-hero__title-accent" style={{ color: slide.glow }}>
                {headline}
              </span>
            </span>
          </h1>

          <p key={slide.label} className="labs-hero__subtitle">{slide.subtitle}</p>

          <div className="labs-hero__actions">
            <a
              key={`${slide.label}-cta`}
              href={slide.href}
              className="gl-btn gl-btn--cta is-liquid"
              style={{
                ['--liquid-fill' as string]: slide.accent,
                ['--liquid-on' as string]: slide.on,
              }}
            >
              <span>{slide.cta}</span>
            </a>
            {secondary === undefined ? null : (
              <a href={secondary.href} className="gl-btn gl-btn--ghost is-liquid">
                <span>{secondary.label}</span>
              </a>
            )}
          </div>

          {children}

          {/* Barres de progression cliquables. Le remplissage est une
              animation CSS relancée par la `key` : changer d'index remonte un
              nouvel élément, donc une nouvelle animation, sans toucher à
              React à chaque image. Une seule slide n'en a pas besoin. */}
          {count < 2 ? null : (
            <div
              className="labs-hero__progress"
              role="tablist"
              aria-label="Diaporama"
              onKeyDown={onKeyDown}
            >
              {slides.map((s, i) => (
                <button
                  key={s.label}
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
                  <span className="labs-progress-bar__label">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invitation à descendre — seulement là où le hero fait un plein écran */}
      {scrollTo === undefined ? null : (
        <a href={scrollTo} className="labs-hero__scroll" aria-label="Descendre">
          <span aria-hidden />
        </a>
      )}
    </section>
  );
}
