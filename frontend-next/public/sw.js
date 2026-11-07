const CACHE = 'washjoy-warm-directory-v1'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('washjoy-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith('/washjoy/') || url.pathname.startsWith('/washjoy/api/')) return
  // Authenticated documents and uploaded media are never stored offline.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => new Response('<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Washjoy · 暂时离线</title><body><h1>暂时无法连接</h1><p>请恢复网络后刷新，查看附近门店。</p><a href="/washjoy/">重新连接</a></body></html>', {status:503,headers:{'Content-Type':'text/html; charset=utf-8'}})))
    return
  }
  if (!url.pathname.startsWith('/washjoy/assets/') || !/\.(js|css|woff2)$/.test(url.pathname)) return
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy))) }
    return response
  })))
})
