// GroupBuild service worker — handles Web Push notifications so users
// can receive alerts even when the app/tab is closed.
//
// IMPORTANT: this SW is only ever registered in production builds
// (see src/lib/registerSW.ts). Lovable preview hosts unregister it
// to avoid serving stale assets.

const APP_NAME = "GroupBuild";
const DEFAULT_ICON = "/icon-192.png";
const DEFAULT_BADGE = "/icon-192.png";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ---- Push handler ----
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    try {
      payload = { title: APP_NAME, body: event.data?.text() || "" };
    } catch {
      payload = {};
    }
  }

  const title = payload.title || APP_NAME;
  const options = {
    body: payload.body || "",
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    tag: payload.tag || undefined,
    data: { url: payload.url || "/", ...(payload.data || {}) },
    dir: "rtl",
    lang: "he",
    renotify: !!payload.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ---- Click handler — focus an open tab or open a new one ----
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && "focus" in client) {
            await client.focus();
            if ("navigate" in client) {
              try { await client.navigate(targetUrl); } catch {}
            }
            return;
          }
        } catch {}
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

// Best-effort: when subscription is invalidated, the page will re-subscribe
// next time the user opens the app.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(Promise.resolve());
});

// ---- Image cache (stale-while-revalidate) ----
// Aggressively cache Supabase Storage images (public objects + render/image
// transforms) so returning users get an instant paint on cards, logos and
// gallery views. Cache is capped to avoid growing without bound.
const IMG_CACHE = "gb-img-v1";
const IMG_CACHE_MAX = 300;

function isCacheableImage(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    // Supabase storage public + render/image endpoints
    if (u.pathname.includes("/storage/v1/object/public/")) return true;
    if (u.pathname.includes("/storage/v1/render/image/")) return true;
    return false;
  } catch {
    return false;
  }
}

async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxItems) return;
    const excess = keys.length - maxItems;
    for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
  } catch {}
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (!isCacheableImage(req.url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(IMG_CACHE);
      const cached = await cache.match(req);
      const networkPromise = fetch(req)
        .then((resp) => {
          // Only cache OK, opaque responses can't be inspected but are fine to cache
          if (resp && (resp.ok || resp.type === "opaque")) {
            cache.put(req, resp.clone()).then(() => trimCache(IMG_CACHE, IMG_CACHE_MAX));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || networkPromise;
    })(),
  );
});

