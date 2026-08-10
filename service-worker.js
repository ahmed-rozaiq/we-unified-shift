const CACHE_NAME = 'we-unified-shift-offline-v1';
const CORE_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      // Network first: when online, always get the newest roster/site version.
      const fresh = await fetch(req, { cache: 'no-store' });
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      // Offline: use the most recent copy that was successfully opened online.
      const cached = await caches.match(req);
      if (cached) return cached;

      // For page navigation, fall back to the saved main page.
      if (req.mode === 'navigate') {
        const home = await caches.match('/index.html') || await caches.match('/');
        if (home) return home;
      }
      throw err;
    }
  })());
});
