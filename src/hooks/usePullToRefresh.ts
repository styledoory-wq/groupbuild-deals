import { useEffect, useRef, useState } from "react";

/**
 * Native-feeling pull-to-refresh for iOS Safari / WebView.
 *
 * Attach to `document.body` scroll (window is fine on mobile page-level scroll).
 * Fires `onRefresh` once when the user pulls down > threshold at the top of the page.
 * Returns { pulling, progress (0..1), refreshing } so a small indicator can be rendered.
 *
 * Notes:
 *  - Uses non-passive touch listeners so we can preventDefault the elastic bounce
 *    only while the user is actively pulling from the top. All other scrolls remain native.
 *  - Debounced against rapid re-fires while `onRefresh` promise is in-flight.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | void, opts?: { threshold?: number; enabled?: boolean }) {
  const threshold = opts?.threshold ?? 72;
  const enabled = opts?.enabled ?? true;
  const [pulling, setPulling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if ((window.scrollY || document.documentElement.scrollTop) > 0) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        // scrolling up — cancel PTR
        active.current = false;
        setPulling(false);
        setProgress(0);
        return;
      }
      // Dampen the pull for a natural feel.
      const damped = Math.min(threshold * 1.6, dy * 0.55);
      setPulling(true);
      setProgress(Math.min(1, damped / threshold));
      if (dy > 8) {
        // Prevent iOS elastic bounce so our indicator is visible.
        try { e.preventDefault(); } catch { /* passive listeners can throw */ }
      }
    };

    const onTouchEnd = async () => {
      if (!active.current) return;
      const p = progress;
      active.current = false;
      startY.current = null;
      setPulling(false);
      if (p >= 1 && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setProgress(0);
        }
      } else {
        setProgress(0);
      }
    };

    // touchmove MUST be non-passive to allow preventDefault.
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
    // Only re-bind when enabled or callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, onRefresh, threshold]);

  return { pulling, progress, refreshing };
}
