const CACHE = 'trios-v3';
const STATIC_URLS = [
  '/css/style.css',
  '/js/utils.js',
  '/js/confirm.js',
  '/js/ideas.js',
  '/js/movies.js',
  '/js/tasks.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // HTML: 优先走网络，离线时用缓存
  if (url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 静态资源: 缓存优先
  e.respondWith(
    caches.match(req).then((res) => res || fetch(req))
  );
});
