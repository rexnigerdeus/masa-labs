'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { IDENTITIES } from '../../lib/identities';
import { CheckMark, tick } from '../CheckMark';
import { CloudIcon, CloudOffIcon, MoonIcon, PlusIcon, SunIcon } from '../icons';
import { switchTheme, useResolvedTheme } from '../ThemeToggle';
import { EASE } from './Tile';

/**
 * Les illustrations vivantes de la page d'entrée. Chacune montre un vrai
 * geste de l'app plutôt qu'une capture : on comprend Sowly en le touchant.
 *
 * Les boucles ne tournent que lorsque la tuile est à l'écran, et pas du
 * tout si le système demande de réduire les animations.
 */

/** Exécute `step` toutes les `ms` tant que l'élément est visible. */
function useLoop(ref: React.RefObject<Element | null>, ms: number, step: () => void): void {
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const saved = useRef(step);
  saved.current = step;
  useEffect(() => {
    if (!inView || reduce === true) return;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [inView, reduce, ms]);
}

/* ------------------------------------------------------------------ Pousse */

/**
 * La marque qui pousse : la tige monte, les feuilles s'ouvrent, puis le tout
 * se balance doucement. Même tracé que `BrandMark`, découpé en trois pièces.
 */
export function GrowingSprout({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-[18%] rounded-full border-2 border-current"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.5], opacity: [0.35, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: 1.4 + i * 1.2, ease: 'easeOut' }}
        />
      ))}
      <motion.svg
        viewBox="132 110 296 342"
        fill="currentColor"
        className="relative h-full w-full"
        style={{ originX: 0.5, originY: 1 }}
        animate={{ rotate: [-2.5, 2.5] }}
        transition={{ duration: 3.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 1.6 }}
      >
        <g transform="translate(-12 -14)">
          <motion.rect
            x="246" y="266" width="44" height="174" rx="22"
            style={{ transformBox: 'fill-box', originY: 1 }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
          />
          <motion.path
            d="M268 306c0-74-44-112-124-112 0 74 44 112 124 112z"
            style={{ transformBox: 'fill-box', originX: 1, originY: 1 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.75 }}
          />
          <motion.path
            d="M268 274c0-96 56-150 148-150 0 92-56 150-148 150z"
            style={{ transformBox: 'fill-box', originX: 0, originY: 1 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.95 }}
          />
        </g>
      </motion.svg>
    </div>
  );
}

/* ------------------------------------------------------- Démo Aujourd'hui */

const DEMO_HABITS = [
  { action: 'Lire une page', when: 'Soir · au coucher', streak: 12 },
  { action: 'Faire 5 pompes', when: 'Matin · au réveil', streak: 4 },
  { action: 'Boire un verre d’eau', when: 'Matin · avec le café', streak: 27 },
];

/**
 * L'écran Aujourd'hui en miniature, vraiment cliquable : valider une
 * habitude fait grandir sa série ; les trois validées, le bloc prend le
 * halo ambré de la journée complète — exactement comme dans l'app.
 */
