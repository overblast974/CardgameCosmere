const CACHE_NAME = 'roshar-cache-v2';
const SCOPE = self.registration.scope;
const PRECACHE_URLS = [SCOPE, `${SCOPE}index.html`, `${SCOPE}manifest.json`];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord : une fois en ligne, on récupère toujours la dernière version
// déployée. Le cache ne sert que de secours hors-ligne, sinon un PWA installé
// resterait bloqué indéfiniment sur le premier build mis en cache.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
