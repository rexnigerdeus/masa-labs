'use client';

import { useState } from 'react';
import { formatStamp, isStamp, isTime, nextHour, shortcuts, stampDay, stampOf, stampTime } from '../lib/clock';
import { isDay, type Day } from '../lib/dates';
import { enablePush, usePushState } from '../lib/push';
import { BellIcon } from './icons';

/**
 * Jour et heure de rappel d'une tâche : des raccourcis, puis un jour et une
 * heure à ajuster. `day` est le jour proposé d'office (échéance ou « Ma
 * journée »).
 */
export function ReminderField({ value, onChange, today, day }: {
  value: string | null;
  onChange: (stamp: string | null) => void;
  today: Day;
  day: Day;
}) {
  const now = stampOf();
  const past = value !== null && value < now;
  const pick = (): void => onChange(day > today ? `${day}T08:00` : nextHour(now));

  return (
    <div className="flex flex-col gap-2.5 px-3.5 py-3">
      <div className="flex items-center gap-3">
        <BellIcon className="h-5 w-5 shrink-0 text-muted" />
        <span className="flex-1 text-[15px] font-medium">Rappel</span>
        {value === null ? (
          <span className="text-[13px] text-muted">Aucun</span>
        ) : (
          <span className={`date ${past ? '!bg-card' : 'proche'}`}>{past ? 'Passé · ' : ''}{formatStamp(value, today)}</span>
        )}
      </div>
      {value === null ? (
        <div className="flex flex-wrap gap-1.5 pl-8">
          {shortcuts(now).map((s) => (
            <button key={s.label} type="button" className="puce" onClick={() => onChange(s.at)}>{s.label}</button>
          ))}
          <button type="button" className="puce" onClick={pick}>Choisir…</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pl-8">
          <input
            type="date"
            aria-label="Jour du rappel"
            min={today}
            value={stampDay(value)}
            onChange={(e) => { if (isDay(e.target.value)) onChange(`${e.target.value}T${stampTime(value)}`); }}
            className="saisie mono !w-auto !bg-card"
          />
          <input
            type="time"
            aria-label="Heure du rappel"
            value={stampTime(value)}
            onChange={(e) => {
              const next = `${stampDay(value)}T${e.target.value.slice(0, 5)}`;
              if (isTime(e.target.value.slice(0, 5)) && isStamp(next)) onChange(next);
            }}
            className="saisie mono !w-auto !bg-card"
          />
          <button type="button" onClick={() => onChange(null)} className="puce !border-transparent text-muted">Retirer</button>
        </div>
      )}
      {value !== null ? <div className="pl-8"><PushHint /></div> : null}
    </div>
  );
}

/**
 * Sans notifications sur cet appareil, l'alarme ne sonne que si Sowly est
 * ouverte : on le dit, avec le bouton pour y remédier.
 */
export function PushHint() {
  const state = usePushState();
  const [failed, setFailed] = useState(false);
  if (state === null || state === 'on') return null;
  const text = {
    'ios-install': 'Sur iPhone, installe Sowly sur l’écran d’accueil pour être prévenu quand elle est fermée.',
    denied: 'Notifications bloquées sur cet appareil : l’alarme ne sonnera que si Sowly est ouverte.',
    unsupported: 'Ce navigateur ne sait pas notifier : l’alarme ne sonnera que si Sowly est ouverte.',
    off: 'Quand Sowly est fermée, seule une notification peut te prévenir. ',
  }[state];
  return (
    <p className="text-[12.5px] text-muted">
      {text}
      {state === 'off' ? (
        <button
          type="button"
          className="font-semibold text-ink underline decoration-mangue decoration-[3px] underline-offset-4"
          onClick={() => { setFailed(false); enablePush().catch(() => setFailed(true)); }}
        >
          Activer sur cet appareil
        </button>
      ) : null}
      {failed ? ' Impossible pour le moment, réessaie plus tard.' : null}
    </p>
  );
}
