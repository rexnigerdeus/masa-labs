'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';

/**
 * Panneau qui monte du bas de l'écran, refermable par glissement vers le bas,
 * par Échap ou en touchant le fond. Le geste naturel au pouce sur mobile,
 * et une boîte de dialogue ordinaire au clavier.
 *
 * `keepMounted` garde le panneau dans le DOM une fois fermé : c'est ce qui
 * permet de donner le focus à un champ *pendant* le toucher qui l'ouvre —
 * la seule façon de faire apparaître le clavier sur iOS (voir QuickAdd).
 */
export function Sheet({ open, onClose, label, children, keepMounted = false, panelRef }: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  keepMounted?: boolean;
  panelRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const localRef = useRef<HTMLDivElement>(null);
  const ref = panelRef ?? localRef;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo): void => {
    if (info.offset.y > 90 || info.velocity.y > 500) onClose();
  };

  const panel = (
    <motion.div
      key="panel"
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      // Fermé, le panneau reste dans le DOM mais sort de l'arbre focalisable.
      inert={!open}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-xl rounded-t-[28px] border border-b-0 border-line bg-card px-5 pt-3 shadow-[0_-12px_40px_-12px_rgb(0_0_0/0.25)]"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      initial={{ y: '110%' }}
      animate={{ y: open ? 0 : '110%' }}
      exit={{ y: '110%' }}
      transition={{ type: 'spring', stiffness: 520, damping: 44 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={onDragEnd}
    >
      <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
      {children}
    </motion.div>
  );

  const backdrop = (
    <motion.div
      key="backdrop"
      aria-hidden
      className="fixed inset-0 z-40 bg-sable-950/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: open ? 1 : 0 }}
      exit={{ opacity: 0 }}
      style={{ pointerEvents: open ? 'auto' : 'none' }}
      onClick={onClose}
    />
  );

  if (keepMounted) {
    return (
      <>
        {backdrop}
        {panel}
      </>
    );
  }

  return (
    <AnimatePresence>
      {open ? backdrop : null}
      {open ? panel : null}
    </AnimatePresence>
  );
}
