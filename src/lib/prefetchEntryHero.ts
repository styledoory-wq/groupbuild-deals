import { IS_RESIDENTS_BUILD, IS_SUPPLIERS_BUILD } from "@/config/appMode";
import {
  RESIDENT_HERO_BG,
  SUPPLIER_HERO_BG,
} from "@/lib/heroBackgrounds";

/** Resolve which landing hero photo the current entry route needs. */
export function resolveEntryHeroSrc(pathname = window.location.pathname): string | null {
  if (IS_SUPPLIERS_BUILD) return SUPPLIER_HERO_BG;
  if (IS_RESIDENTS_BUILD) return RESIDENT_HERO_BG;

  if (pathname === "/suppliers" || pathname.startsWith("/suppliers/")) return SUPPLIER_HERO_BG;
  if (
    pathname === "/residents" ||
    pathname.startsWith("/residents/") ||
    pathname === "/home"
  ) {
    return RESIDENT_HERO_BG;
  }
  // Web "/" is Gateway (cream) — no hero photo.
  return null;
}

/**
 * Start downloading + decoding the entry hero ASAP (before React tree settles).
 * Returns a promise that resolves when the image is ready (or immediately if none).
 */
export function prefetchEntryHero(pathname = window.location.pathname): Promise<void> {
  const src = resolveEntryHeroSrc(pathname);
  if (!src) return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();
    img.fetchPriority = "high";
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    img.src = src;
    if (img.complete && img.naturalWidth > 0) {
      img
        .decode?.()
        .then(done)
        .catch(done);
      done();
    }
  });
}
