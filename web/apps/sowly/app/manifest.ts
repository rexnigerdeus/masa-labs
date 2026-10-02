import type { MetadataRoute } from 'next';

/**
 * Manifeste PWA, servi sur /manifest.webmanifest : c'est ce qui rend Sowly
 * installable sur mobile et sur ordinateur (brief §4), sans passer par un store.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sowly — Graines d’Habitudes',
    short_name: 'Sowly',
    description: 'Suis tes habitudes. Gère tes tâches. Sans limite.',
    lang: 'fr',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f8f5',
    theme_color: '#f7f8f5',
    categories: ['productivity', 'lifestyle', 'health'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Aujourd’hui', url: '/' },
      { name: 'Ma journée', url: '/taches?vue=ma-journee' },
      { name: 'Nouvelle habitude', url: '/habitudes/nouvelle' },
    ],
  };
}
