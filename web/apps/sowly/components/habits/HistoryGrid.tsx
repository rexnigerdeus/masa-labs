'use client';

import { addDays, formatLong, weekday, WEEK_FR, type Day } from '../../lib/dates';
import type { Habit } from '../../lib/model';
import { isScheduled } from '../../lib/selectors';

const WEEKS = 12;

/**
 * Historique des douze dernières semaines, une colonne par semaine (lundi
 * en haut). Toucher un jour passé le valide ou l'annule : on oublie
 * souvent de cocher le soir même.
 *
 * Un jour prévu et non validé est une case **vide et neutre** — ni rouge,
 * ni croix, ni icône d'échec (brief §9). Seuls les jours validés ont une
 * couleur ; c'est eux qu'on doit voir.
 */
export function HistoryGrid({ habit, checked, today, onToggle }: {
  habit: Habit;
  checked: ReadonlySet<Day>;
  today: Day;
  onToggle: (day: Day) => void;
}) {
  // Lundi de la semaine en cours, puis on remonte de onze semaines.
  const mondayOffset = (weekday(today) + 6) % 7;
  const firstMonday = addDays(today, -mondayOffset - (WEEKS - 1) * 7);

  const columns: Day[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    columns.push(Array.from({ length: 7 }, (_, d) => addDays(firstMonday, w * 7 + d)));
  }

  return (
    <div className="flex gap-2">
      <div aria-hidden className="grid grid-rows-7 gap-1 pt-0.5 text-[10px] leading-none font-medium text-faint">
        {WEEK_FR.map((d) => <span key={d.value} className="grid h-[22px] place-items-center">{d.short}</span>)}
      </div>
      <div className="grid flex-1 grid-cols-12 gap-1" role="grid" aria-label="Historique des douze dernières semaines">
        {columns.map((week) => (
          <div key={week[0]} className="grid grid-rows-7 gap-1" role="row">
            {week.map((day) => {
              const isChecked = checked.has(day);
              const future = day > today;
              const beforeStart = day < habit.startDay && !isChecked;
              const scheduled = isScheduled(habit, day);
              const label = `${formatLong(day)} — ${isChecked ? 'validé' : scheduled ? 'non validé' : 'non prévu'}`;

              // Avant le début : case pâle, pour que la grille garde sa forme
              // dès le premier jour. Futur : rien.
              if (future || beforeStart) {
                return (
                  <span
                    key={day}
                    role="gridcell"
                    aria-hidden
                    className={`aspect-square max-h-[22px] rounded-[6px] ${future ? '' : 'bg-raised/50'}`}
                  />
                );
              }
              return (
                <button
                  key={day}
                  type="button"
                  role="gridcell"
                  aria-label={label}
                  aria-pressed={isChecked}
                  onClick={() => onToggle(day)}
                  className={`aspect-square max-h-[22px] rounded-[6px] transition ${
                    isChecked
                      ? 'bg-done'
                      : scheduled
                        ? 'border border-line bg-card'
                        : 'bg-raised/60'
                  } ${day === today ? 'ring-2 ring-primary ring-offset-1 ring-offset-canvas' : ''}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
