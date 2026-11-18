'use client';

import { motion, useMotionValue, useSpring } from 'motion/react';
import type React from 'react';

/** Courbe d'entrée du hub : départ rapide, arrivée douce. */
export const EASE = [0.2, 0.9, 0.3, 1] as const;

/**
 * Tuile de la grille bento : une `.carte` du hub. Elle monte en fondu
 * quand elle entre à l'écran (une seule fois) et, au survol, s'incline vers
 * la souris (3° au plus) en montant de 3 px — le `.penche` du hub. Rien ne
 * penche au doigt, ni si le système demande moins d'animations.
 */
export function Tile({ className = '', delay = 0, label, children }: {
  className?: string;
  delay?: number;
  /** Nom accessible de la région, quand la tuile n'a pas de titre visible. */
  label?: string;
  children: React.ReactNode;
}) {
  const rx = useSpring(useMotionValue(0), { stiffness: 260, damping: 22 });
  const ry = useSpring(useMotionValue(0), { stiffness: 260, damping: 22 });

  const lean = (e: React.PointerEvent<HTMLElement>): void => {
    if (e.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 6);
    rx.set(-py * 6);
  };
  const reset = (): void => { rx.set(0); ry.set(0); };

  return (
    <motion.section
      aria-label={label}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={lean}
      onPointerLeave={reset}
      className={`carte tuile overflow-hidden ${className}`}
    >
      {children}
    </motion.section>
  );
}

/** Titre et texte de tuile : posés en bas, sous l'illustration animée. */
export function TileText({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-auto flex flex-col gap-1.5 pt-5">
      <h2 className="titre-carte">{title}</h2>
      <p className="text-[15px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}
