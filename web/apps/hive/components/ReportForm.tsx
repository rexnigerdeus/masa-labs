'use client';

import { useActionState, useState } from 'react';
import { reportListing, type FormState } from '../lib/actions/reports';
import { Button, Notice, Textarea } from './ui';

/**
 * Signalement d'une annonce.
 *
 * Replié par défaut : c'est le pendant de la publication immédiate, il doit
 * exister sur chaque annonce sans occuper la place d'une action utile.
 */
export function ReportForm({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(reportListing, null);

  if (state !== null && 'ok' in state) {
    return <Notice tone="success">Signalement transmis. Merci, nous allons regarder.</Notice>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-muted underline">
        Signaler cette annonce
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="listing_id" value={listingId} />
      <Textarea name="reason" rows={3} placeholder="Que reprochez-vous à cette annonce ?" />
      {state !== null && 'error' in state ? <Notice>{state.error}</Notice> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'Envoi…' : 'Envoyer'}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
      </div>
    </form>
  );
}
