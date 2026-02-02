const CACHE_NAME = "byc-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",

  // Icons (add if needed)
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-192x192.png",
  "/icons/icon-256x256.png",
  "/icons/icon-512x512.png"
];

// Install event – cache important files
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker…");

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching assets");
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(err => console.error("[SW] Cache add error:", err))
  );

  self.skipWaiting();
});

// Activate event – clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating new service worker…");

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// Fetch event – serve cached content when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request).catch(() =>
        caches.match("/index.html")  // fallback
      );
    })
  );
});

// Optional: Listen to messages from app
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);
});
