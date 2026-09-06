import type { PaymentMethod } from './types.ts';

/**
 * Paiement — brief §3.7 et §7.
 *
 * Les deux modes sont prévus dans le schéma dès maintenant ; seul le main
 * propre est ouvert au lancement, le temps que le compte marchand chez
 * l'agrégateur Mobile Money soit actif. Le drapeau suffit alors à ouvrir le
 * second mode : aucune migration, aucune commande à reprendre.
 *
 * Hive n'encaisse jamais et ne prélève aucune commission pendant la période
 * de lancement : l'argent va du client au loueur, directement.
 */
export const ONLINE_PAYMENT_ENABLED: boolean =
  process.env.NEXT_PUBLIC_ONLINE_PAYMENT_ENABLED === 'true';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  main_propre: 'En main propre, à la remise du matériel',
  en_ligne: 'En ligne (Mobile Money ou carte)',
};

/**
 * Modes proposés au client : ceux que le loueur accepte, moins ceux que la
 * plateforme n'a pas encore ouverts.
 */
export function availablePaymentMethods(seller: {
  accepts_cash: boolean;
  accepts_online: boolean;
}): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  if (seller.accepts_cash) methods.push('main_propre');
  if (seller.accepts_online && ONLINE_PAYMENT_ENABLED) methods.push('en_ligne');
  // Un loueur qui n'accepterait que le paiement en ligne avant son ouverture
  // se retrouverait injoignable : on retombe sur le main propre.
  return methods.length > 0 ? methods : ['main_propre'];
}
