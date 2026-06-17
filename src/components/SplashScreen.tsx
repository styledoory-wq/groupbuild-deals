import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

const SPLASH_SHOWN_KEY = "gb:splash-shown";

/**
 * SplashScreen — shown once per session on first entry.
 * Brand-aligned: deep navy bg, gold accent loader, no flash/jump.
 */
export function SplashScreen({ ready, minDurationMs = 1400 }: { ready: boolean; minDurationMs?: number }) {
  const alreadyShown = useRef<boolean>(
    typeof window !== "undefined" && sessionStorage.getItem(SPLASH_SHOWN_KEY) === "1",
  );

  const [minElapsed, setMinElapsed] = useState(alreadyShown.current);
  const [hidden, setHidden] = useState(alreadyShown.current);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alreadyShown.current) return;
    const t1 = window.setTimeout(() => setVisible(true), 40);
    const t2 = window.setTimeout(() => setMinElapsed(true), minDurationMs);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [minDurationMs]);

  const shouldShow = !alreadyShown.current && !(ready && minElapsed);

  useEffect(() => {
    if (alreadyShown.current) return;
    if (shouldShow) return;
    try { sessionStorage.setItem(SPLASH_SHOWN_KEY, "1"); } catch { /* noop */ }
    const t = window.setTimeout(() => setHidden(true), 500);
    return () => window.clearTimeout(t);
  }, [shouldShow]);

  if (hidden) return null;

  return (
    <div
      aria-hidden={!shouldShow}
      role="status"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center",
        "transition-opacity duration-500 ease-out",
        shouldShow ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      style={{
        background:
          "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 35%, transparent 70%), linear-gradient(180deg, #0A2147 0%, #081B38 55%, #050F25 100%)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Logo */}
      <div
        className="transition-all duration-700 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.94)",
          width: "180px",
        }}
      >
        <BrandLogo size="xl" variant="light" className="h-auto w-full" />
      </div>

      {/* Gold accent loader */}
      <div
        className="mt-8 h-[3px] w-24 rounded-full overflow-hidden bg-white/10 transition-opacity duration-700"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <div
          className="h-full w-1/2 rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, #C9A227 50%, transparent)",
            animation: "gb-splash-slide 1.2s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes gb-splash-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
