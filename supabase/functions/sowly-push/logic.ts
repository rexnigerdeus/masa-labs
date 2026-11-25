/**
 * Logique des rappels Sowly, sans dépendance à Deno ni à Supabase : quel
 * rappel envoyer à quel appareil, et avec quel texte. Testée avec Node
 * (web/apps/sowly/test/push.test.ts) ; `index.ts` ne fait que lire la base
 * et envoyer.
 */

import { hourLabel, verseFor } from './verses.ts';

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
  cue?: string;
  place?: string;
  why?: string;
}

export interface TaskRow {
  title: string;
  due_day: string | null;
  my_day: string | null;
}

/** Fenêtre d'envoi après l'heure choisie : un passage manqué se rattrape. */
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

/**
 * Série en cours, sans compter aujourd'hui (pas encore validé). Même règle
 * que l'app (`computeStreak`, lib/streak.ts) : seuls les jours prévus
 * l'interrompent, un jour validé hors programme compte quand même.
 */
export function currentStreak(habit: HabitRow, checked: ReadonlySet<string>, day: string): number {
  let run = 0;
  let cursor = Date.parse(`${day}T00:00:00Z`);
  for (let i = 0; i < 400; i++) {
    const d = new Date(cursor).toISOString().slice(0, 10);
    if (checked.has(d)) run++;
    else if (d !== day && habit.days.includes(new Date(cursor).getUTCDay())) break;
    cursor -= 86_400_000;
  }
  return run;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

export interface Message {
  title: string;
  body: string;
  url: string;
  tag: string;
  /** `alarm` : rappel à l'heure, avec « C'est fait » et « Dans 10 min ». */
  kind?: 'alarm' | 'digest';
}

/** Phrase choisie selon le jour : on ne lit pas la même deux jours de suite. */
function pick(options: readonly string[], day: string): string {
  const n = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return options[((n % options.length) + options.length) % options.length]!;
}

/** « la nuit · dans la chambre » */
function whenWhere(h: HabitRow): string {
  return [h.cue ?? '', h.place ?? ''].filter((x) => x !== '').join(' · ');
}

function bullets(items: string[], max: number): string {
  const rest = items.length - max;
  // Un seul élément en trop : autant l'écrire.
  if (rest <= 1) return items.join('\n');
  return [...items.slice(0, max), `… et ${rest} autres`].join('\n');
}

/**
 * Texte du rappel du matin ou du soir, ou `null` s'il n'y a rien à dire —
 * pas de notification vide. Il nomme les choses (l'habitude, son moment, sa
 * série, les tâches) au lieu de les compter, et ne reproche jamais rien :
 * le soir, on ne parle que de ce qu'il reste à faire.
 *
 * L'emoji en tête est le repère visuel : sur iPhone, c'est le seul dessin
 * qu'une notification web puisse montrer en plus de l'icône de l'app.
 */
export function compose(
  slot: Slot,
  day: string,
  scheduled: HabitRow[],
  checkedIds: Set<string>,
  tasks: TaskRow[],
  streaks: ReadonlyMap<string, number> = new Map(),
): Message | null {
  const remaining = scheduled.filter((h) => !checkedIds.has(h.id));
  const streakOf = (h: HabitRow): number => streaks.get(h.id) ?? 0;

  if (slot === 'evening') {
    const first = remaining[0];
    if (first === undefined) return null;
    const url = '/';
    const tag = `sowly-evening-${day}`;
    if (remaining.length === 1) {
      const streak = streakOf(first);
      const lines = [
        whenWhere(first),
        streak >= 2
          ? `🔥 ${streak} jours d’affilée : ce soir, le ${streak + 1}ᵉ.`
          : pick(['La plus petite version compte.', 'Deux minutes, et ta graine a son eau.', 'Juste commencer, le reste suit.'], day),
      ].filter((l) => l !== '');
      return { title: `🌙 ${first.action} ?`, body: lines.join('\n'), url, tag, kind: 'digest' };
    }
    return {
      title: `🌙 Encore ${remaining.length} graines à arroser`,
      body: bullets(remaining.map((h) => `🌱 ${h.action}${streakOf(h) >= 2 ? ` · 🔥 ${streakOf(h)} j` : ''}`), 3),
      url,
      tag,
      kind: 'digest',
    };
  }

  const due = tasks.filter((t) => t.due_day !== null && t.due_day <= day || t.my_day === day);
  if (remaining.length === 0 && due.length === 0) return null;
  const parts: string[] = [];
  if (remaining.length > 0) parts.push(plural(remaining.length, 'graine', 'graines'));
  if (due.length > 0) parts.push(plural(due.length, 'tâche', 'tâches'));
  const hello = pick(['☀️ Bonjour !', '🌤️ Belle journée !', '🌱 C’est parti !'], day);
  const lines = [
    ...remaining.map((h) => `🌱 ${h.action}${whenWhere(h) !== '' ? `, ${whenWhere(h)}` : ''}`),
    ...due.map((t) => (t.due_day !== null && t.due_day < day ? `⏰ ${t.title} (à rattraper)` : `✅ ${t.title}`)),
  ];
  return {
    title: `${hello} ${parts.join(' et ')} pour aujourd’hui`,
    body: bullets(lines, 4),
    url: '/',
    tag: `sowly-morning-${day}`,
    kind: 'digest',
  };
}

// ---------------------------------------------------------------------------
// Rappels à l'heure choisie

export interface Reminder {
  subscription_id: string;
  user_id: string;
  kind: 'task' | 'habit' | 'prayer';
  item_id: string;
  /** Heure locale, « 2026-11-25T18:30:00 ». */
  remind_at: string;
  day: string;
}

export interface AlarmItem {
  title: string;
  description?: string;
  listName?: string | null;
  due_day?: string | null;
  habit?: HabitRow;
  streak?: number;
}

/** « 18:30 » → « 18 h 30 », « 08:00 » → « 8 h ». */
function hour(at: string): string {
  const [h, m] = at.slice(11, 16).split(':');
  return m === '00' ? `${Number(h)} h` : `${Number(h)} h ${m}`;
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Une heure de prière, avec le verset du jour pour cette heure. */
export function composePrayer(r: Reminder): Message {
  const h = Number(r.remind_at.slice(11, 13));
  const verse = verseFor(h, r.day);
  return {
    title: `🙏 ${hourLabel(h)}, l’heure de la prière`,
    body: `« ${verse.text} »\n${verse.ref} (LSG)`,
    url: `/?alarme=prayer:${h}`,
    tag: 'sowly-prayer',
    kind: 'alarm',
  };
}

/** Le rappel d'une tâche ou d'une habitude, quand son heure arrive. */
export function composeAlarm(r: Reminder, item: AlarmItem): Message {
  const base = {
    url: `/?alarme=${r.kind}:${r.item_id}`,
    tag: `sowly-${r.kind}-${r.item_id}`,
    kind: 'alarm' as const,
  };
  if (r.kind === 'habit' && item.habit !== undefined) {
    const streak = item.streak ?? 0;
    const lines = [
      [`Il est ${hour(r.remind_at)}`, whenWhere(item.habit)].filter((x) => x !== '').join(' · '),
      streak >= 2
        ? `🔥 ${streak} jours d’affilée, on continue ?`
        : clip(item.habit.why ?? '', 120) || 'La plus petite version compte : lance-toi.',
    ];
    return { ...base, title: `🌱 ${item.habit.action}`, body: lines.join('\n') };
  }
  const lines = [
    [`C’est l’heure : ${hour(r.remind_at)}`, item.listName ?? ''].filter((x) => x !== '').join(' · '),
    clip(item.description ?? '', 140),
  ].filter((l) => l !== '');
  return { ...base, title: `⏰ ${item.title}`, body: lines.join('\n') };
}
