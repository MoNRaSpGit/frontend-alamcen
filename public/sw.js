const CACHE_NAME = "alamcen-pwa-__ALAMCEN_SW_BUILD_ID__";
const ASSETS_TO_CACHE = [
  "/frontend-alamcen/",
  "/frontend-alamcen/index.html",
  "/frontend-alamcen/manifest.webmanifest",
  "/frontend-alamcen/pwa-192x192.png",
  "/frontend-alamcen/pwa-512x512.png",
  "/frontend-alamcen/almacen.png"
];

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
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

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isNavigationRequest =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  if (requestUrl.pathname.endsWith("/app-build.json") || requestUrl.pathname.endsWith("/index.html")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put("/frontend-alamcen/index.html", responseClone));
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match("/frontend-alamcen/index.html");
          return cachedPage || Response.error();
        })
    );
    return;
  }

  if (!isSameOrigin) {
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
        .catch(() => Response.error());
    })
  );
});
