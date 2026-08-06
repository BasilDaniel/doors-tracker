const CACHE_NAME = 'doors-pwa-v2';
const APP_FILES = [
  './', './index.html', './styles.css', './seed-data.js', './storage.js',
  './csv.js', './dom.js', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'
];

// Предварительно кэширует оболочку приложения для офлайн-работы.
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

// Удаляет старые версии кэша после обновления приложения.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

// Сначала использует кэш, затем сеть и сохраняет успешный ответ.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
