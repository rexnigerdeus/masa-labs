'use client';

import { useActionState, useEffect, useId } from 'react';
import { joinWaitlist, type WaitlistProduct, type WaitlistState } from '../lib/waitlist';
import { track } from '../lib/analytics';

/**
 * Composant unique de liste d'attente (brief v2) : accueil, écran « 2e CV »,
 * /tarifs, /concours.
 *
 * Textes repris mot pour mot du brief. La case de consentement est décochée
 * au départ et le serveur refuse l'envoi sans elle : le navigateur bloque
 * déjà (`required`), mais la règle ne repose pas sur lui.
 *
 * Fonctionne sans JavaScript (action serveur sur un vrai `<form>`) ; une fois
 * hydraté, il affiche la confirmation sans recharger la page.
 */
export interface WaitlistQuestion {
  name: string;
  label: string;
  options: readonly string[];
}

const INITIAL: WaitlistState = { status: 'idle' };

export function WaitlistForm({ product, placement, question }: {
  product: WaitlistProduct;
  /** Emplacement de l'inscription, pour savoir lequel convertit. */
  placement: string;
  /** Question à choix multiple facultative (page /concours). */
  question?: WaitlistQuestion;
}) {
  const [state, action, pending] = useActionState(joinWaitlist, INITIAL);
  const id = useId();

  useEffect(() => {
    if (state.status === 'ok') track('waitlist_joined', { produit: product, emplacement: placement });
  }, [state, product, placement]);

  if (state.status === 'ok') {
    return (
      <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-header">
        C’est noté. Un seul message, le jour où c’est prêt.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 text-left">
      <input type="hidden" name="product" value={product} />
      <input type="hidden" name="placement" value={placement} />

      {question === undefined ? null : (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-ink">{question.label}</legend>
          {question.options.map((option) => (
            <label key={option} className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-white px-3.5 text-base text-ink">
              <input type="checkbox" name={question.name} value={option} className="h-5 w-5 accent-[var(--color-accent-ink)]" />
              {option}
            </label>
          ))}
        </fieldset>
      )}

      <label className="flex flex-col gap-1.5" htmlFor={`${id}-tel`}>
        <span className="text-sm font-semibold text-ink">Votre numéro WhatsApp</span>
        <input
          id={`${id}-tel`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="07 00 00 00 00"
          aria-invalid={state.field === 'phone' || undefined}
          className={`w-full rounded-xl border bg-white px-3.5 py-3 text-base text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
            state.field === 'phone' ? 'border-danger' : 'border-line focus:border-accent'
          }`}
        />
      </label>

      <label className="flex items-start gap-3 text-sm text-ink" htmlFor={`${id}-ok`}>
        <input
          id={`${id}-ok`}
          name="consent"
          type="checkbox"
          required
          aria-invalid={state.field === 'consent' || undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent-ink)]"
        />
        <span>J’accepte d’être contacté par WhatsApp quand ce service sera disponible.</span>
      </label>

      {state.status === 'error' ? (
        <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-header hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? 'Un instant…' : 'Me prévenir'}
      </button>
    </form>
  );
}
