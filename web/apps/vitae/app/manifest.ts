import type { MetadataRoute } from 'next';

/**
 * Manifeste PWA.
 *
 * Servi par Next sur /manifest.webmanifest. Rend Vitae installable sur mobile,
 * ce qui compte pour la cible : une icône sur l'écran d'accueil évite de
 * retaper une URL, et l'application s'ouvre sans la barre du navigateur.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vitae — Créez un CV lisible par les recruteurs',
    short_name: 'Vitae',
    description:
      'Créez gratuitement un CV professionnel compatible ATS, trouvez des offres '
      + 'de stage et d’emploi en Côte d’Ivoire, et apprenez les codes du recrutement.',
    lang: 'fr',
    dir: 'ltr',
    start_url: '/',
    // L'éditeur est l'écran le plus utile : on y arrive en un raccourci.
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f1f1ef',
    theme_color: '#17210c',
    categories: ['productivity', 'business', 'education'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Mon CV', url: '/cv' },
      { name: 'Offres', url: '/offres' },
    ],
  };
}
