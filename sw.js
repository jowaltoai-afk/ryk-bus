// KILL-SWITCH (5 Nov 2026, owner order): the website is intentionally NOT
// offline — visitors should download the native app instead. This worker
// deletes every cache and unregisters itself. KEEP this file served as
// sw.js: browsers with the old worker installed pick it up on their next
// visit, it removes itself, and later loads go straight to the network.
// No fetch handler here on purpose — nothing is intercepted or cached.
self.addEventListener("install", function (e) { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
  );
});
