const CACHE = "clima-conce-v3";
const ASSETS = ["./manifest.json?v=3", "./icon-192.png?v=3", "./icon-512.png?v=3", "./apple-touch-icon.png?v=3"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear: datos de pronostico ni las tejas del mapa (OpenStreetMap)
  if (url.hostname.includes("open-meteo.com")) return;
  if (url.hostname.includes("tile.openstreetmap.org")) return;
  if (event.request.method !== "GET") return;

  const isAppShell =
    event.request.mode === "navigate" ||
    url.pathname.endsWith("index.html") ||
    url.pathname.endsWith("/");

  if (isAppShell) {
    // Red primero: siempre intenta traer la version mas nueva.
    // Solo usa la copia guardada si no hay conexion.
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Iconos, manifest y librerias: copia guardada primero, se actualiza en segundo plano.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
