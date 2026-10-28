const V = "ns-v21", FICHIERS = ["./", "index.html", "styles.css", "app.js", "manifest.webmanifest", "images/nador-baie.jpg", "logo-nador.png", "icon-192.png", "icon-512.png", "confidentialite.html"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => Promise.all(FICHIERS.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
/* Réseau d'abord (mises à jour immédiates), cache en secours hors ligne ; les appels Supabase ne sont jamais mis en cache */
self.addEventListener("fetch", e => {
    const u = new URL(e.request.url);
    if (e.request.method !== "GET" || u.origin !== location.origin) return;
    e.respondWith(
        fetch(e.request).then(r => {
            if (r.ok && r.status === 200) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)).catch(() => {}); }
            return r;
        }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || (e.request.mode === "navigate" ? caches.match("index.html") : Response.error())))
    );
});