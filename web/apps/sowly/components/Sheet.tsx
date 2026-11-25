'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react';

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
  // Rendu dans <body> : posé dans la page, le panneau dépendrait de ses
  // ancêtres (une transformation ou une animation en cours en fait le repère
  // des éléments `fixed`), et passerait sous la barre de navigation.
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  // Le glissement part de la poignée seulement : sur tout le panneau, il
  // bloquait le défilement du contenu au doigt.
  const drag = useDragControls();

  // Le clavier s'ouvre (ou change de hauteur) : le champ en cours de saisie
  // revient dans la partie visible.
  useEffect(() => {
    if (!open || keyboard.visible === null) return;
    const el = document.activeElement;
    if (!(el instanceof HTMLElement) || ref.current?.contains(el) !== true) return;
    const id = requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest' }));
    return () => cancelAnimationFrame(id);
  }, [open, keyboard.visible, keyboard.inset, ref]);

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
      className="tiroir fixed top-2.5 right-2.5 bottom-2.5 z-50 flex w-[min(560px,calc(100vw-20px))] flex-col overflow-hidden rounded-[calc(var(--r)+4px)] bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,.5)]"
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
      data-clavier={keyboard.inset > 0 ? '' : undefined}
      // Fermé, le panneau reste dans le DOM mais sort de l'arbre focalisable.
      inert={!open}
      className="tiroir tiroir--bas fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-xl flex-col rounded-t-[calc(var(--r)+4px)] bg-card pt-2.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,.5)]"
      style={{
        // Clavier ouvert : le panneau se pose sur le clavier, et la marge de
        // l'encoche (qui est sous le clavier) n'a plus lieu d'être.
        bottom: keyboard.inset,
        paddingBottom: keyboard.inset > 0 ? '0px' : 'env(safe-area-inset-bottom)',
        maxHeight: keyboard.visible === null ? '92dvh' : keyboard.visible - 12,
        transition: 'bottom 0.2s ease-out',
      }}
      initial={{ y: '110%' }}
      animate={{ y: open ? 0 : '110%' }}
      exit={{ y: '110%' }}
      transition={{ duration: 0.32, ease: ENTREE }}
      drag="y"
      dragListener={false}
      dragControls={drag}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={onDragEnd}
    >
      <div
        aria-hidden
        onPointerDown={(e) => drag.start(e)}
        className="-mt-2.5 flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-2"
      >
        <span className="h-1.5 w-10 rounded-full bg-line" />
      </div>
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

  if (host === null) return null;

  if (keepMounted) {
    return createPortal(<>{backdrop}{panel}</>, host);
  }

  return createPortal(
    <AnimatePresence>
      {open ? backdrop : null}
      {open ? panel : null}
    </AnimatePresence>,
    host,
  );
}

/*
 * Les trois pièces du tiroir du hub : une tête (surtitre, titre, bouton
 * fermer), un corps qui défile, un pied avec les boutons. Le pied reste
 * collé en bas du tiroir sur ordinateur et sous le contenu sur téléphone.
 */

export function SheetHead({ kicker, title, onClose, closeLabel = 'Fermer' }: {
  kicker?: React.ReactNode;
  title?: React.ReactNode;
  onClose: () => void;
  closeLabel?: string;
}) {
  return (
    <div className="tiroir__tete">
      <div className="flex min-w-0 flex-col gap-1.5">
        {kicker !== undefined ? <p className="sur">{kicker}</p> : null}
        {title !== undefined ? <h2 className="titre-tiroir">{title}</h2> : null}
      </div>
      <button type="button" onClick={onClose} aria-label={closeLabel} className="fermer">
        <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

export function SheetBody({ children }: { children: React.ReactNode }) {
  return <div className="tiroir__corps">{children}</div>;
}

export function SheetFoot({ children }: { children: React.ReactNode }) {
  return <div className="tiroir__pied">{children}</div>;
}
