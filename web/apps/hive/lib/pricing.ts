import { countDays } from './dates.ts';

/**
 * Calcul du prix d'une location.
 *
 * Toujours exécuté côté serveur avant l'écriture en base : le total envoyé
 * par le navigateur n'est jamais repris tel quel, sans quoi n'importe qui
 * réserverait une caméra à 100 FCFA en modifiant un champ caché.
 */

export type RentPrices = {
  rent_price_day: number | null;
  rent_price_week: number | null;
};

export type RentQuote = {
  days: number;
  weeks: number;
  extraDays: number;
  total: number;
  /** Vrai quand le tarif semaine a fait baisser la note. */
  weeklyApplied: boolean;
};

/**
 * `null` si les dates sont incohérentes ou si l'annonce n'a pas de tarif
 * journalier — cas que les contraintes de la base interdisent déjà, mais qui
 * doit rester représentable ici plutôt que de produire un `NaN` silencieux.
 */
export function computeRentQuote(prices: RentPrices, start: string, end: string): RentQuote | null {
  const days = countDays(start, end);
  if (days === null || prices.rent_price_day === null) return null;

  const daily = prices.rent_price_day;
  const plain = days * daily;

  // Pas de tarif semaine, ou semaine plus chère que sept jours à l'unité :
  // on facture au jour. Un loueur peut saisir un prix semaine mal calculé,
  // ce n'est pas au client de le payer.
  const weekly = prices.rent_price_week;
  if (weekly === null || days < 7 || weekly >= daily * 7) {
    return { days, weeks: 0, extraDays: days, total: plain, weeklyApplied: false };
  }

  const weeks = Math.floor(days / 7);
  const extraDays = days % 7;
  const total = weeks * weekly + extraDays * daily;

  return { days, weeks, extraDays, total, weeklyApplied: true };
}

/**
 * Montant en francs CFA.
 *
 * Espace insécable fine entre les groupes et avant l'unité : sur un écran de
 * téléphone, « 125000FCFA » se lit mal et se recopie encore plus mal.
 */
export function formatFcfa(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped} FCFA`;
}
