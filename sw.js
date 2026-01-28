/* =====================================================
   SERVICE WORKER – ABANG KUCING (PWA)
   - Cache static assets for fast load
   - Offline fallback for navigation requests
   ===================================================== */

const CACHE_VERSION = 'ak-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/style.css',
  '/js/pwa.js',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('ak-') && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isSameOrigin(request) {
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Only cache same-origin assets (do not touch Supabase/API calls)
  if (!isSameOrigin(req)) return;

  const accept = req.headers.get('accept') || '';
  const isNav = req.mode === 'navigate' || accept.includes('text/html');

  if (isNav) {
    // Network-first for HTML so updates come through
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match('/offline.html');
        })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});

