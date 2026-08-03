import { ReactNode, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Lightweight route behavior.
 * IMPORTANT: do NOT key by pathname — that remounts the whole route tree on
 * every navigation, causing visible refreshes, duplicate effects, layout
 * jumps and slow transitions on mobile.
 *
 * Instead we reset scroll and play a short compositor-only enter animation
 * (opacity + translateY) via the Web Animations API — no remount, no reflow,
 * no bundle cost, 60fps.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const anim = el.animate(
      [
        { opacity: 0, transform: "translate3d(0, 8px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "none" },
    );
    return () => anim.cancel();
  }, [pathname]);

  return (
    <div ref={ref} className="route-transition">
      {children}
    </div>
  );
}
