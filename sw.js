const CACHE_NAME = "doors-pwa-v10";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./seed-data.js",
  "./storage.js",
  "./csv.js",
  "./dom.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Предварительно сохраняет файлы приложения.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_FILES);
    }),
  );

  // Новая версия не ждёт закрытия старой.
  self.skipWaiting();
});

// Удаляет старые версии кэша.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );

  // Новый worker сразу начинает
  // управлять открытыми страницами.
  self.clients.claim();
});

// Для файлов приложения сначала используется сеть.
// Если сеть недоступна — используется кэш.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, copy);
        });

        return response;
      })

      .catch(() => {
        return caches.match(event.request);
      }),
  );
});
