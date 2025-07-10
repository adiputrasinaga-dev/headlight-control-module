// AERI LIGHT Service Worker v5 - Network-First Strategy
const CACHE_NAME = "aeri-light-cache-v5"; // NAIKKAN VERSI INI SETIAP KALI ADA PERUBAHAN PENTING
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/config.js",
  "/iro.min.js",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  // Lewati fase waiting agar service worker baru segera aktif
  event.waitUntil(self.skipWaiting());
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache and caching initial assets");
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", (event) => {
  // Ambil alih kontrol halaman yang ada tanpa perlu reload
  event.waitUntil(self.clients.claim());
  // Hapus cache lama
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Gunakan strategi Network First untuk file HTML dan JS utama
  if (
    event.request.mode === "navigate" ||
    event.request.destination === "script" ||
    event.request.destination === "style"
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Jika berhasil, simpan ke cache dan kembalikan
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Jika gagal (offline), ambil dari cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Untuk aset lain (gambar, font, dll), gunakan Cache First
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).then((fetchResponse) => {
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return fetchResponse;
        })
      );
    })
  );
});
