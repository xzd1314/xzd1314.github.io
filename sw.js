const CACHE_NAME = 'xzd1314-site-v1';
// 预缓存核心资源
const PRECACHE_URLS = [
  './',
  './home.html',
  './index.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 图片/字体/光标：缓存优先（本地有就用本地的，没有再下载）
  if (req.destination === 'image' || 
      req.destination === 'font' ||
      url.pathname.match(/\.(webp|png|jpg|jpeg|gif|svg|ico|cur|woff2?|ttf|otf)$/i)) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // HTML页面：网络优先，失败用缓存
  if (req.destination === 'document' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return resp;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./home.html')))
    );
    return;
  }

  // 其他资源：正常请求
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
