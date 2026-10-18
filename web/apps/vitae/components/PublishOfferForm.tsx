'use client';

import { useActionState } from 'react';
import { submitOffer, type SubmitField, type SubmitOfferState } from '../lib/submitOffer';
import { CITIES, JOB_CATEGORIES, JOB_LEVELS } from '../lib/catalog';

/**
 * Formulaire « Publier une offre gratuitement ».
 *
 * Champs natifs et listes déroulantes du téléphone, comme le filtre des
 * offres : rien à charger pour choisir une ville ou une date. Fonctionne sans
 * JavaScript (action serveur) ; hydraté, il garde la saisie en cas d'erreur.
 */

const INITIAL: SubmitOfferState = { status: 'idle' };

const input =
  'w-full rounded-xl border bg-white px-3.5 py-3 text-base placeholder:text-muted/60 '
  + 'focus:outline-none focus:ring-2 focus:ring-accent/40';

export function PublishOfferForm() {
  const [state, action, pending] = useActionState(submitOffer, INITIAL);
  const err = (field: SubmitField): string | undefined => state.errors?.[field];
  const cls = (field: SubmitField): string =>
    `${input} ${err(field) === undefined ? 'border-line focus:border-accent' : 'border-danger'}`;

  if (state.status === 'ok') {
    return (
      <div role="status" className="card flex flex-col gap-2 p-5">
        <h2 className="text-lg font-bold">Merci, votre offre est bien reçue.</h2>
        <p className="text-sm text-muted">
          Nous la relisons avant de la mettre en ligne. Si une précision
          manque, nous vous écrivons au contact indiqué.
        </p>
      </div>
    );
  }

  const field = (name: SubmitField, label: string, control: React.ReactNode, hint?: string) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {control}
      {err(name) !== undefined ? (
        <span role="alert" className="text-sm font-medium text-danger">{err(name)}</span>
      ) : hint === undefined ? null : (
        <span className="text-sm text-muted">{hint}</span>
      )}
    </label>
  );

  return (
    <form action={action} className="card flex flex-col gap-5 p-5" noValidate>
      {field('company', 'Entreprise ou structure',
        <input name="company" className={cls('company')} autoComplete="organization" required aria-invalid={err('company') !== undefined || undefined} />)}
      {field('title', 'Intitulé du poste',
        <input name="title" className={cls('title')} placeholder="Animateur sportif, assistante de direction…" required aria-invalid={err('title') !== undefined || undefined} />)}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold">Type</legend>
        <div className="grid grid-cols-2 gap-2">
          {[['stage', 'Stage'], ['emploi', 'Emploi']].map(([value, label]) => (
            <label key={value} className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-white px-3.5">
              <input type="radio" name="type" value={value} required className="h-5 w-5 accent-[var(--color-accent-ink)]" />
              {label}
            </label>
          ))}
        </div>
        {err('type') === undefined ? null : <span role="alert" className="text-sm font-medium text-danger">{err('type')}</span>}
      </fieldset>

      {field('level', 'Niveau attendu',
        <select name="level" defaultValue="" className={cls('level')} required>
          <option value="" disabled>Choisir…</option>
          {Object.entries(JOB_LEVELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>)}

      {field('city', 'Ville ou commune',
        <>
          <input name="city" list="villes" className={cls('city')} required aria-invalid={err('city') !== undefined || undefined} />
          <datalist id="villes">
            {CITIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </>)}

      {field('sector', 'Secteur',
        <select name="sector" defaultValue="" className={cls('sector')} required>
          <option value="" disabled>Choisir…</option>
          {Object.entries(JOB_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>)}

      {field('apply', 'Lien ou e-mail de candidature',
        <input name="apply" inputMode="url" className={cls('apply')} placeholder="https://… ou recrutement@…" required aria-invalid={err('apply') !== undefined || undefined} />,
        'Le lien de l’offre elle-même, ou l’adresse où envoyer les candidatures.')}

      {field('deadline', 'Date limite',
        <input name="deadline" type="date" className={cls('deadline')} />,
        'Facultatif. Sans date, l’offre reste en ligne 45 jours.')}

      {field('contact', 'Votre contact',
        <input name="contact" className={cls('contact')} autoComplete="tel" required aria-invalid={err('contact') !== undefined || undefined} />,
        'Numéro ou e-mail, pour vous joindre si besoin. Il n’est jamais publié.')}

      {state.message === undefined ? null : (
        <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-13 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-header hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? 'Envoi…' : 'Envoyer mon offre'}
      </button>
    </form>
  );
}
