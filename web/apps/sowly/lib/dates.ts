/**
 * Jours calendaires de l'utilisateur.
 *
 * Toute l'application raisonne en « jour » (`AAAA-MM-JJ`), jamais en
 * horodatage : une habitude validée à 23 h 50 à Abidjan l'est pour ce
 * jour-là, quel que soit le fuseau du serveur. Le jour se calcule depuis
 * l'heure locale de l'appareil, puis voyage tel quel jusqu'à la colonne
 * `date` de Postgres.
 *
 * L'arithmétique se fait en UTC sur la chaîne : ajouter un jour à une date
 * locale traverserait sinon un changement d'heure et tomberait sur le même
 * jour deux fois.
 */

export type Day = string;

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Jour local d'un instant (par défaut : maintenant). */
export function dayOf(date: Date = new Date()): Day {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toUtc(day: Day): number {
  const match = DAY_RE.exec(day);
  if (match === null) throw new Error(`Jour invalide : ${day}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function fromUtc(ms: number): Day {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isDay(value: unknown): value is Day {
  if (typeof value !== 'string' || !DAY_RE.test(value)) return false;
  // Rejette le 31 février, que `Date.UTC` ramènerait silencieusement au 3 mars.
  return fromUtc(toUtc(value)) === value;
}

export function addDays(day: Day, n: number): Day {
  return fromUtc(toUtc(day) + n * MS_PER_DAY);
}

/** Écart en jours, positif si `b` est après `a`. */
export function daysBetween(a: Day, b: Day): number {
  return Math.round((toUtc(b) - toUtc(a)) / MS_PER_DAY);
}

/** 0 = dimanche … 6 = samedi, comme `Date.getDay()` et la colonne `days`. */
export function weekday(day: Day): number {
  return new Date(toUtc(day)).getUTCDay();
}

const LONG = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
});
const SHORT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
});

/** « vendredi 2 octobre » */
export function formatLong(day: Day): string {
  return LONG.format(toUtc(day));
}

/**
 * Libellé relatif d'une échéance : « Aujourd'hui », « Demain », « Hier »,
 * sinon la date courte. C'est ce que lit quelqu'un qui parcourt sa liste.
 */
export function formatRelative(day: Day, today: Day): string {
  const diff = daysBetween(today, day);
  if (diff === 0) return 'Aujourd’hui';
  if (diff === 1) return 'Demain';
  if (diff === -1) return 'Hier';
  return SHORT.format(toUtc(day));
}

/** Initiales des jours, dans l'ordre de la semaine française (lundi d'abord). */
export const WEEK_FR: ReadonlyArray<{ value: number; short: string; label: string }> = [
  { value: 1, short: 'L', label: 'lundi' },
  { value: 2, short: 'M', label: 'mardi' },
  { value: 3, short: 'M', label: 'mercredi' },
  { value: 4, short: 'J', label: 'jeudi' },
  { value: 5, short: 'V', label: 'vendredi' },
  { value: 6, short: 'S', label: 'samedi' },
  { value: 0, short: 'D', label: 'dimanche' },
];

/** « Tous les jours », « En semaine », « Le week-end » ou la liste des jours. */
export function formatDays(days: readonly number[]): string {
  const set = new Set(days);
  if (set.size === 7) return 'Tous les jours';
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return 'En semaine';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Le week-end';
  return WEEK_FR.filter((d) => set.has(d.value)).map((d) => d.label.slice(0, 3)).join(', ');
}
