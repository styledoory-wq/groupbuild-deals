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

/* ------------------------------------------------------------------ *
 * Pending action
 *
 * A guest who taps "join deal" must land back on the SAME screen after
 * signing in AND have the action re-opened automatically. Storing the
 * callback in a React closure loses it across the auth redirect, so we
 * persist a serialisable descriptor instead.
 * ------------------------------------------------------------------ */
const ACTION_KEY = "gb:pendingAction";

export interface PendingAction {
  /** Stable identifier, e.g. "join-deal". */
  key: string;
  /** Path the action belongs to — the action only resumes on this path. */
  path: string;
  /** Optional serialisable payload. */
  payload?: Record<string, unknown>;
}

export function setPendingAction(action: PendingAction | null) {
  try {
    if (action) sessionStorage.setItem(ACTION_KEY, JSON.stringify(action));
    else sessionStorage.removeItem(ACTION_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function clearPendingAction() {
  setPendingAction(null);
}

export function consumePendingAction(key?: string, path?: string): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(ACTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAction;
    if (!parsed?.key) return null;
    if (key && parsed.key !== key) return null;
    if (path && parsed.path !== path) return null;
    sessionStorage.removeItem(ACTION_KEY);
    return parsed;
  } catch {
    return null;
  }
}
