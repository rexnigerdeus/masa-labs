'use client';

import { useActionState } from 'react';
import { createVersion, type VersionState } from '../../lib/versions';

/**
 * Formulaire de version ciblée : quel CV copier, quel poste viser. Une seule
 * question obligatoire — le poste — parce que c'est elle qui fait la version.
 */
export function VersionForm({ sources, offer }: {
  sources: { id: string; label: string }[];
  /** Offre d'origine, si la personne vient d'une offre de /offres. */
  offer: { id: string; title: string; company: string } | null;
}) {
  const [state, action, pending] = useActionState<VersionState, FormData>(createVersion, {});

  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      {offer === null ? null : (
        <p className="rounded-xl bg-canvas px-3 py-2 text-sm">
          Pour l’offre : <strong>{offer.title}</strong> — {offer.company}
          <input type="hidden" name="offre" value={offer.id} />
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Poste visé avec cette version</span>
        <input
          name="title"
          required
          defaultValue={offer?.title ?? ''}
          placeholder="Animateur sportif, chargée de communication…"
          className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>

      {sources.length > 1 ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">À partir de</span>
          <select name="source" defaultValue={sources[0]?.id} className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base">
            {sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      ) : (
        <input type="hidden" name="source" value={sources[0]?.id ?? ''} />
      )}

      {state.error === undefined ? null : (
        <p role="alert" className="text-sm font-medium text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-13 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-header hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? 'Création…' : 'Créer cette version'}
      </button>
    </form>
  );
}
