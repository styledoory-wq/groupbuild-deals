import { useEffect, useState } from "react";

const PAGE_SURFACE = "#F7F5F0";
const HERO_STATUS = "#121A18";

/**
 * Bridges the iOS status-bar / clock area with full-bleed landing heroes.
 *
 * - Over the hero: transparent + black-translucent so the photo continues
 *   under the clock (no cream strip).
 * - After scroll: solid page-surface veil so content never runs under the clock.
 */
export function LandingSafeTop({ solidAfterY = 56 }: { solidAfterY?: number }) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const update = () => setSolid(window.scrollY >= solidAfterY);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [solidAfterY]);

  useEffect(() => {
    const theme = document.querySelector('meta[name="theme-color"]');
    const status = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    const prevTheme = theme?.getAttribute("content") ?? PAGE_SURFACE;
    const prevStatus = status?.getAttribute("content") ?? "default";

    theme?.setAttribute("content", solid ? PAGE_SURFACE : HERO_STATUS);
    status?.setAttribute("content", solid ? "default" : "black-translucent");

    return () => {
      theme?.setAttribute("content", prevTheme);
      status?.setAttribute("content", prevStatus);
    };
  }, [solid]);

  return (
    <div
      aria-hidden
      className="fixed top-0 inset-x-0 z-[100] pointer-events-none transition-[background-color,box-shadow] duration-300 ease-out"
      style={{
        height: "env(safe-area-inset-top)",
        backgroundColor: solid ? PAGE_SURFACE : "transparent",
        boxShadow: solid ? "0 1px 0 rgba(11,18,32,0.06)" : "none",
      }}
    />
  );
}
