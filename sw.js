const CACHE_PREFIX = 'kosutte-art-v';
const CACHE = `${CACHE_PREFIX}7`;
const FILES = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest', './assets/icon.svg',
  './assets/pinocchio-workshop.jpg',
  './assets/fire-dragon.jpg',
  './assets/penguin-preschool.jpg',
  './assets/sports-day-drum.jpg',
  './assets/panda-kuroshio.jpg',
  './スクラッチアート作成用画像/images.jpg',
  './スクラッチアート作成用画像/images (1).jpg',
  './スクラッチアート作成用画像/images (2).jpg',
  './スクラッチアート作成用画像/images (3).jpg',
  './スクラッチアート作成用画像/images (4).jpg',
  './スクラッチアート作成用画像/images (5).jpg',
  './スクラッチアート作成用画像/images (6).jpg',
  './スクラッチアート作成用画像/images (7).jpg',
  './スクラッチアート作成用画像/images (8).jpg',
  './スクラッチアート作成用画像/images (9).jpg',
];
self.addEventListener('install', event => {
  const requests = FILES.map(file => new Request(file, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(requests)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => {
    const oldVersions = keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE);
    return Promise.all(oldVersions.map(key => caches.delete(key)));
  }).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request, { cacheName: CACHE }).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).origin === self.location.origin) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(error => {
    if (event.request.mode === 'navigate') return caches.match('./index.html', { cacheName: CACHE });
    throw error;
  })));
});
