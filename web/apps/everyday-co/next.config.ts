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
 * Ancienne adresse du site. Une fois le domaine propre renseigné dans
 * `NEXT_PUBLIC_SITE_URL`, toute requête qui arrive encore ici est renvoyée,
 * chemin compris, vers ce domaine en redirection permanente (308) : les
 * liens déjà partagés suivent, et les moteurs transfèrent le référencement.
 * Tant que la variable vaut l'adresse vercel.app ou manque, rien ne change.
 */
const LEGACY_HOST = 'the-everyday-co.vercel.app';

function siteHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (url === undefined || url === '') return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

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

  async redirects() {
    const host = siteHost();
    if (host === null || host === LEGACY_HOST) return [];
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: LEGACY_HOST }],
        destination: `https://${host}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default config;
