// AERI LIGHT Service Worker v3 - API requests are now network-first.
const CACHE_NAME = "aeri-light-cache-v4"; // Versi cache dinaikkan untuk memicu pembaruan
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/iro.min.js",
  "/orbitron.ttf",
  "/icons/icon-48x48.png",
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-192x192.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png",
];

// Install service worker dan cache aset inti
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Strategi caching yang diperbarui
self.addEventListener("fetch", (event) => {
  // Cek jika permintaan adalah untuk API.
  // Permintaan API harus selalu mencoba jaringan terlebih dahulu agar data selalu baru
  // dan agar aplikasi bisa mendeteksi kondisi offline dengan benar.
  const isApiRequest =
    event.request.url.includes("/get-") ||
    event.request.url.includes("/set-") ||
    event.request.url.includes("/load-") ||
    event.request.url.includes("/save-") ||
    event.request.url.includes("/reset-") ||
    event.request.url.includes("/preview-");

  if (isApiRequest) {
    // Untuk permintaan API, gunakan strategi "Network Only".
    // Ini akan menyebabkan fetch() di app.js gagal jika offline,
    // yang akan mengaktifkan Mode Uji dengan benar.
    event.respondWith(fetch(event.request));
    return;
  }

  // Untuk semua aset lain (HTML, CSS, JS, ikon), gunakan strategi "Cache First".
  // Ini membuat aplikasi dapat dimuat dengan sangat cepat.
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Jika ada di cache, kembalikan dari cache.
      if (response) {
        return response;
      }

      // Jika tidak, ambil dari jaringan, lalu simpan ke cache untuk waktu berikutnya.
      return fetch(event.request).then((networkResponse) => {
        // Periksa jika kita menerima response yang valid
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== "basic"
        ) {
          return networkResponse;
        }

        // Penting: gandakan response. Satu untuk browser, satu untuk cache.
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

// Hapus cache lama saat service worker diaktifkan
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
