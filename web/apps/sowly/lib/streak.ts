/**
 * Séries (streaks), calculées et jamais stockées.
 *
 * Une série stockée en base dériverait dès qu'une validation faite
 * hors-ligne arrive après une autre faite ailleurs ; recalculée depuis les
 * jours validés, elle est juste par construction. Le coût est négligeable :
 * une boucle sur les jours depuis la création de l'habitude.
 *
 * Trois règles, qui découlent du « jamais culpabilisant » (brief §9) :
 *   - seuls les jours **prévus** comptent : une habitude du lundi au
 *     vendredi n'est pas interrompue par le week-end ;
 *   - **aujourd'hui ne casse rien** tant qu'il n'est pas terminé : à 8 h,
 *     une série de 12 jours affiche 12, pas 0 ;
 *   - un jour **non prévu mais validé** compte quand même : faire plus que
 *     prévu n'est jamais pénalisé.
 */

import { addDays, daysBetween, weekday, type Day } from './dates.ts';

export interface StreakInput {
  days: readonly number[];
  startDay: Day;
}

export interface Streak {
  current: number;
  best: number;
  /** Nombre total de jours validés. */
  total: number;
}

export function computeStreak(habit: StreakInput, checked: ReadonlySet<Day>, today: Day): Streak {
  const scheduled = new Set(habit.days);
  let first = habit.startDay;
  for (const day of checked) if (day < first) first = day;

  // Garde-fou : une date de début dans le futur ou aberrante ne doit pas
  // faire tourner une boucle sur des siècles.
  const span = Math.min(daysBetween(first, today), 366 * 30);
  if (span < 0) return { current: 0, best: 0, total: 0 };

  let run = 0;
  let best = 0;
  let total = 0;
  for (let i = 0; i <= span; i++) {
    const day = addDays(first, i);
    if (checked.has(day)) {
      run++;
      total++;
      if (run > best) best = run;
    } else if (scheduled.has(weekday(day)) && day !== today) {
      run = 0;
    }
  }

  return { current: run, best, total };
}
