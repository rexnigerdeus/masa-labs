import type { NextConfig } from 'next';

const config: NextConfig = {
  images: {
    // Les photos d'annonces sont servies par Supabase Storage. Elles sont déjà
    // compressées dans le navigateur avant l'envoi (lib/photos.ts) : on ne
    // repasse pas derrière avec l'optimiseur de Next, qui coûterait une
    // fonction serveur par vignette pour un gain nul.
    unoptimized: true,
  },
};

export default config;
