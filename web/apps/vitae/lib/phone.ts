/**
 * Numéros de téléphone ivoiriens.
 *
 * Même règle que Hive (apps/hive/lib/phone.ts) et que la fonction SQL
 * `public.normalize_phone_to_email` : le compte The Everyday Co. est partagé
 * entre les apps, un numéro doit y désigner la même personne partout. Copie
 * volontaire plutôt que package commun : trois fonctions de quelques lignes,
 * qu'un test de chaque côté garde alignées.
 */

const DOMAIN = 'everyday.co';

/**
 * Ramène une saisie libre au format local à dix chiffres (« 07 00 00 00 00 »,
 * « +225 07 00 00 00 00 », « 002250700000000 »). `null` si ce n'est pas un
 * numéro ivoirien à dix chiffres.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00225')) digits = digits.slice(5);
  else if (digits.startsWith('225') && digits.length === 13) digits = digits.slice(3);
  return /^0[157]\d{8}$/.test(digits) ? digits : null;
}

/** Pseudo-email du compte lié à ce numéro, ou `null` si le numéro est invalide. */
export function phoneToEmail(input: string): string | null {
  const phone = normalizePhone(input);
  return phone === null ? null : `${phone}@${DOMAIN}`;
}

/** Numéro relu dans un pseudo-email, ou `null` pour une vraie adresse. */
export function phoneFromEmail(email: string | null | undefined): string | null {
  const [local, domain] = (email ?? '').split('@');
  return domain === DOMAIN && local !== undefined ? normalizePhone(local) : null;
}

/** Affichage groupé par deux, comme on dicte un numéro. */
export function formatPhone(phone: string): string {
  return phone.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}
