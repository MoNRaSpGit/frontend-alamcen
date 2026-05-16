const CACHE_NAME = "alamcen-pwa-v1";
const ASSETS_TO_CACHE = [
  "/frontend-alamcen/",
  "/frontend-alamcen/index.html",
  "/frontend-alamcen/manifest.webmanifest",
  "/frontend-alamcen/pwa-192x192.png",
  "/frontend-alamcen/pwa-512x512.png",
  "/frontend-alamcen/almacen.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }

          return Promise.resolve(false);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match("/frontend-alamcen/index.html"));
    })
  );
});
