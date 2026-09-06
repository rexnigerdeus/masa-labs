/**
 * Dates de location, manipulées comme des chaînes `AAAA-MM-JJ`.
 *
 * Volontairement sans objet `Date` local : Abidjan est à UTC+0 aujourd'hui,
 * mais un navigateur mal réglé suffirait à décaler une réservation d'un jour.
 * Les bornes sont interprétées en UTC, exactement comme la colonne `date` de
 * Postgres les stocke.
 */

const DAY_MS = 86_400_000;

/** `null` si la chaîne n'est pas une date calendaire valide. */
export function parseDay(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;
  const [, y, m, d] = match;
  const time = Date.UTC(Number(y), Number(m) - 1, Number(d));
  const back = new Date(time);
  // Rejette le 31 février, que `Date.UTC` reporterait silencieusement au 3 mars.
  if (back.getUTCMonth() !== Number(m) - 1 || back.getUTCDate() !== Number(d)) return null;
  return time;
}

/**
 * Nombre de jours facturés entre deux bornes incluses.
 *
 * Louer « du 5 au 5 » est une journée de location, pas zéro : c'est ainsi
 * qu'on compte au comptoir, et le prix affiché doit correspondre à ce que le
 * loueur annonce de vive voix.
 */
export function countDays(start: string, end: string): number | null {
  const a = parseDay(start);
  const b = parseDay(end);
  if (a === null || b === null || b < a) return null;
  return Math.round((b - a) / DAY_MS) + 1;
}

/** Deux intervalles de dates incluses se chevauchent-ils ? */
export function rangesOverlap(
  aStart: string, aEnd: string, bStart: string, bEnd: string,
): boolean {
  const a1 = parseDay(aStart); const a2 = parseDay(aEnd);
  const b1 = parseDay(bStart); const b2 = parseDay(bEnd);
  if (a1 === null || a2 === null || b1 === null || b2 === null) return false;
  return a1 <= b2 && b1 <= a2;
}

/** Aujourd'hui au format `AAAA-MM-JJ`, pour les bornes `min` des formulaires. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
