'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clearDraft, loadDraft, loadDraftId } from '../../lib/draft';
import { hasContent } from '../../lib/wizard';

/**
 * Signale un CV commencé sur cet appareil qui n'est pas encore dans le compte.
 *
 * Cas typique : on a rempli son CV sans compte, puis on s'est connecté depuis
 * le menu. Le CV n'arrive en ligne qu'à l'ouverture de l'éditeur ; sans ce
 * rappel, la liste paraîtrait l'avoir perdu.
 *
 * Lot B : si le compte a déjà son CV gratuit, ce brouillon ne peut pas y
 * entrer comme second CV gratuit. On le dit, et on propose de l'effacer de
 * l'appareil — sinon il resterait ouvert à la place des CV du compte.
 */
export function LocalDraftNotice({ hasPrimary }: { hasPrimary: boolean }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const draft = loadDraft();
    if (hasContent(draft) && loadDraftId() === null) {
      setName(draft.personal.fullName.trim() || 'Sans nom');
    }
  }, []);

  if (name === null) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3">
      <p className="text-sm text-header">
        {hasPrimary
          ? `Un CV commencé sur cet appareil (« ${name} ») n’est pas dans votre compte, qui a déjà son CV gratuit.`
          : `Un CV commencé sur cet appareil (« ${name} ») n’est pas encore dans votre compte.`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/cv"
          className="inline-flex min-h-11 items-center rounded-full bg-header px-4 text-sm font-semibold text-white"
        >
          {hasPrimary ? 'Le rouvrir' : 'Le reprendre et l’enregistrer'}
        </Link>
        {hasPrimary ? (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`Effacer « ${name} » de cet appareil ?`)) return;
              clearDraft();
              setName(null);
            }}
            className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-header underline"
          >
            L’effacer de cet appareil
          </button>
        ) : null}
      </div>
    </div>
  );
}
