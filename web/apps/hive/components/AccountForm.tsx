'use client';

import { useActionState } from 'react';
import { saveAccount, type FormState } from '../lib/actions/account';
import { COMMUNES } from '../lib/catalog';
import { ONLINE_PAYMENT_ENABLED } from '../lib/payments';
import { Button, Field, Input, Notice, Select, Textarea } from './ui';

/** Profil : ce sous quoi les autres vous voient, et comment vous acceptez d'être payé. */
export function AccountForm({ profile }: {
  profile: {
    fullName: string;
    commune: string | null;
    bio: string | null;
    acceptsCash: boolean;
    acceptsOnline: boolean;
  };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAccount, null);

  return (
    <form action={action} className="card flex max-w-lg flex-col gap-4 p-5">
      <Field label="Nom ou nom de votre activité">
        <Input name="full_name" defaultValue={profile.fullName} required />
      </Field>

      <Field label="Commune" hint="Pré-remplit vos futures annonces.">
        <Select name="commune" defaultValue={profile.commune ?? ''}>
          <option value="">Non précisée</option>
          {COMMUNES.map((commune) => <option key={commune}>{commune}</option>)}
        </Select>
      </Field>

      <Field label="Présentation" hint="Facultatif — affiché sur vos annonces.">
        <Textarea name="bio" rows={3} defaultValue={profile.bio ?? ''} />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Paiements acceptés</legend>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="accepts_cash" defaultChecked={profile.acceptsCash} />
          En main propre, à la remise du matériel
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="accepts_online" defaultChecked={profile.acceptsOnline} />
          En ligne (Mobile Money ou carte)
        </label>

        {!ONLINE_PAYMENT_ENABLED ? (
          <p className="text-xs text-muted">
            Le paiement en ligne n’est pas encore ouvert sur Hive. Vous pouvez
            déjà le cocher : il sera proposé à vos clients dès son activation.
          </p>
        ) : null}
      </fieldset>

      {state !== null && 'error' in state ? <Notice>{state.error}</Notice> : null}
      {state !== null && 'ok' in state ? <Notice tone="success">Profil enregistré.</Notice> : null}

      <Button type="submit" variant="solid" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
