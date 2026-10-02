import type { NextConfig } from 'next';

/**
 * En-têtes de sécurité, sur toutes les réponses. Vercel pose déjà HSTS.
 *
 *   X-Frame-Options + frame-ancestors   la page ne s'affiche dans l'iframe
 *                                       d'aucun autre site : pas de bouton
 *                                       piégé sous un calque (clickjacking)
 *   X-Content-Type-Options              le navigateur s'en tient au type
 *                                       annoncé, il ne « devine » pas un script
 *   Referrer-Policy                     les autres sites ne voient que notre
 *                                       domaine, jamais le chemin (/cv?id=…)
 *   Permissions-Policy                  caméra, micro, géolocalisation… coupés :
 *                                       aucun écran ne s'en sert (les photos
 *                                       passent par le sélecteur de fichiers)
 *
 * Pas de CSP sur les scripts : Next injecte des scripts en ligne, et une
 * politique stricte demande des nonces par requête — ce qui rendrait
 * dynamiques des pages volontairement statiques. Même bloc dans les quatre
 * apps du workspace.
 */
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
];

/**
 * Site vitrine The Everyday Co.
 *
 * Déployé séparément des applications (brief §8) : un domaine, un cycle de
 * vie. Le site est entièrement statique, il n'a ni base de données ni
 * session.
 */
const config: NextConfig = {
  // Le langage visuel partagé est publié en TypeScript brut, comme les
  // autres packages du workspace : Next le compile lui-même.
  transpilePackages: ['@everyday/labs-ui'],

  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default config;
