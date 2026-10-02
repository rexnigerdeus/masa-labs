/**
 * Modèle de données de Sowly, côté client.
 *
 * Plat et sérialisable : c'est exactement ce qui est écrit dans
 * `localStorage`, qui est la source de vérité du quotidien (voir
 * `lib/store.ts`). Les champs reprennent les colonnes de la migration
 * `20261002100100_sowly_lot1.sql`, en camelCase ; la conversion vit dans un
 * seul endroit, `lib/rows.ts`.
 *
 * Rien de dérivé n'est stocké ici : ni série, ni progression du jour. Tout
 * se recalcule depuis les validations (`lib/streak.ts`, `lib/selectors.ts`).
 */

import type { Day } from './dates.ts';

/** Regroupement de l'écran Aujourd'hui (brief §3.1). */
export type Moment = 'matin' | 'journee' | 'soir';

export const MOMENTS: ReadonlyArray<{ id: Moment; label: string }> = [
  { id: 'matin', label: 'Matin' },
  { id: 'journee', label: 'Journée' },
  { id: 'soir', label: 'Soir' },
];

export interface Profile {
  identities: string[];
  committedAt: string | null;
  onboardedAt: string | null;
}

/**
 * Une habitude, au format « Je veux [action] [quand] [où] » (brief §8.A.3).
 * `cue` et `place` sont libres et facultatifs ; `moment` range l'habitude
 * dans un bloc de la journée.
 */
export interface Habit {
  id: string;
  action: string;
  moment: Moment;
  cue: string;
  place: string;
  identity: string | null;
  why: string;
  /** 0 = dimanche … 6 = samedi. */
  days: number[];
  startDay: Day;
  position: number;
  archivedAt: string | null;
  deletedAt: string | null;
}

/** Un jour validé. Dévalider pose `deletedAt`, pour que l'effacement se synchronise. */
export interface Check {
  habitId: string;
  day: Day;
  deletedAt: string | null;
}

export interface TaskList {
  id: string;
  name: string;
  position: number;
  deletedAt: string | null;
}

export interface Task {
  id: string;
  /** `null` = liste par défaut « Tâches », qui n'a pas de ligne en base. */
  listId: string | null;
  title: string;
  dueDay: Day | null;
  /** Jour où la tâche a été mise dans « Ma journée ». */
  myDay: Day | null;
  doneAt: string | null;
  position: number;
  deletedAt: string | null;
}

export interface Data {
  profile: Profile;
  habits: Record<string, Habit>;
  /** Clé : `checkKey(habitId, day)`. */
  checks: Record<string, Check>;
  lists: Record<string, TaskList>;
  tasks: Record<string, Task>;
}

export function checkKey(habitId: string, day: Day): string {
  return `${habitId}|${day}`;
}

export function emptyData(): Data {
  return {
    profile: { identities: [], committedAt: null, onboardedAt: null },
    habits: {},
    checks: {},
    lists: {},
    tasks: {},
  };
}

/** Tables synchronisées, dans l'ordre d'envoi : un parent part avant ses enfants. */
export const TABLES = [
  'sowly_profiles',
  'sowly_habits',
  'sowly_task_lists',
  'sowly_tasks',
  'sowly_habit_checks',
] as const;

export type Table = (typeof TABLES)[number];

/**
 * Une écriture en attente d'envoi. La ligne est déjà au format de la base :
 * l'envoi n'a plus rien à convertir, et une écriture faite hors-ligne il y a
 * trois jours part telle qu'elle était.
 */
export interface Change {
  table: Table;
  key: string;
  row: Record<string, unknown>;
}
