/**
 * Adresse publique de l'application, pour les métadonnées de partage.
 *
 * Vercel renseigne `VERCEL_PROJECT_PRODUCTION_URL` tout seul : seul un
 * domaine personnalisé demande d'écrire `NEXT_PUBLIC_APP_URL`. Le nom
 * « Sowly » n'est pas encore vérifié comme marque ni comme domaine (brief
 * §11.1) : aucun domaine n'est donc écrit en dur.
 */
export const APP_URL: string =
  process.env.NEXT_PUBLIC_APP_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL !== undefined
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3003');
