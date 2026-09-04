import type { CvDate } from './types.ts';

const MONTHS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

/**
 * Rend une date de CV.
 *
 * Format volontairement textuel (« mars 2024 ») plutôt que numérique : les
 * parseurs ATS lisent mieux un mois écrit qu'un « 03/2024 » qu'ils peuvent
 * confondre avec un jour. Sans mois, l'année seule.
 */
export function formatDate(date: CvDate | null): string {
  if (date === null) return '';
  if (date.month == null) return String(date.year);
  const name = MONTHS[date.month - 1];
  return name === undefined ? String(date.year) : `${name} ${date.year}`;
}

/** Plage de dates d'une entrée. « Depuis » plutôt qu'une flèche ou un tiret nu. */
export function formatRange(
  start: CvDate | null,
  end: CvDate | null,
  current: boolean,
): string {
  const from = formatDate(start);
  if (current) return from === '' ? "Poste actuel" : `${from} – aujourd'hui`;
  const to = formatDate(end);
  if (from === '' && to === '') return '';
  if (from === '') return to;
  if (to === '') return from;
  return `${from} – ${to}`;
}

/** Ordre antichronologique : l'expérience la plus récente en premier. */
export function compareByRecency(
  a: { start: CvDate | null; current: boolean },
  b: { start: CvDate | null; current: boolean },
): number {
  if (a.current !== b.current) return a.current ? -1 : 1;
  const key = (d: CvDate | null): number => (d === null ? -1 : d.year * 12 + (d.month ?? 0));
  return key(b.start) - key(a.start);
}
