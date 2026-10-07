const CACHE = 'kosutte-art-v3';
const FILES = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './assets/icon.svg', './assets/moon-garden-color.svg', './assets/moon-garden-line.svg', './assets/cloud-cafe-color.svg', './assets/cloud-cafe-line.svg', './assets/reef-friends-color.svg', './assets/reef-friends-line.svg', './スクラッチアート作成用画像/images.jpg', './スクラッチアート作成用画像/images (1).jpg', './スクラッチアート作成用画像/images (2).jpg', './スクラッチアート作成用画像/images (3).jpg', './スクラッチアート作成用画像/images (4).jpg', './スクラッチアート作成用画像/images (5).jpg', './スクラッチアート作成用画像/images (6).jpg', './スクラッチアート作成用画像/images (7).jpg', './スクラッチアート作成用画像/images (8).jpg', './スクラッチアート作成用画像/images (9).jpg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).origin === self.location.origin) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(error => {
    if (event.request.mode === 'navigate') return caches.match('./index.html');
    throw error;
  })));
});
