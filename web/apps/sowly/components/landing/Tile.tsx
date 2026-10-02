'use client';

import { motion } from 'motion/react';
import type React from 'react';

/** Courbe commune à la page d'entrée : départ franc, arrivée douce. */
export const EASE = [0.2, 0.7, 0.2, 1] as const;

/**
 * Tuile de la grille bento. Elle monte en fondu quand elle entre à l'écran
 * (une seule fois), se soulève au survol, et porte un halo qui suit le
 * pointeur (`bento-spot`, globals.css).
 */
export function Tile({ className = '', delay = 0, label, children }: {
  className?: string;
  delay?: number;
  /** Nom accessible de la région, quand la tuile n'a pas de titre visible. */
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      aria-label={label}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
      }}
      className={`bento-spot flex flex-col overflow-hidden rounded-[28px] border p-5 sm:p-6 ${className}`}
    >
      {children}
    </motion.section>
  );
}

/** Titre et texte de tuile : posés en bas, sous l'illustration animée. */
export function TileText({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-auto flex flex-col gap-1.5 pt-5">
      <h2 className="font-display text-xl leading-snug font-semibold tracking-tight">{title}</h2>
      <p className="text-[15px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}
