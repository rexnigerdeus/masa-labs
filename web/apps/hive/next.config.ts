import type { NextConfig } from 'next';

const config: NextConfig = {
  // Le langage visuel partagé est publié en TypeScript brut, comme les
  // autres packages du workspace : Next le compile lui-même.
  transpilePackages: ['@everyday/labs-ui'],

  images: {
    // Les photos d'annonces sont servies par Supabase Storage. Elles sont déjà
    // compressées dans le navigateur avant l'envoi (lib/photos.ts) : on ne
    // repasse pas derrière avec l'optimiseur de Next, qui coûterait une
    // fonction serveur par vignette pour un gain nul.
    unoptimized: true,
  },
};

export default config;
