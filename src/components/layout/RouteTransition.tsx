import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Lightweight route behavior.
 * IMPORTANT: do NOT key by pathname — that remounts the whole route tree on
 * every navigation, causing visible refreshes, duplicate effects, layout
 * jumps and slow transitions on mobile. We only reset scroll instead.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return <div className="route-transition">{children}</div>;
}
