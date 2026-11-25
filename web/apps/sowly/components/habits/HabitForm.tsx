'use client';

import { WEEK_FR } from '../../lib/dates';
import { IDENTITIES, identityById } from '../../lib/identities';
import { MOMENTS } from '../../lib/model';
import type { HabitDraft } from '../../lib/mutations';
import { isTime } from '../../lib/clock';
import { useColumnAvailable } from '../../lib/sync';
import { PushHint } from '../ReminderField';
import { Field, Input, Segmented, Textarea } from '../ui';

export const EMPTY_DRAFT: HabitDraft = {
  action: '',
  moment: 'matin',
  cue: '',
  place: '',
  identity: null,
  why: '',
  days: [0, 1, 2, 3, 4, 5, 6],
  remindTime: null,
};

/** Heures proposées selon le moment de la journée. */
const SUGGESTED_TIMES: Record<HabitDraft['moment'], readonly string[]> = {
  matin: ['06:00', '07:00', '08:00'],
  journee: ['12:00', '13:00', '16:00'],
  soir: ['19:00', '20:30', '22:00'],
};

/**
 * Formulaire d'habitude, au format d'intention d'implémentation (brief
 * §8.A.3) : « Je veux [action] [quand] [où] ». La phrase complète se
 * recompose sous les champs pendant la saisie — c'est elle, plus que les
 * champs, qui donne envie de s'y tenir.
 *
 * Les suggestions de l'identité choisie sont minuscules exprès : elles
 * montrent la bonne taille avant même qu'on écrive (« commence minuscule »).
 */
export function HabitForm({ value, onChange, identities, showWhy = true }: {
  value: HabitDraft;
  onChange: (draft: HabitDraft) => void;
  /** Identités proposées en premier : celles choisies à l'onboarding. */
  identities: string[];
  showWhy?: boolean;
}) {
  const set = (patch: Partial<HabitDraft>): void => onChange({ ...value, ...patch });
  const ordered = [
    ...identities.map((id) => identityById(id)).filter((i) => i !== null),
    ...IDENTITIES.filter((i) => !identities.includes(i.id)),
  ];
  const canRemind = useColumnAvailable('sowly_habits', 'remind_time');
  const suggestions = identityById(value.identity)?.suggestions ?? [];

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 text-[13px] font-semibold text-muted">Cette habitude fait de moi…</legend>
        <div className="flex flex-wrap gap-1.5">
          {ordered.map((i) => (
            <button
              key={i.id}
              type="button"
              aria-pressed={value.identity === i.id}
              onClick={() => set({ identity: value.identity === i.id ? null : i.id })}
              className="puce"
            >
              {i.label}
            </button>
          ))}
        </div>
      </fieldset>

      {suggestions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-muted">Idées, à la bonne taille</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.action}
                type="button"
                onClick={() => set({ action: s.action, moment: s.moment, cue: s.cue })}
                className="rounded-[14px] bg-raised px-3 py-2 text-left text-sm font-medium text-ink transition duration-150 ease-[var(--ressort)] hover:-translate-y-0.5 hover:-rotate-[0.4deg]"
              >
                {s.action}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Field label="Je veux…" hint="Commence minuscule : la version si petite que tu ne peux pas la rater.">
        <Input
          value={value.action}
          onChange={(e) => set({ action: e.target.value })}
          placeholder="lire une page"
          maxLength={80}
          required
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">Moment de la journée</span>
        <Segmented label="Moment de la journée" value={value.moment} options={MOMENTS} onChange={(moment) => set({ moment })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quand ?">
          <Input value={value.cue} onChange={(e) => set({ cue: e.target.value })} placeholder="après le café" maxLength={60} />
        </Field>
        <Field label="Où ?">
          <Input value={value.place} onChange={(e) => set({ place: e.target.value })} placeholder="dans le salon" maxLength={60} />
        </Field>
      </div>

      <fieldset className="flex min-w-0 flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-semibold text-muted">Jours</legend>
        <div className="flex justify-between gap-1">
          {WEEK_FR.map((d) => {
            const on = value.days.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={on}
                aria-label={d.label}
                onClick={() => {
                  const days = on ? value.days.filter((x) => x !== d.value) : [...value.days, d.value];
                  // Au moins un jour : une habitude jamais prévue n'existe pas.
                  if (days.length > 0) set({ days });
                }}
                className={`h-10 flex-1 rounded-[12px] text-sm font-semibold transition duration-150 ease-[var(--ressort)] active:scale-95 ${
                  on ? 'bg-encre text-[var(--fond)]' : 'bg-raised text-muted'
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
      </fieldset>

      {canRemind ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted">Heure de rappel</span>
          {value.remindTime === null ? (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TIMES[value.moment].map((t) => (
                <button key={t} type="button" className="puce" onClick={() => set({ remindTime: t })}><b>{t}</b></button>
              ))}
              <button type="button" className="puce" onClick={() => set({ remindTime: SUGGESTED_TIMES[value.moment][1] ?? '12:00' })}>
                Choisir…
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="time"
                aria-label="Heure de rappel"
                value={value.remindTime}
                onChange={(e) => { if (isTime(e.target.value.slice(0, 5))) set({ remindTime: e.target.value.slice(0, 5) }); }}
                className="saisie mono !w-auto"
              />
              <button type="button" className="puce !border-transparent text-muted" onClick={() => set({ remindTime: null })}>Retirer</button>
            </div>
          )}
          <span className="text-[12.5px] text-muted">Une alarme plein écran, chaque jour prévu, tant que ce n’est pas validé.</span>
          {value.remindTime !== null ? <PushHint /> : null}
        </div>
      ) : null}

      {showWhy ? (
        <Field label="Pourquoi c’est important pour moi" hint="Facultatif. Tu le reliras les jours sans envie.">
          <Textarea value={value.why} onChange={(e) => set({ why: e.target.value })} maxLength={280} />
        </Field>
      ) : null}

      {value.action.trim() !== '' ? (
        <p className="carte carte--lagune accroche !shadow-none">
          {intention(value)}
        </p>
      ) : null}
    </div>
  );
}

/** « Je veux lire une page, au coucher, dans ma chambre. » */
export function intention(d: Pick<HabitDraft, 'action' | 'cue' | 'place'>): string {
  const parts = [d.action.trim().replace(/^./, (c) => c.toLowerCase()), d.cue.trim(), d.place.trim()]
    .filter((s) => s !== '');
  return `Je veux ${parts.join(', ')}.`;
}
