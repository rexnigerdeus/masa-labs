/**
 * Logique des rappels Sowly, sans dépendance à Deno ni à Supabase : quel
 * rappel envoyer à quel appareil, et avec quel texte. Testée avec Node
 * (web/apps/sowly/test/push.test.ts) ; `index.ts` ne fait que lire la base
 * et envoyer.
 */

export type Slot = 'morning' | 'evening';

export interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  time_zone: string;
  morning_enabled: boolean;
  morning_at: string; // « 08:00:00 »
  evening_enabled: boolean;
  evening_at: string;
  last_morning_day: string | null;
  last_evening_day: string | null;
}

export interface HabitRow {
  id: string;
  action: string;
  days: number[];
  start_day: string;
}

export interface TaskRow {
  title: string;
  due_day: string | null;
  my_day: string | null;
}

/** Fenêtre d'envoi après l'heure choisie : le cron passe toutes les 15 min. */
export const WINDOW_MINUTES = 60;

/** Jour (AAAA-MM-JJ) et minute du jour, à l'heure locale du fuseau. */
export function localNow(now: Date, timeZone: string): { day: string; minutes: number; weekday: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
    }).formatToParts(now);
  } catch {
    return localNow(now, 'Africa/Abidjan');
  }
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  const day = `${get('year')}-${get('month')}-${get('day')}`;
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes, weekday };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Le créneau à envoyer maintenant pour cet appareil, s'il y en a un :
 * activé, heure passée depuis moins d'une heure, pas déjà envoyé ce jour.
 */
export function dueSlot(sub: Subscription, now: Date): { slot: Slot; day: string; weekday: number } | null {
  const { day, minutes, weekday } = localNow(now, sub.time_zone);
  const slots: Array<[Slot, boolean, string, string | null]> = [
    ['evening', sub.evening_enabled, sub.evening_at, sub.last_evening_day],
    ['morning', sub.morning_enabled, sub.morning_at, sub.last_morning_day],
  ];
  for (const [slot, enabled, at, last] of slots) {
    if (!enabled || last === day) continue;
    const delta = minutes - toMinutes(at);
    if (delta >= 0 && delta < WINDOW_MINUTES) return { slot, day, weekday };
  }
  return null;
}

/** Même règle que l'app (`isScheduled`, lib/selectors.ts). */
export function scheduledHabits(habits: HabitRow[], day: string, weekday: number): HabitRow[] {
  return habits.filter((h) => h.start_day <= day && h.days.includes(weekday));
}

export interface Message {
  title: string;
  body: string;
  url: string;
  tag: string;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

function list(items: string[], max = 2): string {
  const shown = items.slice(0, max).join(', ');
  return items.length > max ? `${shown}…` : shown;
}

/**
 * Texte du rappel, ou `null` s'il n'y a rien à dire — pas de notification
 * vide, et jamais de reproche : le soir, on ne parle que de ce qu'il reste
 * à faire, et seulement s'il reste quelque chose.
 */
export function compose(slot: Slot, day: string, scheduled: HabitRow[], checkedIds: Set<string>, tasks: TaskRow[]): Message | null {
  const remaining = scheduled.filter((h) => !checkedIds.has(h.id));

  if (slot === 'evening') {
    if (remaining.length === 0) return null;
    return {
      title: remaining.length === 1 ? 'Une graine à arroser ce soir' : `${remaining.length} graines à arroser ce soir`,
      body: `${list(remaining.map((h) => h.action))}. Une minute suffit.`,
      url: '/',
      tag: `sowly-evening-${day}`,
    };
  }

  const due = tasks.filter((t) => t.due_day !== null && t.due_day <= day);
  const parts: string[] = [];
  if (remaining.length > 0) parts.push(plural(remaining.length, 'habitude', 'habitudes'));
  if (due.length > 0) parts.push(plural(due.length, 'tâche à échéance', 'tâches à échéance'));
  if (parts.length === 0) return null;
  const detail = remaining.length > 0
    ? list(remaining.map((h) => h.action))
    : list(due.map((t) => t.title));
  return {
    title: `Aujourd’hui : ${parts.join(' et ')}`,
    body: `${detail}. Belle journée !`,
    url: '/',
    tag: `sowly-morning-${day}`,
  };
}
