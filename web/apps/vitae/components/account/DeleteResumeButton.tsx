'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearDraft, loadDraftId } from '../../lib/draft';
import { deleteResume } from '../../lib/resumes';

/**
 * Suppression d'un CV, avec confirmation.
 *
 * Si ce CV est aussi celui du brouillon de cet appareil, le brouillon part
 * avec lui : sinon l'éditeur le rouvrirait et tenterait de mettre à jour une
 * ligne qui n'existe plus.
 */
export function DeleteResumeButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(): Promise<void> {
    if (!window.confirm(`Supprimer définitivement « ${label} » ?`)) return;
    setBusy(true);
    setError(null);
    const outcome = await deleteResume(id);
    if (outcome.ok) {
      if (loadDraftId() === id) clearDraft();
      router.refresh();
    } else {
      setError(outcome.error ?? 'Suppression impossible.');
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void remove()}
        disabled={busy}
        className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-muted underline-offset-4 hover:text-danger hover:underline disabled:opacity-60"
      >
        {busy ? 'Suppression…' : 'Supprimer'}
      </button>
      {error !== null ? <p role="alert" className="w-full text-sm text-danger">{error}</p> : null}
    </>
  );
}
