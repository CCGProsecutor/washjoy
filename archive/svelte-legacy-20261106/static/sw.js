const CACHE_NAME = 'washjoy-shell-v1';
const SHELL_URL = new URL('./', self.registration.scope).href;
const CORE_URLS = [
  SHELL_URL,
  new URL('manifest.webmanifest', self.registration.scope).href,
  new URL('assets/washjoy-mark.svg', self.registration.scope).href,
  new URL('assets/washjoy-app-icon-192.png', self.registration.scope).href,
  new URL('assets/washjoy-app-icon-512.png', self.registration.scope).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('washjoy-shell-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/') || request.headers.has('authorization')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const isHome = url.pathname === new URL(SHELL_URL).pathname && !url.search;
      if (!response.ok || !isHome) return response;
      return caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, response.clone()))
        .then(() => response);
    }).catch(async () => (await caches.match(request)) || (await caches.match(SHELL_URL)) || Response.error()));
    return;
  }

  if (!url.pathname.includes('/_app/immutable/')) return;
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(request);
    const update = fetch(request).then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    });
    return cached || update;
  }));
});
