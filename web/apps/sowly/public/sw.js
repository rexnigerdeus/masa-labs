/**
 * Service worker de Sowly.
 *
 * Contrairement à Hive et Vitae, Sowly est offline-first en entier (brief
 * §4) : chaque écran doit s'ouvrir sans réseau. C'est possible parce que
 * toutes les pages sont des coquilles statiques — les données vivent dans
 * `localStorage`, pas dans le HTML. Servir une coquille en cache ne montre
 * donc jamais une donnée périmée.
 *
 * Stratégie :
 *   - à l'installation, on met en cache chaque écran **et** les fichiers
 *     JS/CSS qu'il référence : sans eux, un écran jamais visité ne
 *     s'ouvrirait pas hors-ligne ;
 *   - pages : cache d'abord, mise à jour en arrière-plan (stale-while-
 *     revalidate) — l'application s'ouvre instantanément, même en 2G ;
 *   - `/_next/static/` : versionné par le build, donc immuable, cache d'abord.
 *
 * Écrit à la main plutôt qu'avec next-pwa : le générateur embarque Workbox,
 * deux fois le poids de ce fichier pour les mêmes trois règles.
 */

const VERSION = 'sowly-v2';
const PAGES = [
  '/',
  '/bienvenue',
  '/premiers-pas',
  '/taches',
  '/habitude',
  '/habitudes/nouvelle',
  '/reglages',
  '/connexion',
  '/hors-ligne',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      // `allSettled` : une page en échec ne doit pas faire échouer toute
      // l'installation.
      .then((cache) => Promise.allSettled(PAGES.map((url) => cachePage(cache, url))))
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
  // Supabase et tout autre domaine : jamais interceptés. Les données
  // passent par la file de synchronisation, pas par le cache HTTP.
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icon')) {
    event.respondWith(caches.match(request).then((hit) => hit ?? fetchAndCache(request)));
    return;
  }

  if (request.mode === 'navigate') {
    // La clé de cache ignore `?vue=`, `?liste=`, `?id=` : la coquille est la
    // même pour toutes, c'est le JavaScript qui lit le paramètre.
    const key = url.pathname;
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(key);
        const refresh = cachePage(cache, key).catch(() => undefined);
        if (hit !== undefined) {
          event.waitUntil(refresh);
          return hit;
        }
        return (await refresh) ?? (await cache.match('/hors-ligne')) ?? Response.error();
      }),
    );
  }
});

/**
 * Met en cache une page et les fichiers statiques qu'elle référence. Une
 * page mise à jour en arrière-plan pointe vers les fichiers du nouveau
 * build : il faut les avoir avant de la servir hors-ligne.
 */
async function cachePage(cache, url) {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) return undefined;
  const html = await response.clone().text();
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [])];
  await Promise.allSettled(assets.map(async (asset) => {
    if (await cache.match(asset)) return;
    await cache.add(asset);
  }));
  await cache.put(url, response.clone());
  return response;
}

function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(VERSION).then((cache) => cache.put(request, copy));
    }
    return response;
  });
}
