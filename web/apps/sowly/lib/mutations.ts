/**
 * Toutes les écritures de l'application, en fonctions pures.
 *
 * Chacune prend l'état et renvoie le nouvel état **et** la liste des lignes
 * à envoyer au serveur. Les deux sortent du même calcul : impossible
 * d'afficher une modification qui ne partirait pas, ou d'envoyer une ligne
 * qu'on n'affiche pas. Le store (`lib/store.ts`) ne fait qu'appliquer le
 * résultat ; ici, rien ne touche au navigateur, d'où les tests sous
 * `node --test`.
 *
 * `now` (horodatage ISO) est passé en argument plutôt que lu : les tests
 * fixent l'heure, et une même action pose le même instant partout.
 */

import { addDays, type Day } from './dates.ts';
import {
  checkKey, type Change, type Data, type Habit, type Moment, type Task, type TaskList,
} from './model.ts';
import { checkChange, habitChange, listChange, profileChange, taskChange } from './rows.ts';

export interface Result {
  data: Data;
  changes: Change[];
}

const live = <T extends { deletedAt: string | null }>(r: Record<string, T>): T[] =>
  Object.values(r).filter((x) => x.deletedAt === null);

function nextPosition(items: Array<{ position: number }>): number {
  return items.reduce((max, i) => Math.max(max, i.position + 1), 0);
}

// ---------------------------------------------------------------------------
// Profil et onboarding

export interface HabitDraft {
  action: string;
  moment: Moment;
  cue: string;
  place: string;
  identity: string | null;
  why: string;
  days: number[];
}

export interface Onboarding {
  identities: string[];
  habit: HabitDraft;
  tasks: string[];
}

/**
 * Fin de l'onboarding : identités, première habitude, contrat signé, premières
 * tâches. Une seule écriture, pour qu'un onboarding interrompu ne laisse
 * jamais une moitié de compte.
 */
export function completeOnboarding(
  data: Data, input: Onboarding, ids: () => string, now: string, today: Day,
): Result {
  const profile = {
    identities: input.identities,
    committedAt: now,
    onboardedAt: now,
  };
  const habitResult = createHabit({ ...data, profile }, input.habit, ids(), today);
  let result: Result = {
    data: habitResult.data,
    changes: [profileChange(profile), ...habitResult.changes],
  };
  for (const title of input.tasks) {
    const r = createTask(result.data, { title, listId: null, myDay: today, dueDay: null }, ids());
    result = { data: r.data, changes: [...result.changes, ...r.changes] };
  }
  return result;
}

export function setIdentities(data: Data, identities: string[]): Result {
  const profile = { ...data.profile, identities };
  return { data: { ...data, profile }, changes: [profileChange(profile)] };
}

// ---------------------------------------------------------------------------
// Habitudes

export function createHabit(data: Data, draft: HabitDraft, id: string, today: Day): Result {
  const habit: Habit = {
    id,
    ...cleanDraft(draft),
    startDay: today,
    position: nextPosition(live(data.habits)),
    archivedAt: null,
    deletedAt: null,
  };
  return {
    data: { ...data, habits: { ...data.habits, [id]: habit } },
    changes: [habitChange(habit)],
  };
}

export function updateHabit(data: Data, id: string, draft: HabitDraft): Result {
  const current = data.habits[id];
  if (current === undefined) return { data, changes: [] };
  const habit: Habit = { ...current, ...cleanDraft(draft) };
  return {
    data: { ...data, habits: { ...data.habits, [id]: habit } },
    changes: [habitChange(habit)],
  };
}

function patchHabit(data: Data, id: string, patch: Partial<Habit>): Result {
  const current = data.habits[id];
  if (current === undefined) return { data, changes: [] };
  const habit: Habit = { ...current, ...patch };
  return {
    data: { ...data, habits: { ...data.habits, [id]: habit } },
    changes: [habitChange(habit)],
  };
}

/** Archiver retire l'habitude d'Aujourd'hui sans rien effacer de son historique. */
export function setHabitArchived(data: Data, id: string, archived: boolean, now: string): Result {
  return patchHabit(data, id, { archivedAt: archived ? now : null });
}

export function deleteHabit(data: Data, id: string, now: string): Result {
  return patchHabit(data, id, { deletedAt: now });
}

/** Valide ou dévalide un jour. Un jour futur ne se valide pas. */
export function toggleCheck(data: Data, habitId: string, day: Day, today: Day, now: string): Result {
  if (day > today || data.habits[habitId] === undefined) return { data, changes: [] };
  const key = checkKey(habitId, day);
  const current = data.checks[key];
  const checked = current !== undefined && current.deletedAt === null;
  const check = { habitId, day, deletedAt: checked ? now : null };
  return {
    data: { ...data, checks: { ...data.checks, [key]: check } },
    changes: [checkChange(check)],
  };
}

