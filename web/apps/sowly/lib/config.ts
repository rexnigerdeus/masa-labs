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

/**
 * Clé publique VAPID des rappels (Web Push). Publique par nature : le
 * navigateur la donne au service push pour n'accepter que les messages
 * signés par la clé privée, qui ne vit que dans les secrets de l'Edge
 * Function `sowly-push` (fichier local supabase/.env.sowly-push).
 */
export const VAPID_PUBLIC_KEY =
  'BHpHQQKrp9gCLsgliky8ELdaJ9fURe5RlB7hVwdQSxb3fvkX-brLMvylYAvKPNENpEphzi9zEwyvtHvzZb0cB6A';
