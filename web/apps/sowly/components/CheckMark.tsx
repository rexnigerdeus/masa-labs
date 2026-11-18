'use client';

import { motion } from 'motion/react';
import { haptic, readFeedbackPrefs } from '../lib/feedback';

/**
 * Pastille de validation : elle se remplit de la couleur de l'app (lagune),
 * la coche foncée se dessine et la case grossit de 8 % sur la courbe
 * « ressort » du hub (brief design). C'est le geste répété des dizaines de
 * fois par jour : 250 ms, pas plus.
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
  const radius = shape === 'round' ? 'rounded-full' : 'rounded-[8px]';
  return (
    <motion.span
      aria-hidden
      className={`relative grid shrink-0 place-items-center border-2 ${box} ${radius}`}
      initial={false}
      animate={{
        backgroundColor: checked ? 'var(--done)' : 'rgba(0,0,0,0)',
        borderColor: checked ? 'var(--done)' : 'var(--doux)',
        scale: checked ? 1.08 : 1,
      }}
      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <svg viewBox="0 0 24 24" className={size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'} fill="none">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="var(--on-done)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: checked ? 0.05 : 0 }}
        />
      </svg>
    </motion.span>
  );
}

/**
 * Retour tactile léger (onboarding, démo de la page d'entrée). Passe par
 * `lib/feedback.ts`, qui sait aussi faire vibrer un iPhone.
 */
export function tick(): void {
  if (readFeedbackPrefs().haptics) haptic('task');
}
