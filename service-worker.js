const CACHE_VERSION = 'finanzas-cache-v11';
const STABLE_TABLER_CSS = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.44.0/tabler-icons.min.css';
const CORE_ASSETS = [
  './',
  './index.html',
  './finanzas_tavo_app.html',
  './styles.css',
  './app.seed.js',
  './app.js',
  './app.data.js',
  './app.rules.js',
  './app.actions.js',
  './app.render.js',
  './app.i18n.js',
  './app.ia.js',
  './manifest.webmanifest',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  if (req.url === STABLE_TABLER_CSS) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (!res) return Response.error();
            // no-cors cross-origin CSS responses are opaque (status 0) but still cacheable.
            if (!(res.ok || res.type === 'opaque')) return res;
            const copy = res.clone();
            caches.open(CACHE_VERSION)
              .then((cache) => cache.put(req, copy))
              .catch(() => {});
            return res;
          })
          .catch(() => cached || Response.error());
      })
    );
    return;
  }

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (!res || res.status !== 200 || res.type !== 'basic') return res;
          const copy = res.clone();
          caches.open(CACHE_VERSION)
            .then((cache) => cache.put(req, copy))
            .catch(() => {});
          return res;
        })
        .catch(() => caches.match('./finanzas_tavo_app.html'));
    })
  );
});
