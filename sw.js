const V = "ns-v3", FICHIERS = ["./", "index.html", "styles.css", "app.js", "images/nador-baie.jpg", "icon-192.png", "icon-512.png", "confidentialite.html"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
/* Réseau d'abord (mises à jour immédiates), cache en secours hors ligne ; les appels Supabase ne sont jamais mis en cache */
self.addEventListener("fetch", e => {
    const u = new URL(e.request.url);
    if (e.request.method !== "GET" || u.origin !== location.origin) return;
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});