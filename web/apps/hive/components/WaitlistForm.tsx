'use client';

import { useActionState } from 'react';
import { joinWaitlist, type WaitlistState } from '../lib/actions/waitlist';
import { Button, Field, Input, Notice } from './ui';

/**
 * Formulaire de la page d'attente. Fonctionne avant tout JavaScript (action
 * serveur) ; le client ne sert qu'à afficher la réponse sans recharger.
 */
export function WaitlistForm() {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, null);

  if (state !== null && 'ok' in state) {
    return (
      <Notice tone="success">
        C’est noté. On te prévient une seule fois, au retour de Hive.
      </Notice>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Ton numéro WhatsApp (pour être prévenu au retour)">
        <Input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="07 00 00 00 00"
          required
        />
      </Field>

      <label className="flex items-start gap-2 text-sm">
        {/* Décochée par défaut : le consentement se donne, il ne se présume pas. */}
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 accent-primary" />
        <span>J’accepte d’être contacté une seule fois, au retour de Hive.</span>
      </label>

      {state !== null && 'error' in state ? <Notice>{state.error}</Notice> : null}

      <Button type="submit" variant="solid" disabled={pending} className="self-start">
        Me prévenir
      </Button>
    </form>
  );
}
