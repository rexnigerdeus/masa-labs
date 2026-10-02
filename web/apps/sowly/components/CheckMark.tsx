'use client';

import { motion } from 'motion/react';

/**
 * Pastille de validation : le cercle se remplit, la coche se dessine
 * (brief §9). C'est le geste répété des dizaines de fois par jour ; il doit
 * être net et court — 280 ms, pas de rebond qui ferait attendre.
 *
 * Motion plutôt qu'anime.js, contrairement au brief §7 : Motion est déjà
 * chargé pour les panneaux et les listes, et dessine un tracé SVG
 * (`pathLength`) aussi bien. Une seconde librairie pour un seul geste
 * aurait coûté du poids sans rien changer au rendu — et la « règle d'or »
 * du brief (une famille d'interaction = un outil) reste tenue.
 *
 * `shape` distingue les deux mondes, qui ne se mélangent jamais
 * visuellement (brief §3.2) : rond pour une habitude, carré arrondi pour
 * une tâche.
 */
export function CheckMark({ checked, shape = 'round', size = 'lg' }: {
  checked: boolean;
  shape?: 'round' | 'square';
  size?: 'lg' | 'sm';
}) {
  const box = size === 'lg' ? 'h-9 w-9' : 'h-6 w-6';
  const radius = shape === 'round' ? 'rounded-full' : 'rounded-[7px]';
  return (
    <motion.span
      aria-hidden
      className={`relative grid shrink-0 place-items-center border-2 ${box} ${radius}`}
      initial={false}
      animate={{
        backgroundColor: checked ? 'var(--done)' : 'rgba(0,0,0,0)',
        borderColor: checked ? 'var(--done)' : 'var(--faint)',
        scale: checked ? [1, 0.88, 1] : 1,
      }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <svg viewBox="0 0 24 24" className={size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'} fill="none">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="var(--card)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.28, ease: 'easeOut', delay: checked ? 0.06 : 0 }}
        />
      </svg>
    </motion.span>
  );
}

/** Retour tactile léger, là où il existe (Android ; Safari iOS l'ignore). */
export function tick(): void {
  try {
    navigator.vibrate?.(12);
  } catch {
    // Sans vibreur ou refusé par le navigateur : rien à faire.
  }
}
