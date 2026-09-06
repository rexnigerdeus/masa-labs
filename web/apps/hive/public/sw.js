/**
 * Service worker de Hive.
 *
 * Portée volontairement réduite : rendre l'application installable et lui
 * permettre de s'ouvrir sans réseau. Rien de plus. Les annonces ne sont pas
 * mises en cache — un matériel déjà loué qu'on affiche comme disponible fait
 * perdre un déplacement à quelqu'un, ce qui est pire que pas d'annonce.
 *
 * Écrit à la main plutôt qu'avec next-pwa : le générateur embarque Workbox et
 * un cache agressif, deux choses qui vont contre la contrainte de poids.
 */

const VERSION = 'hive-v1';
const SHELL = ['/', '/hors-ligne'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      // `addAll` échoue en bloc si une seule URL manque : on tolère les ratés.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Jamais de cache sur l'authentification ni sur les routes de données :
  // servir une réponse périmée déconnecterait l'utilisateur ou, pire, lui
  // montrerait l'état d'un autre compte.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Les fichiers versionnés par le build sont immuables : cache d'abord.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(caches.match(request).then((hit) => hit ?? fetchAndCache(request)));
    return;
  }

  // Pages : réseau d'abord, page hors-ligne en dernier recours. L'inverse
  // montrerait des prix périmés à quelqu'un de parfaitement connecté.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((hit) => hit ?? caches.match('/hors-ligne'))),
    );
    return;
  }

  event.respondWith(fetchAndCache(request).catch(() => caches.match(request)));
});

function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(VERSION).then((cache) => cache.put(request, copy));
    }
    return response;
  });
}
