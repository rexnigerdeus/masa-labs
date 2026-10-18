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

/**
 * Adresse de contact, citée par la page /confidentialite.
 *
 * Temporaire : la boîte de la fondatrice, en attendant contact@<domaine>
 * (décision de Daniel, 18/10/2026). Renseigner `NEXT_PUBLIC_CONTACT_EMAIL`
 * suffira à la remplacer, sans toucher au code.
 */
export const CONTACT_EMAIL: string =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'bambaradeborah2007@gmail.com';

/**
 * Chaîne WhatsApp « Vitae — Stages & premiers emplois » (brief v2, lot A).
 *
 * `null` tant que la chaîne n'existe pas : les trois emplacements prévus
 * (écran après téléchargement, /offres, pied de page) n'affichent alors pas
 * le bouton, plutôt qu'un bouton qui mène nulle part. Aucun numéro n'est
 * publié : c'est un lien de chaîne (`https://whatsapp.com/channel/…`).
 */
export const WHATSAPP_CHANNEL_URL: string | null =
  process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL?.trim() || null;

/**
 * Anciennes adresses de Vitae, redirigées en 308 vers `APP_URL` une fois le
 * domaine définitif posé (brief v2, « Domaine ») — voir `middleware.ts`.
 * Les déploiements de prévisualisation (`vitae-git-…vercel.app`) ne sont pas
 * dans la liste : ils doivent rester consultables tels quels.
 */
export const LEGACY_HOSTS: readonly string[] = ['vitae-lemon.vercel.app'];

/**
 * Version de l'app portée par chaque événement de mesure : le commit déployé
 * sur Vercel (sept caractères), `dev` en local. Lue côté serveur seulement.
 */
export const APP_VERSION: string =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev';
