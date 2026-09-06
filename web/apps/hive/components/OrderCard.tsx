import Link from 'next/link';
import { Badge } from './ui';
import { advanceOrder } from '../lib/actions/orders';
import {
  ORDER_STATUS_LABELS, TRANSITION_LABELS, allowedTransitions, type Party,
} from '../lib/orders';
import { PAYMENT_METHOD_LABELS } from '../lib/payments';
import { formatFcfa } from '../lib/pricing';
import { formatPhone } from '../lib/phone';
import { coverUrl } from '../lib/storage';
import type { OrderWithListing } from '../lib/db/orders';

/**
 * Une commande, vue du client ou du loueur.
 *
 * Les actions proposées viennent de la table des transitions : l'écran ne
 * connaît pas les règles, il affiche ce que `allowedTransitions` autorise
 * pour ce rôle. Le serveur revérifie de toute façon avant d'écrire.
 */
export function OrderCard({ order, party }: { order: OrderWithListing; party: Party }) {
  const counterpart = party === 'buyer' ? order.seller : order.buyer;
  const cover = coverUrl(order.listing?.photos ?? []);
  const actions = allowedTransitions(order.status, party);

  // Le numéro n'apparaît qu'une fois la commande confirmée : avant, la
  // messagerie suffit, et rien ne justifie de diffuser un téléphone.
  const showPhone = order.status === 'confirmee' || order.status === 'en_cours';

  return (
    <article className="card flex flex-col gap-3 p-4 sm:flex-row">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface">
        {cover !== null ? (
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={order.status === 'terminee' ? 'success' : 'neutral'}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
          <Badge tone={order.kind === 'location' ? 'rent' : 'sale'}>
            {order.kind === 'location' ? 'Location' : 'Achat'}
          </Badge>
        </div>

        <Link href={`/annonces/${order.listing_id}`} className="font-medium hover:underline">
          {order.listing?.title ?? 'Annonce supprimée'}
        </Link>

        {order.start_date !== null && order.end_date !== null ? (
          <p className="text-sm text-muted">Du {order.start_date} au {order.end_date}</p>
        ) : null}

        <p className="text-sm text-muted">
          {party === 'buyer' ? 'Loueur' : 'Client'} :{' '}
          {counterpart?.full_name ?? 'Utilisateur Hive'}
          {showPhone && counterpart?.phone != null
            ? ` · ${formatPhone(counterpart.phone)}`
            : null}
        </p>

        <p className="text-sm text-muted">{PAYMENT_METHOD_LABELS[order.payment_method]}</p>

        {order.message !== null ? (
          <p className="text-sm text-muted">« {order.message} »</p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <p className="font-semibold text-primary">{formatFcfa(order.total_amount)}</p>

        {actions.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-2">
            {actions.map((to) => (
              <form action={advanceOrder} key={to}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="to" value={to} />
                <button
                  type="submit"
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    to === 'annulee'
                      ? 'border border-line text-muted'
                      : 'bg-primary text-white hover:bg-primary-light'
                  }`}
                >
                  {TRANSITION_LABELS[to]}
                </button>
              </form>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
