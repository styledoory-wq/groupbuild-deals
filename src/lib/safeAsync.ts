const DEFAULT_TIMEOUT_MS = 25000;

export function withTimeout<T>(promise: PromiseLike<T>, label = "טעינה", ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label}: timeout after ${Math.round(ms / 1000)}s`));
    }, ms);

    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timer));
  });
}

export function getFriendlyLoadError(error: unknown, fallback = "לא הצלחנו לטעון את הנתונים. נסו לרענן את המסך בעוד רגע.") {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  if (lower.includes("timeout")) {
    return "הטעינה נמשכת יותר מדי זמן. ייתכן שיש עומס רגעי או בעיית רשת — נסו לרענן את המסך.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("fetch")) {
    return "יש בעיית תקשורת זמנית מול השרת. בדקו חיבור ונסו שוב.";
  }
  if (lower.includes("row-level security") || lower.includes("permission") || lower.includes("not allowed")) {
    return "אין הרשאה לטעון את המידע לחשבון הזה. התחברו מחדש או פנו לתמיכה.";
  }

  return message && message.length < 140 ? message : fallback;
}

export async function clearStaleAppCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      const staleKeys = keys.filter((key) => /workbox|vite|groupbuild|lovable|pwa/i.test(key));
      await Promise.all(staleKeys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn("[app_cache_cleanup_failed]", error);
  }
}