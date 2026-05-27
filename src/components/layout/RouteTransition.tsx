import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Lightweight route behavior.
 * Important: do not key/remount the whole route tree on navigation — it causes
 * visible refreshes, duplicate effects and content jumps on mobile.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    // Avoid jarring scroll on hash links / same page
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return <div key={pathname} className="route-transition">{children}</div>;
}
