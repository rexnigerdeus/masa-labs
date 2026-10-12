'use client';

/**
 * Primitives d'interface, dans l'esprit de Kokonut UI (brief §7) sans en
 * importer le registre : une poignée de composants, minces et sans état,
 * sur les rôles de couleur de `globals.css`. Le registre shadcn aurait fait
 * entrer Radix et une couche de configuration pour cinq composants.
 *
 * Les formulaires composent ces pièces plutôt que des `<input>` nus
 * (patterns architecturaux §10).
 */

import { useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { ThemeToggle } from './ThemeToggle';

const inputClass =
  'w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink '
  + 'placeholder:text-faint focus:border-primary focus:outline-none';

export function Field({ label, hint, children }: {
  label: string; hint?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint !== undefined ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

const BUTTON = {
  primary: 'bg-primary text-on-primary hover:brightness-110 active:brightness-95',
  secondary: 'border border-line bg-card text-ink hover:bg-raised',
  ghost: 'text-muted hover:bg-raised hover:text-ink',
  danger: 'text-clay-ink hover:bg-raised',
} as const;

export function Button({ variant = 'secondary', size = 'md', className = '', ...props }:
React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON; size?: 'md' | 'lg';
}) {
  const sizing = size === 'lg' ? 'h-12 px-6 text-base' : 'h-10 px-4 text-sm';
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:opacity-50 ${sizing} ${BUTTON[variant]} ${className}`}
    />
  );
}

/** Sélecteur à pastilles (moment de la journée, regroupement, thème). */
export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: ReadonlyArray<{ id: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-full bg-raised p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
            value === o.id ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Notice({ tone = 'error', children }: {
  tone?: 'error' | 'info'; children: React.ReactNode;
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl px-3.5 py-2.5 text-sm ${
        tone === 'error' ? 'bg-raised text-clay-ink' : 'bg-done-soft text-primary-ink'
      }`}
    >
      {children}
    </p>
  );
}

export function SectionTitle({ children, action }: {
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <h2 className="font-display text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

/**
 * Titre d'écran : même taille et même rythme partout, avec le bouton
 * clair / sombre à portée de pouce sur chaque onglet.
 */
export function ScreenTitle({ kicker, children }: { kicker?: string; children: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-1 pt-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        {kicker !== undefined ? (
          <p className="text-sm font-medium text-muted first-letter:uppercase">{kicker}</p>
        ) : null}
        <h1 className="font-display text-[2rem] leading-tight font-semibold tracking-tight">{children}</h1>
      </div>
      <ThemeToggle className="mb-1" />
    </header>
  );
}

/** Pastille cliquable (raccourcis d'échéance, choix de liste). */
export function Chip({ active, onClick, children, as = 'button', radio = false }: {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  as?: 'button' | 'span';
  radio?: boolean;
}) {
  const className = `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
    active ? 'border-primary bg-done-soft text-primary-ink' : 'border-line text-muted hover:text-ink'
  }`;
  if (as === 'span') return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      {...(radio ? { role: 'radio', 'aria-checked': active } : { 'aria-pressed': active })}
    >
      {children}
    </button>
  );
}

/** Interrupteur on / off, pour les réglages et le détail d'une tâche. */
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
        checked ? 'bg-primary' : 'bg-creme-300 dark:bg-creme-700'
      }`}
    >
      <span
        aria-hidden
        className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  );
}

/**
 * Zone de texte qui grandit avec son contenu : un titre long se lit en
 * entier, sans barre de défilement ni coupure.
 */
export function AutoTextarea({ className = '', value, ...props }:
React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} {...props} className={`resize-none overflow-hidden ${className}`} />;
}
