import type { NextConfig } from 'next';

const config: NextConfig = {
  // Les packages du workspace sont publiés en TypeScript brut : Next les
  // compile lui-même, ce qui évite une étape de build intermédiaire.
  transpilePackages: ['@everyday/cv-core', '@everyday/cv-pdf', '@everyday/labs-ui'],

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
};

export default config;
