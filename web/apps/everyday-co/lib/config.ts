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
 * Adresse de contact, sur le domaine du site.
 *
 * Une adresse Gmail est refusée, même renseignée : le brief v2 demande
 * qu'aucune n'apparaisse plus, et la variable de production en contient
 * encore une au moment de l'écrire. Tant qu'aucune boîte sur le domaine
 * n'est confirmée, les liens de contact disparaissent plutôt que d'envoyer
 * vers une adresse personnelle.
 */
function resolveContactEmail(): string | null {
  const configured = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  if (configured === undefined || configured === '') return null;
  if (/@(gmail|googlemail)\.com$/i.test(configured)) {
    console.warn(
      `NEXT_PUBLIC_CONTACT_EMAIL (${configured}) est une adresse Gmail : ignorée. `
      + 'Renseignez contact@<domaine> pour afficher les liens de contact.',
    );
    return null;
  }
  return configured;
}

export const CONTACT_EMAIL: string | null = resolveContactEmail();

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
 * /confidentialite pour les données des CV. `null` tant que Vitae n'en
 * publie pas : la page le dit sans lien plutôt qu'avec un lien mort.
 */
export const VITAE_PRIVACY_URL: string | null =
  process.env.NEXT_PUBLIC_VITAE_PRIVACY_URL?.trim() || null;