function cleanDraft(d: HabitDraft): HabitDraft {
  const days = [...new Set(d.days.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))]
    .sort((a, b) => a - b);
  return {
    action: d.action.trim().slice(0, 80),
    moment: d.moment,
    cue: d.cue.trim().slice(0, 60),
    place: d.place.trim().slice(0, 60),
    identity: d.identity,
    why: d.why.trim().slice(0, 280),
    days: days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6],
  };
}

// ---------------------------------------------------------------------------
// Tâches

export interface TaskDraft {
  title: string;
  listId: string | null;
  myDay: Day | null;
  dueDay: Day | null;
}

export function createTask(data: Data, draft: TaskDraft, id: string): Result {
  const title = draft.title.trim().slice(0, 200);
  if (title === '') return { data, changes: [] };
  const siblings = live(data.tasks).filter((t) => t.listId === draft.listId);
  const task: Task = {
    id,
    listId: draft.listId,
    title,
    dueDay: draft.dueDay,
    myDay: draft.myDay,
    doneAt: null,
    position: nextPosition(siblings),
    deletedAt: null,
  };
  return {
    data: { ...data, tasks: { ...data.tasks, [id]: task } },
    changes: [taskChange(task)],
  };
}

export function patchTask(data: Data, id: string, patch: Partial<Omit<Task, 'id'>>): Result {
  const current = data.tasks[id];
  if (current === undefined) return { data, changes: [] };
  const task: Task = { ...current, ...patch };
  if (patch.title !== undefined) {
    task.title = patch.title.trim().slice(0, 200);
    if (task.title === '') return { data, changes: [] };
  }
  return {
    data: { ...data, tasks: { ...data.tasks, [id]: task } },
    changes: [taskChange(task)],
  };
}

export function toggleTask(data: Data, id: string, now: string): Result {
  const current = data.tasks[id];
  if (current === undefined) return { data, changes: [] };
  return patchTask(data, id, { doneAt: current.doneAt === null ? now : null });
}

export function toggleMyDay(data: Data, id: string, today: Day): Result {
  const current = data.tasks[id];
  if (current === undefined) return { data, changes: [] };
  return patchTask(data, id, { myDay: current.myDay === today ? null : today });
}

/**
 * Reporter à demain (brief §9) : la tâche quitte « Ma journée » pour y
 * revenir d'elle-même demain. Rien n'est supprimé, rien n'est marqué en retard.
 */
export function postponeTask(data: Data, id: string, today: Day): Result {
  return patchTask(data, id, { myDay: addDays(today, 1) });
}

/** Ramène dans « Ma journée » les tâches non faites des jours précédents. */
export function bringBack(data: Data, ids: string[], today: Day): Result {
  let result: Result = { data, changes: [] };
  for (const id of ids) {
    const r = patchTask(result.data, id, { myDay: today });
    result = { data: r.data, changes: [...result.changes, ...r.changes] };
  }
  return result;
}

export function deleteTask(data: Data, id: string, now: string): Result {
  return patchTask(data, id, { deletedAt: now });
}

/** Nouvel ordre d'une liste : seules les positions qui changent partent au serveur. */
export function reorderTasks(data: Data, orderedIds: string[]): Result {
  let result: Result = { data, changes: [] };
  orderedIds.forEach((id, position) => {
    if (result.data.tasks[id]?.position === position) return;
    const r = patchTask(result.data, id, { position });
    result = { data: r.data, changes: [...result.changes, ...r.changes] };
  });
  return result;
}

// ---------------------------------------------------------------------------
// Listes

export function createList(data: Data, name: string, id: string): Result {
  const clean = name.trim().slice(0, 60);
  if (clean === '') return { data, changes: [] };
  const list: TaskList = {
    id, name: clean, position: nextPosition(live(data.lists)), deletedAt: null,
  };
  return {
    data: { ...data, lists: { ...data.lists, [id]: list } },
    changes: [listChange(list)],
  };
}

export function renameList(data: Data, id: string, name: string): Result {
  const current = data.lists[id];
  const clean = name.trim().slice(0, 60);
  if (current === undefined || clean === '') return { data, changes: [] };
  const list = { ...current, name: clean };
  return {
    data: { ...data, lists: { ...data.lists, [id]: list } },
    changes: [listChange(list)],
  };
}

/** Supprimer une liste supprime ses tâches, comme dans To Do. */
export function deleteList(data: Data, id: string, now: string): Result {
  const current = data.lists[id];
  if (current === undefined) return { data, changes: [] };
  const list = { ...current, deletedAt: now };
  let result: Result = {
    data: { ...data, lists: { ...data.lists, [id]: list } },
    changes: [listChange(list)],
  };
  for (const task of live(data.tasks).filter((t) => t.listId === id)) {
    const r = deleteTask(result.data, task.id, now);
    result = { data: r.data, changes: [...result.changes, ...r.changes] };
  }
  return result;
}
