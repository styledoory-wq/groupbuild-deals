import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IS_SUPPLIERS_BUILD } from "@/config/appMode";

/** Home screen for the current build — where "back" lands when there is no history. */
export function profileHomePath(): string {
  return IS_SUPPLIERS_BUILD ? "/supplier" : "/";
}

/**
 * True when this document was opened directly (deep link, push notification,
 * Universal Link, WhatsApp share) rather than navigated to inside the SPA.
 * In that case `navigate(-1)` either does nothing or leaves the app entirely.
 */
export function isDeepLinkEntry(): boolean {
  if (typeof window === "undefined") return false;
  // history.length === 1 means this is the first entry of the tab/WebView.
  return window.history.length <= 1;
}

/**
 * Back handler that never traps the user.
 * Uses real history when it exists, otherwise falls back to an explicit route
 * (or the current build's home screen).
 */
export function useSmartBack(fallback?: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const target = fallback ?? profileHomePath();
    // `location.key === "default"` = no SPA navigation happened before this view.
    if (isDeepLinkEntry() || location.key === "default") {
      navigate(target, { replace: true });
      return;
    }
    navigate(-1);
  }, [fallback, location.key, navigate]);
}
