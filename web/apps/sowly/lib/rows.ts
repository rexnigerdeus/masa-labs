/**
 * Frontière base ↔ TypeScript.
 *
 * Seul endroit où `snake_case` et `camelCase` se rencontrent : chaque table
 * a sa liste de colonnes lues (jamais `select('*')`), sa conversion vers la
 * ligne envoyée et sa conversion depuis la ligne reçue.
 *
 * Les lignes envoyées ne portent ni `user_id`, ni `created_at`, ni
 * `updated_at` : la base les pose elle-même (`default auth.uid()`,
 * `default now()`, trigger). C'est ce qui permet à des données saisies
 * avant toute inscription de partir telles quelles le jour où un compte
 * est créé.
 */

import { isDay } from './dates.ts';
import {
  checkKey, type Change, type Check, type Habit, type Moment, type Profile,
  type Table, type Task, type TaskList,
} from './model.ts';

export const COLUMNS: Record<Table, string> = {
  sowly_profiles: 'identities, committed_at, onboarded_at, updated_at',
  sowly_habits:
    'id, action, moment, cue, place, identity, why, days, start_day, position, '
    + 'archived_at, deleted_at, updated_at',
  sowly_habit_checks: 'habit_id, day, deleted_at, updated_at',
  sowly_task_lists: 'id, name, position, deleted_at, updated_at',
  sowly_tasks:
    'id, list_id, title, due_day, my_day, done_at, position, deleted_at, updated_at',
};

/** Clé d'`upsert` de chaque table, pour `onConflict`. */
export const CONFLICT_KEY: Record<Table, string> = {
  sowly_profiles: 'user_id',
  sowly_habits: 'id',
  sowly_habit_checks: 'habit_id,day',
  sowly_task_lists: 'id',
  sowly_tasks: 'id',
};

// ---------------------------------------------------------------------------
// Vers la base

/** Le profil n'a qu'une ligne par compte : sa clé est fixe. */
export const PROFILE_KEY = 'profile';

export function profileChange(p: Profile): Change {
  return {
    table: 'sowly_profiles',
    key: PROFILE_KEY,
    row: {
      identities: p.identities,
      committed_at: p.committedAt,
      onboarded_at: p.onboardedAt,
    },
  };
}

export function habitChange(h: Habit): Change {
  return {
    table: 'sowly_habits',
    key: h.id,
    row: {
      id: h.id,
      action: h.action,
      moment: h.moment,
      cue: h.cue,
      place: h.place,
      identity: h.identity,
      why: h.why,
      days: h.days,
      start_day: h.startDay,
      position: h.position,
      archived_at: h.archivedAt,
      deleted_at: h.deletedAt,
    },
  };
}

export function checkChange(c: Check): Change {
  return {
    table: 'sowly_habit_checks',
    key: checkKey(c.habitId, c.day),
    row: { habit_id: c.habitId, day: c.day, deleted_at: c.deletedAt },
  };
}

export function listChange(l: TaskList): Change {
  return {
    table: 'sowly_task_lists',
    key: l.id,
    row: { id: l.id, name: l.name, position: l.position, deleted_at: l.deletedAt },
  };
}

export function taskChange(t: Task): Change {
  return {
    table: 'sowly_tasks',
    key: t.id,
    row: {
      id: t.id,
      list_id: t.listId,
      title: t.title,
      due_day: t.dueDay,
      my_day: t.myDay,
      done_at: t.doneAt,
      position: t.position,
      deleted_at: t.deletedAt,
    },
  };
}

// ---------------------------------------------------------------------------
// Depuis la base (et depuis un `localStorage` d'une version précédente :
// mêmes garde-fous, une donnée malformée est ignorée plutôt que de casser
// l'écran).

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const dayOrNull = (v: unknown): string | null => (isDay(v) ? v : null);

const MOMENT_IDS: readonly string[] = ['matin', 'journee', 'soir'];

export function profileFromRow(r: Row): Profile {
  return {
    identities: Array.isArray(r.identities)
      ? r.identities.filter((i): i is string => typeof i === 'string')
      : [],
    committedAt: strOrNull(r.committed_at),
    onboardedAt: strOrNull(r.onboarded_at),
  };
}

export function habitFromRow(r: Row): Habit | null {
  if (typeof r.id !== 'string' || typeof r.action !== 'string' || !isDay(r.start_day)) {
    return null;
  }
  const days = Array.isArray(r.days)
    ? r.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6)
    : [];
  return {
    id: r.id,
    action: r.action,
    moment: (MOMENT_IDS.includes(str(r.moment)) ? r.moment : 'journee') as Moment,
    cue: str(r.cue),
    place: str(r.place),
    identity: strOrNull(r.identity),
    why: str(r.why),
    days: days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6],
    startDay: r.start_day,
    position: num(r.position),
    archivedAt: strOrNull(r.archived_at),
    deletedAt: strOrNull(r.deleted_at),
  };
}

export function checkFromRow(r: Row): Check | null {
  if (typeof r.habit_id !== 'string' || !isDay(r.day)) return null;
  return { habitId: r.habit_id, day: r.day, deletedAt: strOrNull(r.deleted_at) };
}

export function listFromRow(r: Row): TaskList | null {
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  return {
    id: r.id,
    name: r.name,
    position: num(r.position),
    deletedAt: strOrNull(r.deleted_at),
  };
}

export function taskFromRow(r: Row): Task | null {
  if (typeof r.id !== 'string' || typeof r.title !== 'string') return null;
  return {
    id: r.id,
    listId: strOrNull(r.list_id),
    title: r.title,
    dueDay: dayOrNull(r.due_day),
    myDay: dayOrNull(r.my_day),
    doneAt: strOrNull(r.done_at),
    position: num(r.position),
    deletedAt: strOrNull(r.deleted_at),
  };
}
