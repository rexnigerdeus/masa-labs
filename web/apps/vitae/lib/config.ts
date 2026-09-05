/**
 * Adresses publiques de l'application.
 *
 * Rien n'est codé en dur : avant le déploiement, aucun domaine n'existe, et un
 * lien vers un domaine imaginaire est pire qu'une absence de lien — il casse
 * la confiance au moment précis où l'on demande à quelqu'un de s'inscrire.
 */

/**
 * Origine de l'application elle-même, pour les métadonnées de partage.
 *
 * Vercel renseigne `VERCEL_PROJECT_PRODUCTION_URL` tout seul : le déploiement
 * se résout donc sans configuration manuelle, et seul un domaine personnalisé
 * demande d'écrire la variable.
 */
export const APP_URL: string =
  process.env.NEXT_PUBLIC_APP_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL !== undefined
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

/**
 * Site vitrine The Everyday Co, déployé séparément (brief §8).
 *
 * `null` tant que la variable n'est pas définie : le pied de page affiche
 * alors le nom sans lien, plutôt qu'un lien mort.
 */
export const SITE_URL: string | null = process.env.NEXT_PUBLIC_SITE_URL ?? null;
