/* Service worker: makes the site work with no signal, which is the normal case
   inside thick campus walls. The whole app shell and the campus maps are cached on
   first visit. Pages and scripts are served from the cache and refreshed in the
   background, so an update shows up on the next open. API calls always go to the
   network; the app keeps working from its own saved copy when they fail. */
const VERSION = "12";
const SHELL_CACHE = "navigator-shell-" + VERSION, FONT_CACHE = "navigator-fonts";
const SHELL = ["./", "index.html", "css/style.css", "js/auth.js", "js/qr.js", "js/core.js", "js/plan.js", "js/nlu.js", "js/i18n.js", "js/app.js",
  "data/ncu.js", "data/greenfield.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("navigator-shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then((cache) => cache.match(req, { ignoreSearch: true }).then((hit) => {
    const fresh = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || fresh;
  }));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.includes("/api/")) return;                       // live data: network only
    if (req.mode === "navigate") {                                    // the page itself: open instantly from the cache
      e.respondWith(caches.match("index.html").then((hit) => hit || fetch(req)));
      e.waitUntil(caches.open(SHELL_CACHE).then((c) => fetch("index.html", { cache: "no-cache" }).then((r) => r.ok && c.put("index.html", r)).catch(() => {})));
      return;
    }
    e.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(staleWhileRevalidate(req, FONT_CACHE));
  }
});
