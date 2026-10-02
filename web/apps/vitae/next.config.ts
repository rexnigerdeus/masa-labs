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

const config: NextConfig = {
  // Les packages du workspace sont publiés en TypeScript brut : Next les
  // compile lui-même, ce qui évite une étape de build intermédiaire.
  transpilePackages: ['@everyday/cv-core', '@everyday/cv-pdf', '@everyday/labs-ui', '@everyday/pwa'],

  // @react-pdf/renderer et unpdf embarquent des binaires et des chemins de
  // fichiers (les polices) : ils doivent rester externes au bundle serveur.
  serverExternalPackages: ['@react-pdf/renderer', 'unpdf'],

  // Les .ttf embarquées dans le PDF sont lues sur le disque à l'exécution :
  // sans ça, elles ne suivent pas dans le bundle déployé sur Vercel.
  // Même chose pour pdfkit : il charge ses polices standard (Helvetica…) et ses
  // tables par un `require` dynamique que le traçage ne voit pas. Sans elles,
  // la route plante sur Vercel (« Cannot find module …/Helvetica.cjs ») alors
  // qu'elle fonctionne en local, où tout `node_modules` est présent.
  outputFileTracingIncludes: {
    '/api/export': [
      '../../packages/cv-pdf/fonts/**',
      '../../node_modules/pdfkit/js/standard-fonts/**',
      '../../node_modules/pdfkit/js/data/**',
    ],
  },

  experimental: {
    // Contrainte « réseau lent » : on n'expédie que ce qui est utilisé.
    optimizePackageImports: ['@everyday/cv-core'],
  },

  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default config;
