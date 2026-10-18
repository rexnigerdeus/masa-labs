import { createClient, currentUser } from './supabase/server';

/**
 * Offres payantes et droits (brief v2, lot B). Serveur uniquement.
 *
 * `PAYMENTS_ENABLED` est l'interrupteur du brief : variable d'environnement
 * serveur, éteinte par défaut. Éteint, aucun paiement ne peut être lancé
 * (l'action de paiement le revérifie) et chaque bouton payant mène à la liste
 * d'attente. Les prix affichés ici sont ceux de la base
 * (`vitae_offer_price`), qui seule fixe le montant d'un paiement.
 */
export const PAYMENTS_ENABLED: boolean = process.env.PAYMENTS_ENABLED === 'true';

export type Offer = 'cv_credit' | 'pass_candidature';

export const OFFERS: Record<Offer, { name: string; amountXof: number; waitlist: 'cv_cible' | 'pass' }> = {
  cv_credit: { name: 'CV ciblé', amountXof: 500, waitlist: 'cv_cible' },
  pass_candidature: { name: 'Pass Candidature', amountXof: 2000, waitlist: 'pass' },
};

export function isOffer(value: unknown): value is Offer {
  return value === 'cv_credit' || value === 'pass_candidature';
}

/** « 2 000 F » : espace fine insécable des milliers, comme dans le brief. */
export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/\s/g, ' ')} F`;
}

export interface Rights {
  /** Fin du pass actif le plus tardif, ou `null`. */
  passEndsAt: string | null;
  /** Crédits CV non consommés. */
  credits: number;
  canCreateVersion: boolean;
  canCreateLetter: boolean;
}

const NO_RIGHTS: Rights = { passEndsAt: null, credits: 0, canCreateVersion: false, canCreateLetter: false };

/**
 * Droits du compte connecté, pour l'affichage. La décision réelle (créer une
 * version, une lettre) est prise par la base au moment de l'écriture ; ceci
 * ne sert qu'à montrer le bon bouton.
 */
export async function loadRights(): Promise<Rights> {
  const user = await currentUser();
  if (user === null) return NO_RIGHTS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vitae_entitlements')
    .select('type, credits_left, starts_at, ends_at, revoked_at')
    .eq('user_id', user.id)
    .is('revoked_at', null);
  if (error !== null || data === null) return NO_RIGHTS;

  const now = Date.now();
  let passEndsAt: string | null = null;
  let credits = 0;
  for (const row of data) {
    if (row.type === 'cv_credit') credits += (row.credits_left as number | null) ?? 0;
    if (
      row.type === 'pass_candidature'
      && new Date(row.starts_at as string).getTime() <= now
      && new Date(row.ends_at as string).getTime() > now
      && (passEndsAt === null || (row.ends_at as string) > passEndsAt)
    ) {
      passEndsAt = row.ends_at as string;
    }
  }
  return {
    passEndsAt,
    credits,
    canCreateVersion: passEndsAt !== null || credits > 0,
    canCreateLetter: passEndsAt !== null,
  };
}

/** true si le pass se termine dans les trois jours (rappel du brief). */
export function passEndsSoon(rights: Rights, now: number = Date.now()): boolean {
  if (rights.passEndsAt === null) return false;
  const left = new Date(rights.passEndsAt).getTime() - now;
  return left > 0 && left <= 3 * 86_400_000;
}