export function TodayDemo() {
  const [done, setDone] = useState([true, false, false]);
  const [touched, setTouched] = useState(false);
  const complete = done.every(Boolean);
  const hint = touched ? -1 : done.indexOf(false);

  const toggle = (i: number): void => {
    tick();
    setTouched(true);
    setDone((d) => d.map((v, j) => (j === i ? !v : v)));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <p className="font-display text-lg font-semibold">
          Habitudes{' '}
          <span className="text-base font-medium text-muted">
            {done.filter(Boolean).length}/{DEMO_HABITS.length}
          </span>
        </p>
        <span className="rounded-full bg-done-soft px-2.5 py-1 text-xs font-medium text-primary-ink">
          Essaie, c’est cliquable
        </span>
      </div>

      <motion.div
        className="overflow-hidden rounded-[20px] border"
        initial={false}
        animate={{
          backgroundColor: complete ? 'var(--reward)' : 'var(--canvas)',
          borderColor: complete ? 'var(--reward-glow)' : 'var(--line)',
          boxShadow: complete ? '0 0 0 6px var(--reward-halo)' : '0 0 0 0px var(--reward-halo)',
        }}
        transition={{ duration: 0.4 }}
      >
        <ul className="divide-y divide-line">
          {DEMO_HABITS.map((h, i) => (
            <li key={h.action}>
              <button
                type="button"
                aria-pressed={done[i]}
                onClick={() => toggle(i)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-raised/60"
              >
                <span className="relative">
                  <CheckMark checked={done[i] ?? false} />
                  {i === hint ? (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full border-2 border-done"
                      animate={{ scale: [1, 1.55], opacity: [0.7, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                    />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`text-[15px] font-medium transition ${done[i] ? 'text-muted' : 'text-ink'}`}>
                    {h.action}
                  </span>
                  <span className="text-[13px] text-muted">{h.when}</span>
                </span>
                <span className="flex items-baseline gap-1 font-display text-sm text-muted">
                  <span className="relative inline-flex h-5 min-w-[1.4rem] justify-end overflow-hidden font-semibold text-ink">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        key={h.streak + (done[i] ? 1 : 0)}
                        initial={{ y: 16, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -16, opacity: 0 }}
                        transition={{ duration: 0.25, ease: EASE }}
                      >
                        {h.streak + (done[i] ? 1 : 0)}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  j
                </span>
              </button>
            </li>
          ))}
        </ul>
        <AnimatePresence initial={false}>
          {complete ? (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-reward-glow/40 px-4 text-sm font-medium text-reward-ink"
            >
              <span className="block py-3">Journée complète. Ta graine a pris un jour de plus.</span>
            </motion.p>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <div className="mt-2 flex flex-col gap-2 px-1">
        <p className="text-sm font-medium text-muted">Cette semaine</p>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK.map((d, i) => {
            const today = i === WEEK.length - 1;
            const full = today ? complete : d.full;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <motion.span
                  className={`h-8 w-full max-w-10 rounded-full ${today ? 'ring-2 ring-primary-ink ring-offset-2 ring-offset-card' : ''}`}
                  initial={false}
                  animate={{ backgroundColor: full ? 'var(--reward-glow)' : 'var(--raised)', scale: today && complete ? [1, 1.12, 1] : 1 }}
                  transition={{ duration: 0.4 }}
                />
                <span className={`text-xs ${today ? 'font-semibold text-ink' : 'text-faint'}`}>{d.day}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted">Une pastille dorée par journée complète. Valide les trois pour allumer aujourd’hui.</p>
      </div>
    </div>
  );
}

const WEEK = [
  { day: 'L', full: true }, { day: 'M', full: true }, { day: 'M', full: false },
  { day: 'J', full: true }, { day: 'V', full: true }, { day: 'S', full: false }, { day: 'D', full: false },
];

/* --------------------------------------------------------------- Identités */

/** « Je veux devenir… » qui défile, et la première graine qui va avec. */
export function IdentityCycle() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  useLoop(ref, 2800, () => setIndex((i) => (i + 1) % IDENTITIES.length));
  const identity = IDENTITIES[index]!;
  const seed = identity.suggestions[0]!;

  return (
    <div ref={ref} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted">Je veux devenir…</p>
        <div className="relative h-[2.4rem] overflow-hidden sm:h-[2.6rem]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={identity.id}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="font-display text-[1.6rem] leading-tight font-semibold tracking-tight text-primary-ink sm:text-[1.85rem]"
            >
              {identity.label}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={identity.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 self-start rounded-2xl border border-line bg-canvas px-3.5 py-2.5"
        >
          <CheckMark checked={false} size="sm" />
          <span className="text-[15px]">
            <span className="font-medium">{seed.action}</span>
            <span className="text-muted"> · {seed.cue}</span>
          </span>
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choisir une identité">
        {IDENTITIES.map((i, k) => (
          <button
            key={i.id}
            type="button"
            aria-pressed={k === index}
            onClick={() => setIndex(k)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              k === index ? 'border-primary bg-done-soft text-primary-ink' : 'border-line text-muted hover:text-ink'
            }`}
          >
            {i.short}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Historique */

// Six semaines (une colonne par semaine). Des trous, puis des reprises :
// c'est le message de la tuile.
const HISTORY = [
  '1101111', '1111011', '1110001', '0011111', '1111110', '1111',
].map((w) => w.split('').map((c) => c === '1'));

/** Historique façon app : un jour manqué est une case vide, jamais rouge. */
export function HistoryDemo() {
  return (
    <div aria-hidden className="flex w-full max-w-[16rem] flex-col gap-3">
    <div className="grid grid-cols-6 gap-1.5">
      {HISTORY.map((week, w) => (
        <div key={w} className="grid grid-rows-7 gap-1.5">
          {week.map((on, d) => {
            const i = w * 7 + d;
            const today = w === HISTORY.length - 1 && d === week.length - 1;
            return (
              <motion.span
                key={d}
                className={`aspect-square rounded-[6px] ${on ? 'bg-done' : 'bg-raised'} ${today ? 'ring-2 ring-primary-ink ring-offset-2 ring-offset-card' : ''}`}
                initial={{ opacity: 0, scale: 0.4 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.35, ease: EASE, delay: 0.15 + i * 0.018 }}
              />
            );
          })}
        </div>
      ))}
    </div>
      <div className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[4px] bg-done" /> Validé</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[4px] bg-raised" /> Pas ce jour-là</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Tâches */

const TYPED = ['Appeler maman', 'Payer la facture', 'Acheter du pain', 'Réviser le chapitre 3'];

/** « Ma journée » : une tâche s'écrit dans l'ajout rapide, puis rejoint la liste. */
export function TasksDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState([
    { id: 0, text: 'Envoyer le devis', done: true },
    { id: 1, text: 'Rappeler le garage', done: false },
  ]);
  const [k, setK] = useState(0);
  const [chars, setChars] = useState(0);
  const word = TYPED[k % TYPED.length]!;

  useLoop(ref, 90, () => {
    if (chars < word.length + 12) { setChars((c) => c + 1); return; }
    // Mot tapé et laissé visible un instant : il rejoint la liste.
    setTasks((t) => [...t.slice(-2), { id: k + 2, text: word, done: false }]);
    setK((x) => x + 1);
    setChars(0);
  });

  return (
    <div ref={ref} aria-hidden className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2.5 text-[14px]">
        <PlusIcon className="h-4 w-4 text-primary-ink" />
        {chars === 0 ? (
          <span className="text-faint">Ajouter à Ma journée…</span>
        ) : (
          <span>
            {word.slice(0, chars)}
            <motion.span
              className="ml-px inline-block h-4 w-[2px] translate-y-[3px] bg-primary"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: 'mirror' }}
            />
          </span>
        )}
      </div>
      <ul className="flex flex-col">
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((t) => (
            <motion.li
              key={t.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="flex items-center gap-2.5 py-1.5"
            >
              <CheckMark checked={t.done} shape="square" size="sm" />
              <span className={`text-[14px] ${t.done ? 'text-muted line-through' : ''}`}>{t.text}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------ Hors réseau */

/** L'état de synchronisation qui alterne : hors connexion, puis à jour. */
export function OfflineDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [online, setOnline] = useState(false);
  useLoop(ref, 2600, () => setOnline((o) => !o));

  return (
    <div ref={ref} aria-hidden className="flex flex-col items-start gap-3">
      <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-raised text-ink">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(online)}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            {online ? <CloudIcon className="h-7 w-7 text-primary-ink" /> : <CloudOffIcon className="h-7 w-7 text-muted" />}
          </motion.span>
        </AnimatePresence>
      </div>
      <motion.span
        layout
        className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-medium"
      >
        <span className={`h-2 w-2 rounded-full transition-colors ${online ? 'bg-done' : 'bg-faint'}`} />
        {online ? 'À jour · synchronisé' : 'Hors connexion · 2 modifications gardées'}
      </motion.span>
    </div>
  );
}

/* ---------------------------------------------------------------- Illimité */

/** Le signe infini qui se dessine. */
export function InfinityDraw() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-20 w-20 text-primary-ink">
      <motion.path
        d="M12 12c-2-2.5-3.5-4-5.5-4a4 4 0 000 8c2 0 3.5-1.5 5.5-4zm0 0c2 2.5 3.5 4 5.5 4a4 4 0 000-8c-2 0-3.5 1.5-5.5 4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.2 }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------- Thème */

/** Grand interrupteur clair / sombre : il change vraiment le thème. */
export function ThemeSwitch() {
  const theme = useResolvedTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Mode sombre"
      onClick={(e) => switchTheme(dark ? 'light' : 'dark', e.currentTarget)}
      className={`flex h-16 w-32 items-center rounded-full border border-line bg-raised p-1.5 ${dark ? 'justify-end' : 'justify-start'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="grid h-12 w-12 place-items-center rounded-full bg-card text-ink shadow-md shadow-sable-900/15"
      >
        {theme === null ? null : dark ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
      </motion.span>
    </button>
  );
}
