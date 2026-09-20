import type { NextConfig } from 'next';

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
};

export default config;
