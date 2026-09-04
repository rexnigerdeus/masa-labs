import type { NextConfig } from 'next';

const config: NextConfig = {
  // Les packages du workspace sont publiés en TypeScript brut : Next les
  // compile lui-même, ce qui évite une étape de build intermédiaire.
  transpilePackages: ['@everyday/cv-core', '@everyday/cv-pdf'],

  // @react-pdf/renderer et unpdf embarquent des binaires et des chemins de
  // fichiers (les polices) : ils doivent rester externes au bundle serveur.
  serverExternalPackages: ['@react-pdf/renderer', 'unpdf'],

  // Les .ttf embarquées dans le PDF sont lues sur le disque à l'exécution :
  // sans ça, elles ne suivent pas dans le bundle déployé sur Vercel.
  outputFileTracingIncludes: {
    '/api/export': ['../../packages/cv-pdf/fonts/**'],
  },

  experimental: {
    // Contrainte « réseau lent » : on n'expédie que ce qui est utilisé.
    optimizePackageImports: ['@everyday/cv-core'],
  },
};

export default config;
