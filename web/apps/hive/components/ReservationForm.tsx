'use client';

import { useActionState, useState } from 'react';
import { requestOrder, type FormState } from '../lib/actions/orders';
import { computeRentQuote, formatFcfa } from '../lib/pricing';
import { PAYMENT_METHOD_LABELS } from '../lib/payments';
import { today } from '../lib/dates';
import { Button, Field, Input, Notice, Select, Textarea } from './ui';
import type { Listing, PaymentMethod } from '../lib/types';

/**
 * Demande de réservation ou d'achat.
 *
 * Le devis affiché pendant la saisie est un aperçu : le serveur le recalcule
 * à l'identique avant d'écrire la commande (lib/actions/orders.ts). Les deux
 * appellent la même fonction, c'est ce qui garantit que le prix annoncé est
 * le prix retenu.
 */
export function ReservationForm({ listing, methods }: {
  listing: Listing; methods: PaymentMethod[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestOrder, null);

  const modes = [
    ...(listing.for_rent ? [{ id: 'location', label: 'Louer' }] : []),
    ...(listing.for_sale ? [{ id: 'achat', label: 'Acheter' }] : []),
  ];
  const [kind, setKind] = useState(modes[0]?.id ?? 'location');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const quote = kind === 'location' && start !== '' && end !== ''
    ? computeRentQuote(listing, start, end)
    : null;

  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <input type="hidden" name="listing_id" value={listing.id} />

      {modes.length > 1 ? (
        <div className="flex gap-2 text-sm">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setKind(m.id)}
              className={`rounded-full px-3 py-1.5 ${
                kind === m.id ? 'bg-primary text-white' : 'border border-line bg-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="font-medium">{modes[0]?.label ?? 'Réserver'}</p>
      )}
      <input type="hidden" name="kind" value={kind} />

      {kind === 'location' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Du">
            <Input
              type="date"
              name="start_date"
              min={today()}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </Field>
          <Field label="Au">
            <Input
              type="date"
              name="end_date"
              min={start === '' ? today() : start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
            />
          </Field>
        </div>
      ) : null}

      {methods.length > 1 ? (
        <Field label="Paiement">
          <Select name="payment_method" defaultValue={methods[0]}>
            {methods.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </Select>
        </Field>
      ) : (
        <>
          <input type="hidden" name="payment_method" value={methods[0] ?? 'main_propre'} />
          <p className="text-sm text-muted">
            Paiement : {PAYMENT_METHOD_LABELS[methods[0] ?? 'main_propre']}
          </p>
        </>
      )}

      <Field label="Message au loueur" hint="Facultatif — l’usage prévu, l’heure de retrait…">
        <Textarea name="message" rows={3} />
      </Field>

      <div className="rounded-lg bg-surface px-3 py-2 text-sm">
        {kind === 'achat' ? (
          <p className="font-semibold">
            Prix : {formatFcfa(listing.sale_price ?? 0)}
          </p>
        ) : quote === null ? (
          <p className="text-muted">Choisissez les dates pour voir le total.</p>
        ) : (
          <>
            <p className="font-semibold">Total : {formatFcfa(quote.total)}</p>
            <p className="text-muted">
              {quote.days} jour{quote.days > 1 ? 's' : ''}
              {quote.weeklyApplied
                ? ` · tarif semaine appliqué (${quote.weeks} semaine${quote.weeks > 1 ? 's' : ''}`
                  + `${quote.extraDays > 0 ? ` + ${quote.extraDays} jour${quote.extraDays > 1 ? 's' : ''}` : ''})`
                : null}
            </p>
          </>
        )}
      </div>

      {state !== null && 'error' in state ? <Notice>{state.error}</Notice> : null}

      <Button type="submit" variant="solid" disabled={pending}>
        {pending ? 'Envoi…' : 'Envoyer la demande'}
      </Button>

      <p className="text-xs text-muted">
        Rien n’est débité : le loueur reçoit votre demande et la confirme.
      </p>
    </form>
  );
}
