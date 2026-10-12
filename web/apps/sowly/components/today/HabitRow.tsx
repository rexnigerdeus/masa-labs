'use client';

import { useRef } from 'react';
import Link from 'next/link';
import type { Day } from '../../lib/dates';
import { completeHabit } from '../../lib/complete';
import type { HabitLine } from '../../lib/selectors';
import { CheckMark } from '../CheckMark';

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
    <li className="flex items-center gap-3 py-2.5 pr-1 pl-4">
      <Link href={`/habitude?id=${habit.id}`} className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate text-[16px] font-medium transition-colors ${done ? 'text-muted' : 'text-ink'}`}>
          {habit.action}
        </span>
        {detail !== '' || streak.current >= 2 ? (
          <span className="flex items-center gap-2 text-[13px] text-muted">
            {streak.current >= 2 ? (
              <span className="font-display font-semibold text-primary-ink">{streak.current} j</span>
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
