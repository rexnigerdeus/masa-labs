'use client';

import { useActionState, useState } from 'react';
import { composeCoverLetter, type CoverLetter, type Resume } from '@everyday/cv-core';
import { createLetter, updateLetter, type LetterState } from '../../lib/letters';

/**
 * Lettre guidée (brief v2) : offre visée, pourquoi cette structure, deux ou
 * trois atouts choisis dans le CV, disponibilité. « Assembler la lettre »
 * compose le texte (cv-core, sans IA) ; il reste ensuite entièrement
 * modifiable, et c'est ce texte-là qui part dans le PDF.
 *
 * Un même composant crée (`id` absent) et modifie : la lettre voyage en JSON
 * dans un champ caché, la base la remet en forme (`normalizeCoverLetter`).
 */
const field =
  'w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base focus:border-accent '
  + 'focus:outline-none focus:ring-2 focus:ring-accent/40';

export function LetterEditor({ id, initial, resume, resumeId, offerId, choices }: {
  id: string | null;
  initial: CoverLetter;
  resume: Resume;
  resumeId: string | null;
  offerId: string | null;
  /** Atouts proposés, tirés du CV. */
  choices: string[];
}) {
  const [letter, setLetter] = useState<CoverLetter>(initial);
  const [state, action, pending] = useActionState<LetterState, FormData>(
    id === null ? createLetter : updateLetter,
    {},
  );
  const set = (patch: Partial<CoverLetter>): void => setLetter((l) => ({ ...l, ...patch }));
  const toggle = (choice: string): void => set({
    strengths: letter.strengths.includes(choice)
      ? letter.strengths.filter((s) => s !== choice)
      : [...letter.strengths, choice].slice(0, 3),
  });

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="letter" value={JSON.stringify(letter)} />
      {id === null ? null : <input type="hidden" name="id" value={id} />}
      {resumeId === null ? null : <input type="hidden" name="resume" value={resumeId} />}
      {offerId === null ? null : <input type="hidden" name="offre" value={offerId} />}

      <section className="card flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Structure qui recrute</span>
          <input className={field} value={letter.company} onChange={(e) => set({ company: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Poste visé</span>
          <input className={field} value={letter.position} onChange={(e) => set({ position: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Pourquoi cette structure ?</span>
          <textarea
            className={`${field} min-h-24`}
            value={letter.why}
            onChange={(e) => set({ why: e.target.value })}
            placeholder="Ce qui vous attire chez elle, en une ou deux phrases."
          />
        </label>
        {choices.length === 0 ? null : (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Deux ou trois atouts tirés de votre CV</legend>
            {choices.map((choice) => (
              <label key={choice} className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-white px-3.5 text-sm">
                <input
                  type="checkbox"
                  checked={letter.strengths.includes(choice)}
                  onChange={() => toggle(choice)}
                  disabled={!letter.strengths.includes(choice) && letter.strengths.length >= 3}
                  className="h-5 w-5 accent-[var(--color-accent-ink)]"
                />
                {choice}
              </label>
            ))}
          </fieldset>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Disponibilité</span>
          <input
            className={field}
            value={letter.availability}
            onChange={(e) => set({ availability: e.target.value })}
            placeholder="dès maintenant, à partir du 1er décembre…"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Lieu et date</span>
          <input
            className={field}
            value={letter.placeDate}
            onChange={(e) => set({ placeDate: e.target.value })}
            placeholder="Abidjan, le 18 octobre 2026"
          />
        </label>
        <button
          type="button"
          onClick={() => set({ body: composeCoverLetter(letter, resume) })}
          className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-accent px-5 font-semibold text-accent-ink hover:bg-accent-soft"
        >
          {letter.body.trim() === '' ? 'Assembler la lettre' : 'Réassembler à partir des réponses'}
        </button>
      </section>

      {letter.body.trim() === '' ? null : (
        <label className="card flex flex-col gap-2 p-5">
          <span className="text-sm font-semibold">Votre lettre — relisez-la et modifiez-la librement</span>
          <textarea
            className={`${field} min-h-[24rem] leading-relaxed`}
            value={letter.body}
            onChange={(e) => set({ body: e.target.value })}
          />
        </label>
      )}

      {state.error === undefined ? null : <p role="alert" className="text-sm font-medium text-danger">{state.error}</p>}
      {state.saved === true ? <p role="status" className="text-sm font-medium text-accent-ink">Lettre enregistrée.</p> : null}

      <button
        type="submit"
        disabled={pending || letter.body.trim() === ''}
        className="inline-flex min-h-13 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-header hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer la lettre'}
      </button>
    </form>
  );
}
