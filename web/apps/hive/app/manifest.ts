import type { MetadataRoute } from 'next';

/**
 * Manifeste PWA.
 *
 * Servi par Next sur /manifest.webmanifest. C'est ce qui rend Hive
 * installable depuis le navigateur : pas de passage par un store, pas de
 * téléchargement de 40 Mo — le point 4 du plan de lancement (brief §6).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hive — Louez et vendez du matériel audiovisuel à Abidjan',
    short_name: 'Hive',
    description:
      'Louez, vendez et trouvez du matériel audiovisuel, de sonorisation et de '
      + 'musique à Abidjan, entre particuliers et professionnels.',
    lang: 'fr',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fdf8f6',
    theme_color: '#9a2b32',
    categories: ['shopping', 'business', 'entertainment'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Rechercher du matériel', url: '/annonces' },
      { name: 'Publier une annonce', url: '/publier' },
    ],
  };
}
