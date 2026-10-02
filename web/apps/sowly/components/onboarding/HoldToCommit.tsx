'use client';

import { useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform, type AnimationPlaybackControls } from 'motion/react';
import { tick } from '../CheckMark';

const HOLD_SECONDS = 1.6;

/**
 * Contrat d'engagement tenu au doigt (« Hold to agree », hérité de Grit).
 *
 * Un tap ne suffit pas, et c'est voulu : maintenir 1,6 s transforme un clic
 * réflexe en décision. Relâcher avant la fin fait redescendre la jauge —
 * sans message d'erreur, on recommence simplement.
 *
 * Au clavier, maintenir Espace ou Entrée fait la même chose : le geste ne
 * doit pas exclure qui n'utilise pas d'écran tactile.
 */
export function HoldToCommit({ onCommit, label = 'Maintiens pour t’engager' }: {
  onCommit: () => void;
  label?: string;
}) {
  const progress = useMotionValue(0);
  const width = useTransform(progress, (p) => `${p * 100}%`);
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const [done, setDone] = useState(false);

  const start = (): void => {
    if (done) return;
    controls.current?.stop();
    controls.current = animate(progress, 1, {
      duration: HOLD_SECONDS * (1 - progress.get()),
      ease: 'linear',
      onComplete: () => {
        setDone(true);
        tick();
        onCommit();
      },
    });
  };

  const cancel = (): void => {
    if (done) return;
    controls.current?.stop();
    controls.current = animate(progress, 0, { duration: 0.35, ease: 'easeOut' });
  };

  return (
    <button
      type="button"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start(); }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); }
      }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') cancel(); }}
      // Pas de menu contextuel ni de sélection de texte pendant l'appui long.
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${label} (maintenir appuyé)`}
      className="relative h-16 w-full touch-none overflow-hidden rounded-full border-2 border-primary bg-card select-none [-webkit-touch-callout:none]"
    >
      <motion.span aria-hidden style={{ width }} className="absolute inset-y-0 left-0 bg-primary" />
      <span className={`relative font-display text-lg font-semibold ${done ? 'text-on-primary' : 'text-primary-ink'}`}>
        {done ? 'Engagement pris' : label}
      </span>
    </button>
  );
}
