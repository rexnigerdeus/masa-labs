'use client';

import { useEffect, useState } from 'react';
import { ACCENT_PRESETS, type CvDate } from '@everyday/cv-core';

/**
 * Champs de formulaire partagés par les étapes du parcours.
 *
 * Tailles pensées pour le pouce : 48 px de haut pour un champ, 44 px au moins
 * pour un bouton. Une partie du public découvre la saisie sur téléphone avec
 * ce produit ; une cible trop petite se lit comme « ça ne marche pas ».
 */

const inputBase =
  'w-full rounded-xl border bg-white px-3.5 py-3 text-base '
  + 'placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40';

const inputClass = (invalid: boolean): string =>
  `${inputBase} ${invalid ? 'border-danger focus:border-danger' : 'border-line focus:border-accent'}`;

/** Message d'erreur sous un champ, annoncé aux lecteurs d'écran. */
export function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <span role="alert" className="flex items-start gap-1.5 text-sm font-medium text-danger">
      <svg aria-hidden viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.5h1.5v5h-1.5v-5Zm0 6.25h1.5v1.5h-1.5v-1.5Z" />
      </svg>
      {children}
    </span>
  );
}

export function Field({ label, hint, error, optional = false, children }: {
  label: string;
  hint?: string;
  error?: string;
  /** Affiche « facultatif » à côté du libellé. */
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">
        {label}
        {optional ? <span className="ml-1.5 font-normal text-muted">(facultatif)</span> : null}
      </span>
      {children}
      {error !== undefined ? <FieldError>{error}</FieldError> : null}
      {hint !== undefined && error === undefined ? (
        <span className="text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput({
  value, onChange, placeholder, type = 'text', invalid = false, autoComplete, inputMode,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel';
  invalid?: boolean;
  /** Laisse le téléphone proposer nom, numéro et email déjà connus. */
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
}) {
  return (
    <input
      className={inputClass(invalid)}
      type={type}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/**
 * Mot de passe avec bouton « Afficher » / « Masquer ».
 *
 * Sur un clavier de téléphone, une faute de frappe invisible est la première
 * cause de « mot de passe incorrect » — et de compte créé avec un mot de passe
 * qu'on ne connaît pas soi-même. Voir ce qu'on tape règle les deux.
 */
export function PasswordInput({ value, onChange, autoComplete, id }: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  id?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <input
        id={id}
        className={`${inputClass(false)} pr-28`}
        type={visible ? 'text' : 'password'}
        value={value}
        autoComplete={autoComplete}
        // Pas de correction ni de majuscule automatique quand le texte est
        // visible : le clavier « corrigerait » le mot de passe.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-pressed={visible}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        className="absolute inset-y-1 right-1 inline-flex items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-accent-ink hover:bg-accent-soft"
      >
        {visible ? (
          <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 3l14 14M8.6 8.7a2 2 0 002.7 2.7M6.2 5.6C3.6 7 1.8 10 1.8 10s3 6 8.2 6c1.4 0 2.7-.4 3.8-1M11 4.1c-.3 0-.7-.1-1-.1 5.2 0 8.2 6 8.2 6s-.6 1.2-1.7 2.5" />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1.8 10S4.8 4 10 4s8.2 6 8.2 6-3 6-8.2 6-8.2-6-8.2-6z" />
            <circle cx="10" cy="10" r="2.5" />
          </svg>
        )}
        <span aria-hidden>{visible ? 'Masquer' : 'Afficher'}</span>
      </button>
    </span>
  );
}

export function TextArea({ value, onChange, placeholder, rows = 4, invalid = false }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  invalid?: boolean;
}) {
  return (
    <textarea
      className={inputClass(invalid)}
      rows={rows}
      value={value}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Button({
  children, onClick, variant = 'outline', type = 'button', size = 'md', full = false, disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'outline' | 'ghost' | 'dark';
  type?: 'button' | 'submit';
  size?: 'md' | 'lg';
  /** Prend toute la largeur disponible. */
  full?: boolean;
  disabled?: boolean;
}) {
  // Boutons pleins verts pour l'action principale, contour vert pour les
  // actions secondaires (« Ajouter une expérience ») — brief §7. Le texte du
  // bouton plein est l'encre sombre de l'en-tête et non du blanc : le blanc
  // sur le vert de marque ne tient que 2,7:1.
  const styles = {
    solid: 'bg-accent text-header hover:bg-accent-dark',
    dark: 'bg-header text-white hover:bg-ink',
    outline: 'border-2 border-accent text-accent-ink hover:bg-accent-soft',
    ghost: 'text-muted underline-offset-4 hover:text-ink hover:underline',
  }[variant];
  const sizes = size === 'lg' ? 'min-h-13 px-6 text-base' : 'min-h-11 px-4 text-sm';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-60 ${sizes} ${styles} ${full ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet',
  'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/**
 * Saisie d'une date de CV : année d'abord, mois facultatif.
 *
 * L'année vient en premier parce que c'est elle qui compte : le mois reste
 * grisé tant qu'elle n'est pas saisie, et l'ordre inverse faisait croire à un
 * champ bloqué. Le critère « Cohérence » vérifie qu'on ne mélange pas les deux
 * formats d'une expérience à l'autre.
 */
export function DateInput({ value, onChange, label, error }: {
  value: CvDate | null;
  onChange: (value: CvDate | null) => void;
  label: string;
  error?: string;
}) {
  const year = value?.year ?? '';
  const month = value?.month ?? '';

  const setYear = (raw: string): void => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      onChange(null);
      return;
    }
    onChange({ year: parsed, ...(value?.month != null ? { month: value.month } : {}) });
  };

  const setMonth = (raw: string): void => {
    if (value === null) return;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      onChange({ year: value.year });
      return;
    }
    onChange({ year: value.year, month: parsed });
  };

  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
        <input
          className={inputClass(error !== undefined)}
          type="number"
          inputMode="numeric"
          min={1950}
          max={2100}
          placeholder="Année"
          aria-label={`${label} — année`}
          aria-invalid={error !== undefined || undefined}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
        <select
          className={inputClass(false)}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label={`${label} — mois`}
          disabled={value === null}
        >
          <option value="">Mois (facultatif)</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </select>
      </div>
      {error !== undefined ? <FieldError>{error}</FieldError> : null}
    </fieldset>
  );
}

/** Découpe une saisie libre en lignes non vides. */
function parseLines(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter((s) => s !== '');
}

/**
 * Plusieurs lignes dans un seul champ : une ligne = une puce.
 *
 * Remplace la liste de champs à « Ajouter » / « Retirer » : chaque puce avait
 * ses deux boutons, et une expérience à trois missions portait huit contrôles.
 * Ici, on écrit, on passe à la ligne — un geste que tout le monde connaît.
 *
 * Même mécanique que `TagInput` : le texte tapé est un état local, seule la
 * liste dérivée remonte, sans quoi le retour à la ligne disparaîtrait sous
 * les doigts.
 */
export function LinesArea({ items, onChange, placeholder, rows = 4 }: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  rows?: number;
}) {
  const [text, setText] = useState(() => items.join('\n'));

  useEffect(() => {
    if (JSON.stringify(parseLines(text)) !== JSON.stringify(items)) {
      setText(items.join('\n'));
    }
    // `text` est volontairement absent : voir `TagInput`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <TextArea
      rows={rows}
      placeholder={placeholder}
      value={text}
      onChange={(v) => {
        setText(v);
        onChange(parseLines(v));
      }}
    />
  );
}

/** Découpe une saisie libre en mots-clés exploitables. */
function parseTags(text: string): string[] {
  return text.split(',').map((s) => s.trim()).filter((s) => s !== '');
}

/**
 * Liste de mots-clés (compétences), séparés par des virgules, avec des
 * suggestions à ajouter d'un toucher.
 *
 * Le texte saisi est un état local, et non `items.join(', ')` recalculé à
 * chaque rendu. La version pilotée par la liste était inutilisable : taper une
 * virgule produisait une entrée vide, aussitôt filtrée, donc la virgule
 * disparaissait sous les doigts et on ne pouvait jamais saisir la deuxième
 * compétence. Ici la frappe reste intacte, et seule la liste dérivée est
 * nettoyée.
 */
export function TagInput({ items, onChange, placeholder, suggestions = [] }: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  /** Propositions courantes : la page blanche est le premier obstacle. */
  suggestions?: string[];
}) {
  const [text, setText] = useState(() => items.join(', '));

  // Resynchronisation quand la liste change par une autre voie que la frappe
  // (chargement d'un brouillon, suggestion, retrait d'une pastille). La
  // comparaison sur la liste dérivée évite d'écraser une saisie en cours,
  // virgule finale comprise.
  useEffect(() => {
    // Comparaison sérialisée : un `join` sur un séparateur ordinaire
    // confondrait ['Sage 100'] et ['Sage', '100'].
    if (JSON.stringify(parseTags(text)) !== JSON.stringify(items)) {
      setText(items.join(', '));
    }
    // `text` est volontairement absent des dépendances : le réintroduire
    // relancerait l'effet à chaque frappe et annulerait la saisie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const lower = items.map((i) => i.toLowerCase());
  const remaining = suggestions.filter((s) => !lower.includes(s.toLowerCase()));

  return (
    <div className="flex flex-col gap-3">
      <TextArea
        rows={3}
        placeholder={placeholder}
        value={text}
        onChange={(v) => {
          setText(v);
          onChange(parseTags(v));
        }}
      />
      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Compétences ajoutées">
          {items.map((item, i) => (
            <li key={`${item}-${i}`}>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                aria-label={`Retirer ${item}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent-soft py-1 pl-3 pr-2 text-sm text-header"
              >
                {item}
                <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 opacity-60" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {remaining.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted">Suggestions — touchez pour ajouter :</span>
          <ul className="flex flex-wrap gap-2">
            {remaining.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => onChange([...items, s])}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-line bg-white px-3 py-1 text-sm hover:border-accent"
                >
                  <span aria-hidden className="text-accent-ink">+</span> {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Choix de la couleur primaire du CV.
 *
 * Huit teintes d'un clic, plus la pipette du système pour celles et ceux qui
 * ont une couleur imposée — une charte d'entreprise, un secteur, un goût. Les
 * propositions sont toutes assez sombres pour porter du texte blanc : le
 * modèle « Compact » pose le nom sur un bandeau plein, et une primaire trop
 * claire y rendrait l'identité illisible.
 */
export function ColorPicker({ value, onChange }: {
  value: string; onChange: (value: string) => void;
}) {
  const isPreset = ACCENT_PRESETS.some((p) => p.value === value.toLowerCase());

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {ACCENT_PRESETS.map((preset) => {
        const selected = preset.value === value.toLowerCase();
        return (
          <button
            key={preset.value}
            type="button"
            title={preset.label}
            aria-label={preset.label}
            aria-pressed={selected}
            onClick={() => onChange(preset.value)}
            className={`h-10 w-10 rounded-full border-2 transition-transform ${
              selected ? 'scale-110 border-ink ring-2 ring-white ring-inset' : 'border-line'
            }`}
            style={{ background: preset.value }}
          />
        );
      })}

      <label
        className={`relative flex h-10 items-center gap-1.5 rounded-full border-2 px-3 text-sm ${
          isPreset ? 'border-line' : 'border-ink'
        }`}
      >
        <span
          aria-hidden
          className="h-5 w-5 rounded-full border border-line"
          style={{ background: value }}
        />
        Autre
        <input
          type="color"
          value={value}
          aria-label="Choisir une autre couleur"
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
