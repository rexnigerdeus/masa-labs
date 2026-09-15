'use client';

/**
 * Hero plein écran de la proposition — façon labs.google.
 *
 * Repris de labs.google :
 *  - plein cadre, hauteur écran, voile dégradé bas pour la lisibilité ;
 *  - très grand titre en bas à gauche, sous-titre court, boutons pilules ;
 *  - barres de progression cliquables qui font tourner les « expériences »
 *    vedettes (auto-défilement, reprise au clic).
 *
 * Le fond change avec l’app vedette et illustre son usage réel (Pexels,
 * libre d’usage) plutôt qu’un décor générique : bureau/ordinateur pour
 * Vitae (CV, candidature), matériel audiovisuel pour Hive (caméras, son,
 * accessoires) — recouvert d’un voile sombre teinté par l’app. labs.google,
 * lui, sert des vidéos de plusieurs Mo ; ici, deux JPEG de ~60-450 Ko.
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

export function LabsHero({ vitaeUrl, hiveUrl }: { vitaeUrl: string; hiveUrl: string }) {
  const urls = [vitaeUrl, hiveUrl];
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);

  const goTo = useCallback((i: number) => {
    setIndex(((i % HERO_SLIDES.length) + HERO_SLIDES.length) % HERO_SLIDES.length);
    startRef.current = null;
    setProgress(0);
  }, []);

  useEffect(() => {
    let raf = 0;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const p = Math.min((now - startRef.current) / SLIDE_DURATION_MS, 1);
      setProgress(p);
      if (p >= 1) {
        setIndex((i) => (i + 1) % HERO_SLIDES.length);
        startRef.current = null;
      } else {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index]);

  const slide = HERO_SLIDES[index] ?? HERO_SLIDES[0];
  if (slide === undefined) return null;
  const slideUrl = urls[index] ?? urls[0] ?? '#';

  return (
    <section className="labs-hero">
      {/* Fonds plein cadre, un par app, fondu enchaîné */}
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.title}
          aria-hidden
          className={`labs-hero__backdrop ${s.backdrop} ${i === index ? 'is-visible' : ''}`}
        >
          {/* Photo plein cadre d'Abidjan. Les deux en eager : la deuxième
              devient visible par simple bascule d'opacité, sans re-layout,
              et doit donc être déjà en cache quand l'onglet Hive s'ouvre. */}
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

      {/* Voile dégradé bas — lisibilité du texte, comme labs.google */}
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
        <p className="labs-eyebrow labs-hero__eyebrow">Abidjan, Côte d’Ivoire</p>

        <div className="labs-hero__title-group">
          <h1 className="labs-hero__title">
            Les bons outils.
            <br />
            <span className="labs-hero__title-accent" style={{ color: slide.accent }}>
              Enfin faits pour ici.
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
        </div>

        {/* Barres de progression cliquables — reprises du featured hero */}
        <div className="labs-hero__progress" role="tablist" aria-label="Nos applications">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={s.title}
              className={`labs-progress-bar ${i === index ? 'is-active' : ''}`}
              onClick={() => goTo(i)}
            >
              <span
                className="labs-progress-bar__fill"
                style={i === index ? { transform: `scaleX(${progress})` } : undefined}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}