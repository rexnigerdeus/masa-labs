'use client';

import { WEEK_FR } from '../../lib/dates';
import { IDENTITIES, identityById } from '../../lib/identities';
import { MOMENTS } from '../../lib/model';
import type { HabitDraft } from '../../lib/mutations';
import { Field, Input, Segmented, Textarea } from '../ui';

export const EMPTY_DRAFT: HabitDraft = {
  action: '',
  moment: 'matin',
  cue: '',
  place: '',
  identity: null,
  why: '',
  days: [0, 1, 2, 3, 4, 5, 6],
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
  const suggestions = identityById(value.identity)?.suggestions ?? [];

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Cette habitude fait de moi…</legend>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {ordered.map((i) => (
            <button
              key={i.id}
              type="button"
              aria-pressed={value.identity === i.id}
              onClick={() => set({ identity: value.identity === i.id ? null : i.id })}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                value.identity === i.id
                  ? 'border-primary bg-done-soft text-primary-ink'
                  : 'border-line text-muted hover:text-ink'
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </fieldset>

      {suggestions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Idées, à la bonne taille :</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.action}
                type="button"
                onClick={() => set({ action: s.action, moment: s.moment, cue: s.cue })}
                className="rounded-xl bg-raised px-3 py-2 text-left text-sm text-ink hover:bg-line"
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
        <span className="text-sm font-medium">Moment de la journée</span>
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
        <legend className="mb-1.5 text-sm font-medium">Jours</legend>
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
                className={`h-10 flex-1 rounded-full text-sm font-semibold transition ${
                  on ? 'bg-primary text-on-primary' : 'bg-raised text-muted'
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
      </fieldset>

      {showWhy ? (
        <Field label="Pourquoi c’est important pour moi" hint="Facultatif. Tu le reliras les jours sans envie.">
          <Textarea value={value.why} onChange={(e) => set({ why: e.target.value })} maxLength={280} />
        </Field>
      ) : null}

      {value.action.trim() !== '' ? (
        <p className="rounded-2xl bg-done-soft px-4 py-3 font-display text-[17px] leading-snug text-primary-ink">
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
