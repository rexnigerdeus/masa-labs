'use client';

/**
 * Primitives d'interface, sur le vocabulaire du hub (brief design) : `.btn`,
 * `.puce`, `.segment`, `.champ`, `.carte`… définis dans `globals.css`. Les
 * composants ne font que poser ces classes : une autre app de la maison lit
 * le même code et retrouve les mêmes noms.
 *
 * Les formulaires composent ces pièces plutôt que des `<input>` nus
 * (patterns architecturaux §10).
 */

import { useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { ThemeToggle } from './ThemeToggle';

export function Field({ label, hint, children }: {
  label: string; hint?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <label className="champ">
      <span>{label}</span>
      {children}
      {hint !== undefined ? <span className="aide">{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`saisie ${props.className ?? ''}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`saisie resize-y ${props.className ?? ''}`} />;
}

const BUTTON = {
  primary: 'btn--plein',
  secondary: '',
  ghost: 'btn--fantome',
  danger: 'btn--fantome btn--danger',
} as const;

export function Button({ variant = 'secondary', size = 'md', className = '', ...props }:
React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON; size?: 'sm' | 'md' | 'lg';
}) {
  const sizing = size === 'lg' ? 'btn--grand' : size === 'sm' ? 'btn--petit' : '';
  return <button type="button" {...props} className={`btn ${BUTTON[variant]} ${sizing} ${className}`} />;
}

/** Sélecteur `.segment`, pour 2 à 4 choix (moment, regroupement, mode…). */
export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: ReadonlyArray<{ id: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="segment">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Message d'erreur ou d'information : un point et un mot, jamais la couleur seule. */
export function Notice({ tone = 'error', children }: {
  tone?: 'error' | 'info'; children: React.ReactNode;
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-[14px] bg-raised px-3.5 py-2.5 text-sm font-medium ${
        tone === 'error' ? 'text-urgent' : 'text-ok'
      }`}
    >
      <span aria-hidden className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-current" />
      <span>{children}</span>
    </p>
  );
}

/** Titre de section (30 px), compteur et lien d'action à droite. */
export function SectionTitle({ children, action, id }: {
  children: React.ReactNode; action?: React.ReactNode; id?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 id={id} className="titre-section">{children}</h2>
      {action}
    </div>
  );
}

/**
 * Titre d'écran : un surtitre chiffré, puis une promesse avec un mot en
 * serif italique (`<em className="s">`). Le bouton clair / sombre reste à
 * portée de pouce sur téléphone ; sur ordinateur, il est dans la barre
 * latérale.
 */
export function ScreenTitle({ kicker, children, aside }: {
  kicker?: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3 pt-2">
      <div className="flex min-w-0 flex-col gap-2">
        {kicker !== undefined ? <p className="sur first-letter:uppercase">{kicker}</p> : null}
        <h1 className="titre-page">{children}</h1>
      </div>
      {aside ?? <ThemeToggle className="mb-1 min-[860px]:hidden" />}
    </header>
  );
}

/** Puce cliquable (raccourcis d'échéance, choix de liste, identités). */
export function Chip({ active, onClick, children, as = 'button', radio = false }: {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  as?: 'button' | 'span';
  radio?: boolean;
}) {
  if (as === 'span') return <span className={`puce ${active ? 'active' : ''}`}>{children}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="puce"
      {...(radio ? { role: 'radio', 'aria-checked': active } : { 'aria-pressed': active })}
    >
      {children}
    </button>
  );
}

/** Interrupteur on / off, pour Personnaliser et le détail d'une tâche. */
export function Switch({ checked, onChange, label }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${
        checked ? 'bg-encre' : 'bg-[color-mix(in_srgb,var(--doux)_40%,transparent)]'
      }`}
    >
      <span
        aria-hidden
        className={`h-6 w-6 rounded-full bg-card shadow-sm transition-transform duration-200 ease-[var(--ressort)] ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  );
}

/**
 * Anneau d'avancement (`.anneau`) : trait de 11, bout arrondi, fond du
 * cercle à 16 %, pourcentage au centre en Bricolage. Se remplit en 1 s.
 */
export function Ring({ value, size = 112, label }: { value: number; size?: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="anneau" role="img" aria-label={`${label} ${pct} %`} style={{ '--t': `${size}px` } as React.CSSProperties}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className="fond" cx="50" cy="50" r={r} />
        <circle className="trace" cx="50" cy="50" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <b aria-hidden>{pct}<small>%</small></b>
    </div>
  );
}

/**
 * Met le dernier mot d'un texte libre (nom de liste, d'habitude) en serif
 * italique : la signature du style tient aussi sur un titre écrit par
 * l'utilisateur.
 */
export function Accent({ text }: { text: string }) {
  const trimmed = text.trim();
  const at = trimmed.lastIndexOf(' ');
  if (at === -1) return <em className="s">{trimmed}</em>;
  return <>{trimmed.slice(0, at)} <em className="s">{trimmed.slice(at + 1)}</em></>;
}

/**
 * Zone de texte qui grandit avec son contenu : un titre long se lit en
 * entier, sans barre de défilement ni coupure.
 */
export function AutoTextarea({ className = '', value, scroll = false, ...props }:
React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  /** Défile au-delà de sa hauteur maximale (CSS), au lieu de grandir sans fin. */
  scroll?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    // Mesurer oblige à replier le champ un instant : le conteneur saute et
    // le champ sort de l'écran en pleine saisie. On garde sa position, et
    // celle du texte dans le champ.
    const holders: Array<[HTMLElement, number]> = [];
    for (let p = el.parentElement; p !== null; p = p.parentElement) {
      if (p.scrollTop > 0) holders.push([p, p.scrollTop]);
    }
    const top = el.scrollTop;
    const atEnd = document.activeElement === el && el.selectionEnd === el.value.length;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
    // Écriture à la fin : la dernière ligne reste visible.
    el.scrollTop = atEnd ? el.scrollHeight : top;
    for (const [p, y] of holders) p.scrollTop = y;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} {...props} className={`resize-none ${scroll ? 'overflow-y-auto' : 'overflow-hidden'} ${className}`} />;
}

/**
 * Ouvre le calendrier d'un champ date invisible : au doigt, le toucher
 * suffit ; à la souris, Chrome ne l'ouvre que depuis sa petite icône.
 */
export function openPicker(input: HTMLInputElement): void {
  try { input.showPicker(); } catch { /* le champ reste utilisable au clavier */ }
}
