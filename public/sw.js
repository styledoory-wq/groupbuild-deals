/**
 * GroupBuild Service Worker
 *
 * Strategy:
 * - Static assets (JS/CSS/fonts/images): stale-while-revalidate.
 * - Navigation requests: network-first with offline fallback.
 * - API/Supabase calls: bypass entirely (always go to network).
 *
 * Bump CACHE_VERSION whenever the strategy or precache list changes.
 */
const CACHE_VERSION = "gb-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  "/",
  "/site.webmanifest",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

const isApiRequest = (url) =>
  url.hostname.endsWith(".supabase.co") ||
  url.pathname.startsWith("/functions/") ||
  url.pathname.startsWith("/auth/");

const isStaticAsset = (req) => {
  const dest = req.destination;
  return ["script", "style", "image", "font"].includes(dest);
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache API / auth / Supabase calls.
  if (isApiRequest(url)) return;

  // Navigation requests — network-first, fallback to cached "/" shell.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const cached = (await cache.match(req)) || (await cache.match("/"));
          return cached || new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  // Static assets — stale-while-revalidate.
  if (isStaticAsset(req)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })(),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
