import { useLayoutEffect, useEffect, useState } from "react";

const PAGE_SURFACE = "#F7F5F0";
const HERO_SURFACE = "#121A18";

function setMeta(name: string, value: string) {
  const el = document.querySelector(`meta[name="${name}"]`);
  el?.setAttribute("content", value);
}

function paintShell(color: string) {
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;
  const root = document.getElementById("root");
  if (root) root.style.backgroundColor = color;
}

/**
 * Full-bleed landing top:
 * - Over the hero: no cream strip — shell + status bar match the photo,
 *   so the image reads continuously under the clock.
 * - After scroll: cream veil only at safe-area height (clock), never as tall
 *   as the logo / login row.
 */
export function LandingSafeTop({ solidAfterY = 72 }: { solidAfterY?: number }) {
  const [solid, setSolid] = useState(() =>
    typeof window !== "undefined" ? window.scrollY >= solidAfterY : false,
  );

  useEffect(() => {
    const update = () => setSolid(window.scrollY >= solidAfterY);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [solidAfterY]);

  useLayoutEffect(() => {
    const theme = document.querySelector('meta[name="theme-color"]');
    const status = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    const prevTheme = theme?.getAttribute("content") ?? PAGE_SURFACE;
    const prevStatus = status?.getAttribute("content") ?? "default";
    const prevHtml = document.documentElement.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    const root = document.getElementById("root");
    const prevRoot = root?.style.backgroundColor ?? "";

    if (solid) {
      paintShell(PAGE_SURFACE);
      setMeta("theme-color", PAGE_SURFACE);
      setMeta("apple-mobile-web-app-status-bar-style", "default");
    } else {
      paintShell(HERO_SURFACE);
      setMeta("theme-color", HERO_SURFACE);
      setMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    }

    return () => {
      setMeta("theme-color", prevTheme);
      setMeta("apple-mobile-web-app-status-bar-style", prevStatus);
      document.documentElement.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
      if (root) root.style.backgroundColor = prevRoot;
    };
  }, [solid]);

  // Only paint a separator AFTER scroll — never a cream band over the hero.
  if (!solid) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 inset-x-0 z-[100] pointer-events-none"
      style={{
        height: "env(safe-area-inset-top)",
        backgroundColor: PAGE_SURFACE,
        boxShadow: "0 1px 0 rgba(11,18,32,0.06)",
      }}
    />
  );
}
