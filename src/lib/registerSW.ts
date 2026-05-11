/**
 * Registers the PWA service worker after window load (production only).
 * Auto-activates new versions on next navigation.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return; // avoid HMR conflicts in dev

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Watch for an updated SW and skip waiting so users see the new build sooner.
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              reg.waiting?.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[SW] registration failed", err);
      });

    // Reload exactly once when a new SW takes control.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
