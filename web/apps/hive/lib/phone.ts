/**
 * Identité par numéro de téléphone.
 *
 * Supabase Auth est utilisé en email/mot de passe, mais l'identifiant réel de
 * la cible est son numéro : à Abidjan, beaucoup d'utilisateurs n'ont pas
 * d'adresse email et tout le monde a un numéro. Le numéro est donc transformé
 * en pseudo-email `0700000000@everyday.co`, exactement comme le fait la
 * fonction SQL `public.normalize_phone_to_email` — les deux doivent rester
 * identiques, sinon un compte créé côté web serait introuvable côté base.
 *
 * Effet de bord recherché : aucun SMS n'est envoyé, donc aucun coût par
 * inscription, ce qui compte pour un lancement sans budget.
 */

const DOMAIN = 'everyday.co';

/**
 * Ramène une saisie libre au format local à dix chiffres.
 *
 * Les numéros ivoiriens s'écrivent « 07 00 00 00 00 », « +225 07 00 00 00 00 »
 * ou « 002250700000000 » selon d'où l'on copie : les trois doivent désigner le
 * même compte. `null` si ce n'est pas un numéro ivoirien à dix chiffres.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00225')) digits = digits.slice(5);
  else if (digits.startsWith('225') && digits.length === 13) digits = digits.slice(3);
  return /^0[157]\d{8}$/.test(digits) ? digits : null;
}

/** Pseudo-email correspondant au numéro, ou `null` si le numéro est invalide. */
export function phoneToEmail(input: string): string | null {
  const phone = normalizePhone(input);
  return phone === null ? null : `${phone}@${DOMAIN}`;
}

/**
 * Numéro d'un compte, relu dans son pseudo-email, ou `null` si l'adresse
 * n'est pas un pseudo-email de numéro.
 *
 * C'est ainsi qu'on affiche à quelqu'un son propre numéro : la colonne
 * `profiles.phone` n'est plus lisible depuis les apps
 * (supabase/en-attente/20261002150100_profiles_telephone_prive.sql).
 */
export function phoneFromEmail(email: string | null | undefined): string | null {
  const [local, domain] = (email ?? '').split('@');
  return domain === DOMAIN && local !== undefined ? normalizePhone(local) : null;
}

/** Affichage groupé par deux, comme on dicte un numéro. */
export function formatPhone(phone: string): string {
  return phone.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}
