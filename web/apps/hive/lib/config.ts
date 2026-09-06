/**
 * Adresses et drapeaux publics de l'application.
 *
 * Rien n'est codé en dur : avant le déploiement, aucun domaine n'existe, et un
 * lien vers un domaine imaginaire est pire qu'une absence de lien.
 */

/**
 * Origine de l'application, pour les métadonnées de partage.
 *
 * Vercel renseigne `VERCEL_PROJECT_PRODUCTION_URL` tout seul : le déploiement
 * se résout sans configuration, seul un domaine personnalisé demande d'écrire
 * la variable.
 */
export const APP_URL: string =
  process.env.NEXT_PUBLIC_APP_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL !== undefined
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3002');

/**
 * Numéro WhatsApp du support, ou `null`.
 *
 * Le brief en fait un canal de lancement (§6.5) : pendant les premières
 * semaines, la moitié des frictions se règlent par un message. Absent, le pied
 * de page n'affiche simplement rien.
 */
export const SUPPORT_WHATSAPP: string | null =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP !== undefined
  && process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP !== ''
    ? process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP
    : null;
