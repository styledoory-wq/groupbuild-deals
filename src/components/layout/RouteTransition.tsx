import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Lightweight cross-route transition. Re-mounts on pathname change
 * so the fade-up keyframe replays. Also resets scroll to top, which
 * matches expectations on a mobile-first SaaS.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    // Avoid jarring scroll on hash links / same page
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div key={pathname} className="route-transition">
      {children}
    </div>
  );
}
