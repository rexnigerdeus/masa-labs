/**
 * Lectures dérivées de l'état : ce que chaque écran affiche.
 *
 * Fonctions pures, appelées dans un `useMemo` à chaque changement d'état.
 * Rien de ce qui sort d'ici n'est stocké (patterns architecturaux §5).
 */

import { weekday, type Day } from './dates.ts';
import { identityById } from './identities.ts';
import { MOMENTS, type Check, type Data, type Habit, type Task } from './model.ts';
import { computeStreak, type Streak } from './streak.ts';

const MOMENT_ORDER = { matin: 0, journee: 1, soir: 2 } as const;

function byPosition(a: { position: number }, b: { position: number }): number {
  return a.position - b.position;
}

// ---------------------------------------------------------------------------
// Habitudes

export function activeHabits(data: Data): Habit[] {
  return Object.values(data.habits)
    .filter((h) => h.deletedAt === null && h.archivedAt === null)
    .sort((a, b) => MOMENT_ORDER[a.moment] - MOMENT_ORDER[b.moment] || byPosition(a, b));
}

export function archivedHabits(data: Data): Habit[] {
  return Object.values(data.habits)
    .filter((h) => h.deletedAt === null && h.archivedAt !== null)
    .sort(byPosition);
}

export function isScheduled(habit: Habit, day: Day): boolean {
  return habit.startDay <= day && habit.days.includes(weekday(day));
}

/** Habitudes prévues un jour donné. */
export function habitsForDay(data: Data, day: Day): Habit[] {
  return activeHabits(data).filter((h) => isScheduled(h, day));
}

/** Jours validés d'une habitude. */
export function checkedDays(data: Data, habitId: string): Set<Day> {
  const days = new Set<Day>();
  for (const c of Object.values(data.checks)) {
    if (c.habitId === habitId && c.deletedAt === null) days.add(c.day);
  }
  return days;
}

/**
 * Jours validés de toutes les habitudes, en une passe. L'écran Aujourd'hui en
 * a besoin pour chaque ligne : parcourir les validations une fois par
 * habitude coûterait habitudes × validations à chaque rendu.
 */
export function checkIndex(checks: Record<string, Check>): Map<string, Set<Day>> {
  const index = new Map<string, Set<Day>>();
  for (const c of Object.values(checks)) {
    if (c.deletedAt !== null) continue;
    let set = index.get(c.habitId);
    if (set === undefined) index.set(c.habitId, (set = new Set()));
    set.add(c.day);
  }
  return index;
}

export interface HabitLine {
  habit: Habit;
  done: boolean;
  streak: Streak;
}

export interface HabitGroup {
  id: string;
  label: string;
  lines: HabitLine[];
}

export type GroupBy = 'moment' | 'identity';

export interface TodayHabits {
  groups: HabitGroup[];
  done: number;
  total: number;
}

export function todayHabits(data: Data, today: Day, groupBy: GroupBy): TodayHabits {
  const index = checkIndex(data.checks);
  const lines: HabitLine[] = habitsForDay(data, today).map((habit) => {
    const days = index.get(habit.id) ?? new Set<Day>();
    return { habit, done: days.has(today), streak: computeStreak(habit, days, today) };
  });

  const groups: HabitGroup[] = groupBy === 'moment'
    ? MOMENTS.map((m) => ({
      id: m.id,
      label: m.label,
      lines: lines.filter((l) => l.habit.moment === m.id),
    }))
    : groupByIdentity(lines, data.profile.identities);

  return {
    groups: groups.filter((g) => g.lines.length > 0),
    done: lines.filter((l) => l.done).length,
    total: lines.length,
  };
}

/** Dans l'ordre des identités choisies, puis « Autres » pour le reste. */
function groupByIdentity(lines: HabitLine[], order: string[]): HabitGroup[] {
  const ids = [...order];
  for (const l of lines) {
    if (l.habit.identity !== null && !ids.includes(l.habit.identity)) ids.push(l.habit.identity);
  }
  const groups: HabitGroup[] = ids.map((id) => ({
    id,
    label: identityById(id)?.short ?? 'Autres',
    lines: lines.filter((l) => l.habit.identity === id),
  }));
  groups.push({
    id: 'autres',
    label: 'Autres',
    lines: lines.filter((l) => l.habit.identity === null || identityById(l.habit.identity) === null),
  });
  // Une identité retirée du catalogue tombe dans « Autres » ; on évite de
  // l'afficher deux fois.
  return groups.filter((g) => g.id === 'autres' || identityById(g.id) !== null);
}

// ---------------------------------------------------------------------------
// Tâches

const liveTasks = (data: Data): Task[] => Object.values(data.tasks).filter((t) => t.deletedAt === null);

/** Non faites d'abord (ordre choisi), faites ensuite (les plus récentes en haut). */
export function sortTasks(tasks: Task[]): Task[] {
  const todo = tasks.filter((t) => t.doneAt === null).sort(byPosition);
  const done = tasks.filter((t) => t.doneAt !== null)
    .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));
  return [...todo, ...done];
}

/**
 * « Ma journée » : ce que l'utilisateur a choisi pour aujourd'hui. Une tâche
 * terminée aujourd'hui y reste, barrée, jusqu'à demain — voir ce qu'on a
 * fait compte autant que ce qui reste.
 */
export function myDayTasks(data: Data, today: Day): Task[] {
  return sortTasks(liveTasks(data).filter((t) => t.myDay === today));
}

/** Tâches mises dans « Ma journée » un jour passé et pas encore faites. */
export function leftoverTasks(data: Data, today: Day): Task[] {
  return liveTasks(data)
    .filter((t) => t.doneAt === null && t.myDay !== null && t.myDay < today)
    .sort(byPosition);
}

export function tasksOfList(data: Data, listId: string | null): Task[] {
  return sortTasks(liveTasks(data).filter((t) => t.listId === listId));
}

export function plannedTasks(data: Data, today: Day): Task[] {
  return liveTasks(data)
    .filter((t) => t.doneAt === null && ((t.myDay !== null && t.myDay > today) || t.dueDay !== null))
    .sort((a, b) => (a.dueDay ?? a.myDay ?? '').localeCompare(b.dueDay ?? b.myDay ?? ''));
}

export function isOverdue(task: Task, today: Day): boolean {
  return task.doneAt === null && task.dueDay !== null && task.dueDay < today;
}

export function liveLists(data: Data) {
  return Object.values(data.lists).filter((l) => l.deletedAt === null).sort(byPosition);
}

export function countOpen(data: Data, listId: string | null): number {
  return liveTasks(data).filter((t) => t.listId === listId && t.doneAt === null).length;
}
