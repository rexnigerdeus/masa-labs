import type { Order, OrderStatus } from './types.ts';
import { rangesOverlap } from './dates.ts';

/**
 * Cycle de vie d'une commande.
 *
 * La règle vit ici, en fonction pure, et non dans une policy SQL : une
 * transition dépend de qui la demande et d'où l'on part, ce qu'un trigger
 * exprimerait mal et qu'aucun test ne pourrait vérifier simplement. La RLS
 * garde ce qu'elle sait garder — que seuls le client et le loueur touchent à
 * la ligne — et le serveur applique cette table avant toute écriture.
 */

export type Party = 'buyer' | 'seller';

/** Qui a le droit de passer de quel état à quel état. */
const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, Party[]>>> = {
  // Le loueur accepte ou refuse ; le client peut retirer sa demande.
  demandee: { confirmee: ['seller'], annulee: ['buyer', 'seller'] },
  // Le matériel part : c'est le loueur qui le constate, lui qui le remet.
  confirmee: { en_cours: ['seller'], annulee: ['buyer', 'seller'] },
  // Le matériel revient. Une location en cours ne s'annule plus : le
  // matériel est déjà sorti, l'annulation nierait ce qui s'est passé.
  en_cours: { terminee: ['seller'] },
  terminee: {},
  annulee: {},
};

export function canTransition(from: OrderStatus, to: OrderStatus, party: Party): boolean {
  return TRANSITIONS[from][to]?.includes(party) ?? false;
}

/** Transitions proposées à l'écran, dans l'ordre où elles se présentent. */
export function allowedTransitions(from: OrderStatus, party: Party): OrderStatus[] {
  return (Object.keys(TRANSITIONS[from]) as OrderStatus[])
    .filter((to) => canTransition(from, to, party));
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  demandee: 'Demande envoyée',
  confirmee: 'Confirmée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

/** Libellé du bouton qui déclenche la transition, du point de vue de celui qui clique. */
export const TRANSITION_LABELS: Record<OrderStatus, string> = {
  demandee: 'Renvoyer la demande',
  confirmee: 'Confirmer',
  en_cours: 'Matériel remis',
  terminee: 'Matériel rendu',
  annulee: 'Annuler',
};

/**
 * Commandes qui bloquent réellement le matériel.
 *
 * Une demande non confirmée ne bloque rien : sinon, quelqu'un pourrait geler
 * une caméra pour tout le mois de décembre sans que le loueur ait dit oui.
 */
export const BLOCKING_STATUSES: OrderStatus[] = ['confirmee', 'en_cours'];

/**
 * Le matériel est-il déjà pris sur ces dates ?
 *
 * Vérifié côté serveur juste avant l'insertion. Deux demandes simultanées
 * peuvent encore passer toutes les deux — c'est assumé au lancement : le
 * loueur voit les deux et n'en confirme qu'une, et une confirmation vaut plus
 * qu'un verrou en base pour du matériel qui se remet en main propre.
 */
export function hasDateConflict(
  orders: Pick<Order, 'status' | 'start_date' | 'end_date'>[],
  start: string,
  end: string,
): boolean {
  return orders.some((order) => {
    if (!BLOCKING_STATUSES.includes(order.status)) return false;
    if (order.start_date === null || order.end_date === null) return false;
    return rangesOverlap(order.start_date, order.end_date, start, end);
  });
}
