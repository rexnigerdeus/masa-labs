'use client';

import { useRef } from 'react';
import Link from 'next/link';
import type { Day } from '../../lib/dates';
import { completeHabit } from '../../lib/complete';
import type { HabitLine } from '../../lib/selectors';
import { CheckMark } from '../CheckMark';
import { BellIcon } from '../icons';

/**
 * Une habitude du jour. La pastille est à droite, sous le pouce ; le texte
 * mène au détail. Cible de validation de 48 px, la plus grande de l'écran :
 * c'est le geste principal de l'application.
 *
 * La série s'affiche dès 2 jours — « 1 j » n'apprend rien à personne — et
 * rien ne s'affiche à zéro : un jour manqué ne laisse aucune trace négative
 * (brief §9).
 */
export function HabitRow({ line, today }: { line: HabitLine; today: Day }) {
  const { habit, done, streak } = line;
  const detail = [habit.cue, habit.place].filter((s) => s !== '').join(' · ');
  const pastille = useRef<HTMLButtonElement>(null);

  return (
    <li className="flex items-center gap-3 rounded-[12px] py-1.5 pr-0.5 pl-2.5 transition-colors hover:bg-line">
      <Link href={`/habitude?id=${habit.id}`} className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate text-[16px] font-semibold transition-colors ${done ? 'text-muted' : 'text-ink'}`}>
          {habit.action}
        </span>
        {detail !== '' || streak.current >= 2 || habit.remindTime !== null ? (
          <span className="flex items-center gap-2 text-[12.5px] text-muted">
            {streak.current >= 2 ? (
              <span className="mono font-medium text-ok">{streak.current} j<span className="sr-only"> de série</span></span>
            ) : null}
            {habit.remindTime !== null ? (
              <span className="mono inline-flex shrink-0 items-center gap-1">
                <BellIcon className="h-3 w-3" /><span className="sr-only">Rappel à </span>{habit.remindTime}
              </span>
            ) : null}
            {detail !== '' ? <span className="truncate">{detail}</span> : null}
          </span>
        ) : null}
      </Link>
      <button
        type="button"
        ref={pastille}
        onClick={() => completeHabit(habit.id, done, today, pastille.current)}
        aria-label={done ? `Annuler « ${habit.action} » pour aujourd’hui` : `Valider « ${habit.action} »`}
        aria-pressed={done}
        className="grid h-12 w-12 place-items-center"
      >
        <CheckMark checked={done} />
      </button>
    </li>
  );
}
