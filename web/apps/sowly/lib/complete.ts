'use client';

/**
 * Valider une habitude, terminer une tâche — avec leur récompense.
 *
 * Un seul chemin pour la ligne, le glissement et l'éditeur : le geste
 * enregistre, puis, s'il vient d'aboutir (et pas d'être annulé), déclenche
 * vibration, son et gerbe. Quand c'est le dernier élément du bloc — toutes
 * les habitudes du jour, ou toute « Ma journée » —, la récompense passe un
 * cran au-dessus. Annuler reste silencieux : on ne fête pas un retour en
 * arrière, et on ne le punit pas non plus.
 *
 * À appeler dans le gestionnaire du toucher : iOS n'accorde le retour
 * haptique et le son qu'à un geste.
 */

import { burst } from './burst.ts';
import type { Day } from './dates.ts';
import { reward } from './feedback.ts';
import type { Task } from './model.ts';
import { toggleCheck, toggleTask } from './mutations.ts';
import { habitsForDay, myDayTasks } from './selectors.ts';
import { commit, getState, nowIso } from './store.ts';

export function completeTask(task: Task, today: Day, origin: Element | null): void {
  const wasDone = task.doneAt !== null;
  commit((d) => toggleTask(d, task.id, nowIso()));
  if (wasDone) return;

  const myDay = task.myDay === today ? myDayTasks(getState().data, today) : [];
  const dayDone = myDay.length > 1 && myDay.every((t) => t.doneAt !== null);
  reward(dayDone ? 'complete' : 'task');
  burst(origin, dayDone ? { count: 22, spread: 1.7 } : undefined);
}

export function completeHabit(habitId: string, done: boolean, today: Day, origin: Element | null): void {
  commit((d) => toggleCheck(d, habitId, today, today, nowIso()));
  if (done) return;

  const data = getState().data;
  const checked = new Set(
    Object.values(data.checks).filter((c) => c.day === today && c.deletedAt === null).map((c) => c.habitId),
  );
  const planned = habitsForDay(data, today);
  const dayDone = planned.length > 1 && planned.every((h) => checked.has(h.id));
  reward(dayDone ? 'complete' : 'habit');
  burst(origin, dayDone ? { count: 22, spread: 1.7 } : { count: 10 });
}
