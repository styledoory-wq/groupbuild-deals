import { Capacitor } from "@capacitor/core";

/**
 * Registers the PWA service worker.
 *
 * HARD RULES:
 *  - NEVER inside a Capacitor native app (iOS/Android WebView). A SW there
 *    serves stale assets and the `controllerchange` → reload handler can
 *    produce a reload loop. Detection uses the official Capacitor runtime
 *    API (`Capacitor.isNativePlatform()`), not hostname sniffing.
 *  - NEVER in dev, Lovable preview hosts, or preview iframes.
 *  - The regular website (production, browser) keeps its service worker.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const unregisterAll = () => {
    navigator.serviceWorker
      .getRegistrations?.()
      .then((regs) => regs.forEach((r) => r.unregister().catch(() => {})))
      .catch(() => {});
  };

  // 1. Capacitor native (iOS / Android) — official detection, plus a defensive
  //    check on the injected global in case the plugin proxy isn't ready yet.
  const isNative = (() => {
    try {
      if (Capacitor.isNativePlatform()) return true;
    } catch {
      /* ignore */
    }
    const w = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; platform?: string };
    };
    const platform = w.Capacitor?.platform;
    return platform === "ios" || platform === "android";
  })();

  if (isNative) {
    // Clean up any SW a previous build may have registered inside the WebView.
    unregisterAll();
    return;
  }

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app");

  // 2. Dev / preview / iframe: actively unregister stale SWs and bail.
  if (import.meta.env.DEV || isInIframe || isPreviewHost) {
    unregisterAll();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
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
      .catch((err) => console.warn("[SW] registration failed", err));

    // Reload-on-update is browser-only. It is unreachable in native because we
    // returned above before ever registering.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
