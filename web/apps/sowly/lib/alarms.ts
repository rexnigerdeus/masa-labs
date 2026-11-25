/**
 * Quelles alarmes sonnent maintenant — fonction pure, testée. L'affichage
 * plein écran est dans `components/alarm/AlarmHost.tsx`.
 *
 * Une alarme sonne dans l'heure qui suit son heure : ouvrir Sowly un peu
 * tard montre encore ce qu'on a manqué, l'ouvrir le soir ne ressort pas
 * tous les rappels de la journée.
 */

import { addDays } from './dates.ts';
import { addMinutes, stampDay, type Stamp } from './clock.ts';
import { checkKey, type Data } from './model.ts';
import { isScheduled } from './selectors.ts';

export const RING_MINUTES = 60;

export interface Alarm {
  kind: 'task' | 'habit' | 'prayer';
  /** Tâche, habitude, ou heure de prière (« 18 »). */
  id: string;
  at: Stamp;
}

export const alarmKey = (a: Alarm): string => `${a.kind}:${a.id}@${a.at}`;

export function isHabitDone(data: Data, id: string, day: string): boolean {
  const c = data.checks[checkKey(id, day)];
  return c !== undefined && c.deletedAt === null;
}

/** Encore à faire ? Une tâche faite ou une habitude validée ne sonne pas. */
export function isPending(data: Data, a: Pick<Alarm, 'kind' | 'id'>, day: string): boolean {
  if (a.kind === 'prayer') return data.profile.prayerHours.includes(Number(a.id));
  if (a.kind === 'task') {
    const t = data.tasks[a.id];
    return t !== undefined && t.deletedAt === null && t.doneAt === null;
  }
  const h = data.habits[a.id];
  return h !== undefined && h.deletedAt === null && h.archivedAt === null && !isHabitDone(data, a.id, day);
}

export function dueAlarms(data: Data, now: Stamp, dismissed: ReadonlySet<string>): Alarm[] {
  const from = addMinutes(now, -RING_MINUTES);
  const out: Alarm[] = [];
  const add = (a: Alarm): void => {
    if (a.at <= now && a.at > from && !dismissed.has(alarmKey(a)) && isPending(data, a, stampDay(a.at))) out.push(a);
  };

  for (const t of Object.values(data.tasks)) {
    if (t.remindAt !== null) add({ kind: 'task', id: t.id, at: t.remindAt });
  }
  const today = stampDay(now);
  for (const h of Object.values(data.habits)) {
    if (h.snoozeAt !== null) add({ kind: 'habit', id: h.id, at: h.snoozeAt });
    if (h.remindTime === null) continue;
    // Hier aussi : un rappel de 23:58 sonne encore à 00:05.
    for (const day of [today, addDays(today, -1)]) {
      if (isScheduled(h, day)) add({ kind: 'habit', id: h.id, at: `${day}T${h.remindTime}` });
    }
  }
  for (const hour of data.profile.prayerHours) {
    for (const day of [today, addDays(today, -1)]) {
      add({ kind: 'prayer', id: String(hour), at: `${day}T${String(hour).padStart(2, '0')}:00` });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
