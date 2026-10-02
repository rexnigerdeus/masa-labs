import type { NextConfig } from 'next';

const config: NextConfig = {
  // Aucune image distante ni photo d'utilisateur : rien à optimiser à la
  // volée, et pas de fonction serveur à payer par vignette.
  images: { unoptimized: true },
};

export default config;
