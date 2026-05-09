import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Lightweight cross-route transition. Re-mounts on pathname change
 * so the fade-up keyframe replays. No deps, no jank.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="route-transition">
      {children}
    </div>
  );
}
