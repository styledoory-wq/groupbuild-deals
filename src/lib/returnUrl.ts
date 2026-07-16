/**
 * returnUrl helpers — used to bring the user back to the exact action they
 * attempted before being asked to sign in.
 *
 * Rules:
 *  - Only same-origin, path-only URLs are accepted (never absolute).
 *  - Never redirect back to /auth (would loop).
 */
const KEY = "gb:returnUrl";

export function setPendingReturnUrl(url: string | null | undefined) {
  try {
    if (url && isSafeReturnUrl(url)) sessionStorage.setItem(KEY, url);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function consumePendingReturnUrl(): string | null {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v) sessionStorage.removeItem(KEY);
    return v && isSafeReturnUrl(v) ? v : null;
  } catch {
    return null;
  }
}

export function peekPendingReturnUrl(): string | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v && isSafeReturnUrl(v) ? v : null;
  } catch {
    return null;
  }
}

export function isSafeReturnUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false; // protocol-relative
  if (url.startsWith("/auth")) return false;
  return true;
}
