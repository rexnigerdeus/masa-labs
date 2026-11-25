/**
 * Heures locales, à la minute : « 18:30 » (heure) et « 2026-11-25T18:30 »
 * (jour et heure). Comme les jours (`lib/dates.ts`), elles voyagent telles
 * quelles, sans fuseau : un rappel de 18:30 sonne à 18:30 là où l'on est.
 */

import { addDays, dayOf, formatRelative, isDay, type Day } from './dates.ts';

export type Stamp = string;

export function isTime(v: unknown): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

export function isStamp(v: unknown): v is Stamp {
  return typeof v === 'string' && v.length === 16 && v[10] === 'T' && isDay(v.slice(0, 10)) && isTime(v.slice(11));
}

/** L'instant présent, à l'heure de l'appareil. */
export function stampOf(date: Date = new Date()): Stamp {
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${dayOf(date)}T${two(date.getHours())}:${two(date.getMinutes())}`;
}

export const stampDay = (s: Stamp): Day => s.slice(0, 10);
export const stampTime = (s: Stamp): string => s.slice(11, 16);

/** Arithmétique en UTC sur la chaîne, comme `addDays` : pas d'heure d'été. */
export function addMinutes(s: Stamp, n: number): Stamp {
  return new Date(Date.parse(`${s}:00Z`) + n * 60_000).toISOString().slice(0, 16);
}

/** Prochaine heure pile : le choix par défaut d'un rappel. */
export function nextHour(s: Stamp): Stamp {
  return `${addMinutes(s, 60).slice(0, 14)}00`;
}

/** « 18:30 » aujourd'hui, sinon « Demain · 18:30 ». */
export function formatStamp(s: Stamp, today: Day): string {
  return stampDay(s) === today ? stampTime(s) : `${formatRelative(stampDay(s), today)} · ${stampTime(s)}`;
}

export interface Shortcut { label: string; at: Stamp }

/** Raccourcis proposés pour un rappel, selon l'heure qu'il est. */
export function shortcuts(now: Stamp): Shortcut[] {
  const today = stampDay(now);
  const out: Shortcut[] = [{ label: 'Dans 1 h', at: addMinutes(now, 60) }];
  if (stampTime(now) < '17:00') out.push({ label: 'Ce soir 18 h', at: `${today}T18:00` });
  out.push({ label: 'Demain 8 h', at: `${addDays(today, 1)}T08:00` });
  return out;
}
