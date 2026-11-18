'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';

/**
 * Panneau (le « Tiroir » du hub) : sur téléphone, il monte du bas de
 * l'écran et se referme par glissement vers le bas ; sur ordinateur, il
 * glisse depuis la droite. Échap ou un toucher sur le voile le ferment.
 *
 * `keepMounted` garde le panneau dans le DOM une fois fermé : c'est ce qui
 * permet de donner le focus à un champ *pendant* le toucher qui l'ouvre —
 * la seule façon de faire apparaître le clavier sur iOS (voir QuickAdd).
 */
/**
 * Hauteur du clavier virtuel qui recouvre le bas de l'écran.
 *
 * Sur iPhone (et Chrome Android récent), le clavier ne réduit pas la page :
 * il se pose par-dessus. Un panneau `fixed` en `bottom: 0` reste collé au bas
 * de la page… sous le clavier. `visualViewport` donne la zone réellement
 * visible ; l'écart avec la fenêtre, c'est le clavier.
 */
function useKeyboardInset(active: boolean): { inset: number; visible: number | null } {
  const [state, setState] = useState<{ inset: number; visible: number | null }>({ inset: 0, visible: null });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || vv == null) {
      setState({ inset: 0, visible: null });
      return;
    }
    const update = (): void => {
      setState({
        inset: Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)),
        visible: Math.round(vv.height),
      });
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [active]);
  return state;
}

/** Ordinateur (≥ 860 px, comme la barre latérale) : tiroir à droite. */
const WIDE = '(min-width: 860px)';
function useWide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = matchMedia(WIDE);
      m.addEventListener('change', onChange);
      return () => m.removeEventListener('change', onChange);
    },
    () => matchMedia(WIDE).matches,
    () => false,
  );
}

const ENTREE = [0.2, 0.9, 0.3, 1] as const;

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
  const wide = useWide();
  const keyboard = useKeyboardInset(open && !wide);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo): void => {
    if (info.offset.y > 90 || info.velocity.y > 500) onClose();
  };

  // Tiroir du hub sur ordinateur : décollé de 10 px des bords, rayon
  // `--r` + 4, glisse de 40 px depuis la droite. Feuille du bas au doigt.
  const panel = wide ? (
    <motion.div
      key="panel"
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      inert={!open}
      className="fixed top-2.5 right-2.5 bottom-2.5 z-50 flex w-[min(560px,calc(100vw-20px))] flex-col overflow-y-auto rounded-[calc(var(--r)+4px)] bg-card p-[22px] shadow-[0_30px_80px_-20px_rgba(0,0,0,.5)]"
      initial={{ x: 40, opacity: 0 }}
      animate={open ? { x: 0, opacity: 1 } : { x: 40, opacity: 0 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.32, ease: ENTREE }}
      style={{ pointerEvents: open ? 'auto' : 'none' }}
    >
      {children}
    </motion.div>
  ) : (
    <motion.div
      key="panel"
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      // Fermé, le panneau reste dans le DOM mais sort de l'arbre focalisable.
      inert={!open}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-xl rounded-t-[calc(var(--r)+4px)] bg-card px-5 pt-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,.5)]"
      style={{
        // Clavier ouvert : le panneau se pose sur le clavier, et la marge de
        // l'encoche (qui est sous le clavier) n'a plus lieu d'être.
        bottom: keyboard.inset,
        paddingBottom: keyboard.inset > 0 ? '0.75rem' : 'calc(env(safe-area-inset-bottom) + 1.25rem)',
        maxHeight: keyboard.visible === null ? '92dvh' : keyboard.visible - 12,
        overflowY: 'auto',
        transition: 'bottom 0.2s ease-out',
      }}
      initial={{ y: '110%' }}
      animate={{ y: open ? 0 : '110%' }}
      exit={{ y: '110%' }}
      transition={{ duration: 0.32, ease: ENTREE }}
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
      className="voile fixed inset-0 z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: open ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
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
