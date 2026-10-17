// Service worker: rende l'app utilizzabile offline dopo la prima apertura.
// I dati NON passano di qui: restano in IndexedDB sul dispositivo.
const CACHE = "tcf-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    // rete prima, poi cache (ignorando ?id=...)
    e.respondWith(fetch(req).then((res) => { const c = res.clone(); caches.open(CACHE).then((x) => x.put(req, c)); return res; })
      .catch(async () => (await caches.match(req, { ignoreSearch: true })) || (await caches.match(self.registration.scope)) || Response.error()));
    return;
  }
  // risorse statiche: cache con aggiornamento in background
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req);
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
