'use client';

import { useEffect, useState } from 'react';
import type { CvDate } from '@everyday/cv-core';

/** Champs de formulaire partagés par les sections de l'éditeur. */

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm '
  + 'placeholder:text-muted/60 focus:border-accent focus:outline-none';

export function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint !== undefined ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel';
}) {
  return (
    <input
      className={inputClass}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (value: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      className={inputClass}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Button({ children, onClick, variant = 'outline', type = 'button' }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
  type?: 'button' | 'submit';
}) {
  // Boutons pleins verts pour l'action principale, contour vert pour les
  // actions secondaires (« Ajouter une expérience ») — brief §7.
  const styles = {
    solid: 'bg-accent text-white hover:bg-accent-dark',
    outline: 'border border-accent text-accent-dark hover:bg-accent-soft',
    ghost: 'text-muted hover:text-ink',
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${styles}`}
    >
      {children}
    </button>
  );
}

/**
 * Saisie d'une date de CV : mois optionnel.
 *
 * Le mois est facultatif à dessein — beaucoup de candidats ne s'en souviennent
 * pas — mais le critère « Cohérence » vérifie qu'on ne mélange pas les deux
 * formats d'une expérience à l'autre.
 */
export function DateInput({ value, onChange, label }: {
  value: CvDate | null; onChange: (value: CvDate | null) => void; label: string;
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
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex gap-2">
        <select
          className={inputClass}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label={`${label} — mois`}
          disabled={value === null}
        >
          <option value="">Mois (facultatif)</option>
          {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet',
            'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
        </select>
        <input
          className={inputClass}
          type="number"
          inputMode="numeric"
          min={1950}
          max={2100}
          placeholder="Année"
          aria-label={`${label} — année`}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </div>
    </fieldset>
  );
}

/**
 * Liste de lignes de texte (puces d'expérience, détails de formation).
 * Une ligne vide en fin de liste sert de champ de saisie du suivant.
 */
export function LineList({ items, onChange, placeholder, addLabel }: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <TextArea
            value={item}
            rows={2}
            placeholder={placeholder}
            onChange={(v) => onChange(items.map((old, j) => (j === i ? v : old)))}
          />
          <Button
            variant="ghost"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            Retirer
          </Button>
        </div>
      ))}
      <div>
        <Button onClick={() => onChange([...items, ''])}>{addLabel}</Button>
      </div>
    </div>
  );
}

/** Découpe une saisie libre en mots-clés exploitables. */
function parseTags(text: string): string[] {
  return text.split(',').map((s) => s.trim()).filter((s) => s !== '');
}

/**
 * Liste de mots-clés (compétences), séparés par des virgules.
 *
 * Le texte saisi est un état local, et non `items.join(', ')` recalculé à
 * chaque rendu. La version pilotée par la liste était inutilisable : taper une
 * virgule produisait une entrée vide, aussitôt filtrée, donc la virgule
 * disparaissait sous les doigts et on ne pouvait jamais saisir la deuxième
 * compétence. Ici la frappe reste intacte, et seule la liste dérivée est
 * nettoyée.
 */
export function TagInput({ items, onChange, placeholder }: {
  items: string[]; onChange: (items: string[]) => void; placeholder: string;
}) {
  const [text, setText] = useState(() => items.join(', '));

  // Resynchronisation quand la liste change par une autre voie que la frappe
  // (chargement d'un brouillon, import LinkedIn). La comparaison sur la liste
  // dérivée évite d'écraser une saisie en cours, virgule finale comprise.
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

  return (
    <div className="flex flex-col gap-2">
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
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-header"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
