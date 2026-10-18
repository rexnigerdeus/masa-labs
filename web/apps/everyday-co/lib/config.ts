/**
 * Adresses publiques du site vitrine.
 */

/**
 * Origine du site lui-même : métadonnées, canonique, plan du site, et cible
 * de la redirection depuis l'ancienne adresse vercel.app (next.config.ts).
 * À renseigner avec le domaine propre dès qu'il est relié au projet ; Vercel
 * fournit `VERCEL_PROJECT_PRODUCTION_URL` en attendant.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL !== undefined
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/$/, '');

/**
 * Adresse de l'application Vitae.
 *
 * Vitae a son propre domaine et vit indépendamment du site (brief §8, « double
 * point d'accès ») : la vitrine y renvoie, elle ne l'héberge pas.
 *
 * Le build échoue si la variable manque en production. C'est volontaire : la
 * page entière est une invitation à ouvrir Vitae, et une vitrine dont tous les
 * boutons mènent à un domaine imaginaire est pire qu'une page absente. Mieux
 * vaut casser le déploiement que publier des liens morts.
 */
function resolveVitaeUrl(): string {
  const configured = process.env.NEXT_PUBLIC_VITAE_URL;
  if (configured !== undefined && configured !== '') return configured.replace(/\/$/, '');

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_VITAE_URL est absente. Renseignez l’adresse de l’application '
      + 'Vitae avant de déployer le site : tous ses appels à l’action y mènent.',
    );
  }
  return 'http://localhost:3000';
}

export const VITAE_URL: string = resolveVitaeUrl();

/**
 * Lien vers Vitae tel que le site le publie : marqué `?ref=everydayco`
 * (brief v2, « Mesure ») pour que Vitae sache combien de visiteurs la vitrine
 * lui apporte. Tous les liens vers Vitae passent par ici, aucun n'est écrit
 * à la main.
 */
export function vitaeLink(path = '/'): string {
  const url = new URL(path, `${VITAE_URL}/`);
  url.searchParams.set('ref', 'everydayco');
  return url.toString();
}

export const VITAE_LINK: string = vitaeLink();

/**
 * Adresse de contact : « Organiser un atelier », « Nous écrire », pied de
 * page, mentions légales.
 *
 * Temporaire : la boîte de la fondatrice, tant que le domaine n'est pas
 * acheté (décision de Daniel, 18/10/2026). Le brief v2 demande ensuite
 * contact@<domaine> à la place de toute adresse Gmail : il suffira de
 * renseigner `NEXT_PUBLIC_CONTACT_EMAIL`, sans toucher au code.
 */
const TEMPORARY_CONTACT_EMAIL = 'bambaradeborah2007@gmail.com';

export const CONTACT_EMAIL: string =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || TEMPORARY_CONTACT_EMAIL;

/** Objet imposé par le brief v2 au bouton « Organiser un atelier ». */
export const WORKSHOP_SUBJECT = 'Atelier CV Vitae';

/**
 * Chaîne WhatsApp de Vitae (« Suivre sur WhatsApp »). `null` tant qu'elle
 * n'est pas renseignée : le bouton et le lien de pied de page s'effacent
 * plutôt que de mener nulle part.
 */
export const WHATSAPP_CHANNEL_URL: string | null =
  process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL?.trim() || null;

/**
 * Politique de confidentialité de Vitae, vers laquelle renvoie la page
 * /confidentialite pour les données des CV. Publiée par Vitae elle-même
 * (apps/vitae/app/confidentialite).
 */
export const VITAE_PRIVACY_URL: string = `${VITAE_URL}/confidentialite`;
