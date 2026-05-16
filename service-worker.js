// service-worker.js – CrossBox (robusto, evita ecrã branco no 1º arranque)
const CACHE_NAME = "crossbox-cache-v6-fixprint-wodui";

// Só ficheiros locais (nada de CDNs) para não falhar a instalação
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./imagens/crossbox_logo.png",
  "./imagens/crossbox_logo-192.png",
  "./imagens/crossbox_logo-512.png",
  "./js/chart.umd.min.js",
  "./css/fonts.css",
  "./fonts/stardos-stencil-regular.woff2",
  "./fonts/stardos-stencil-700.woff2"

];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map((u) => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Navegação (HTML): network-first para evitar branco quando o cache ainda não está pronto
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match("./index.html");
        return cached || Response.error();
      }
    })());
    return;
  }

  // Restante: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
      return res;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
