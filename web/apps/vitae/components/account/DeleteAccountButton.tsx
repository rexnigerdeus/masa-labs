'use client';

import { useState } from 'react';
import { deleteMyAccount } from '../../lib/account';
import { clearDraft } from '../../lib/draft';

/**
 * Bouton « Supprimer mon compte et mes CV ».
 *
 * Deux gestes plutôt qu'une boîte `confirm()` : le second bouton dit en
 * toutes lettres ce qui va disparaître. Le brouillon de cet appareil part
 * aussi — garder en local un CV qu'on vient de demander à effacer serait
 * l'inverse de la demande.
 */
export function DeleteAccountButton() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'busy'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function confirm(): Promise<void> {
    setStep('busy');
    setError(null);
    const outcome = await deleteMyAccount();
    if (!outcome.ok) {
      setError(outcome.error ?? 'La suppression n’a pas abouti.');
      setStep('confirm');
      return;
    }
    clearDraft();
    window.location.href = `/compte?supprime=${outcome.scope ?? 'donnees'}`;
  }

  if (step === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setStep('confirm')}
        className="inline-flex min-h-11 items-center rounded-full border border-danger/40 bg-white px-4 text-sm font-semibold text-danger hover:bg-danger/5"
      >
        Supprimer mon compte et mes CV
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-danger/40 bg-white p-4" role="group" aria-labelledby="suppression-titre">
      <p id="suppression-titre" className="text-sm font-semibold">
        Tous vos CV et vos lettres seront effacés tout de suite, ainsi que le
        brouillon de ce téléphone. Ce n’est pas réversible.
      </p>
      {error === null ? null : <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={step === 'busy'}
          className="inline-flex min-h-11 items-center rounded-full bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {step === 'busy' ? 'Suppression…' : 'Oui, tout supprimer'}
        </button>
        <button
          type="button"
          onClick={() => setStep('idle')}
          disabled={step === 'busy'}
          className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-muted hover:text-ink"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
