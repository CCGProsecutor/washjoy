const CACHE = 'washjoy-next-shell-v2'
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/washjoy/api/')) return
  const isPage = request.mode === 'navigate'
  // 页面始终先走网络，保证发布后用户拿到新版；断网时才回退到缓存。带哈希的静态资源缓存优先。
  event.respondWith(isPage
    ? fetch(request).then((response) => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)) } return response }).catch(() => caches.match(request).then((cached) => cached || caches.match('/washjoy/')))
    : caches.match(request).then((cached) => cached || fetch(request).then((response) => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)) } return response })))
})
