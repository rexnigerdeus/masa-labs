'use client';

import { previewAlarm, silenceDue } from '../lib/alarm-state';
import { stampOf } from '../lib/clock';
import { setPrayerHours } from '../lib/mutations';
import { commit } from '../lib/store';
import { hourLabel, PRAYER_HOURS } from '../lib/verses';
import { PushHint } from './ReminderField';
import { Button, Switch } from './ui';

/**
 * Heures de prière : une alarme plein écran et un verset (LSG) choisi pour
 * cette heure. L'option suit le compte (téléphone et ordinateur) ; chaque
 * heure se coupe séparément.
 */
export function PrayerSettings({ hours }: { hours: readonly number[] }) {
  const on = hours.length > 0;
  const save = (next: readonly number[]): void => {
    commit((d) => setPrayerHours(d, next));
    // L'heure déjà entamée ne sonne pas au moment où on l'active.
    silenceDue('prayer');
  };
  // L'essai montre la dernière heure passée parmi celles choisies.
  const test = (): void => {
    const hour = new Date().getHours();
    const sample = [...hours].reverse().find((h) => h <= hour) ?? hours[hours.length - 1] ?? 0;
    previewAlarm({ kind: 'prayer', id: String(sample), at: stampOf() });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px]">Me rappeler de prier</span>
        <Switch label="Heures de prière" checked={on} onChange={(v) => save(v ? PRAYER_HOURS : [])} />
      </div>
      <p className="text-sm text-muted">
        À chaque heure, une alarme plein écran et un verset de la Bible Louis Segond (LSG) pour ce moment de la journée.
      </p>
      {on ? (
        <>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Heures de prière">
            {PRAYER_HOURS.map((h) => (
              <button
                key={h}
                type="button"
                className="puce"
                aria-pressed={hours.includes(h)}
                onClick={() => save(hours.includes(h) ? hours.filter((x) => x !== h) : [...hours, h])}
              >
                {hourLabel(h)}
              </button>
            ))}
          </div>
          <PushHint />
          <Button className="self-start" onClick={test}>Essayer l’alarme</Button>
        </>
      ) : null}
    </div>
  );
}
