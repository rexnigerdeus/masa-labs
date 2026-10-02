import type { NextConfig } from 'next';

const config: NextConfig = {
  // Package du workspace publié en TypeScript brut : Next le compile lui-même.
  transpilePackages: ['@everyday/pwa'],

  // Aucune image distante ni photo d'utilisateur : rien à optimiser à la
  // volée, et pas de fonction serveur à payer par vignette.
  images: { unoptimized: true },
};

export default config;
