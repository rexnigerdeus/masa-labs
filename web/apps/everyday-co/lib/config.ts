/**
 * Adresses publiques du site vitrine.
 */

/**
 * Origine du site lui-même, pour les métadonnées de partage. Vercel renseigne
 * `VERCEL_PROJECT_PRODUCTION_URL` automatiquement.
 */
export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL !== undefined
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

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
  if (configured !== undefined && configured !== '') return configured;

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
 * Adresse de contact.
 *
 * `null` tant qu'aucune boîte n'est confirmée : afficher une adresse qui
 * rebondit coûte plus qu'un lien manquant.
 */
export const CONTACT_EMAIL: string | null = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? null;
