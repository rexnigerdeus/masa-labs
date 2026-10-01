'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadDraft, loadDraftId } from '../../lib/draft';
import { hasContent } from '../../lib/wizard';

/**
 * Signale un CV commencé sur cet appareil qui n'est pas encore dans le compte.
 *
 * Cas typique : on a rempli son CV sans compte, puis on s'est connecté depuis
 * le menu plutôt que depuis le bouton de téléchargement. Le CV n'arrive en
 * ligne qu'à l'ouverture de l'éditeur ; sans ce rappel, la liste paraîtrait
 * l'avoir perdu.
 */
export function LocalDraftNotice() {
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
        Un CV commencé sur cet appareil (« {name} ») n’est pas encore dans votre compte.
      </p>
      <Link
        href="/cv"
        className="inline-flex min-h-11 items-center rounded-full bg-header px-4 text-sm font-semibold text-white"
      >
        Le reprendre et l’enregistrer
      </Link>
    </div>
  );
}
