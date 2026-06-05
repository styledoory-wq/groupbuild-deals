import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

const SPLASH_SHOWN_KEY = "gb:splash-shown";

/**
 * SplashScreen — מוצג רק בכניסה ראשונה לסשן.
 * במעברים בין דפים לא מופיע שוב; במקומו יש לואדר עדין (ראה SuspenseFallback).
 */
export function SplashScreen({ ready, minDurationMs = 1200 }: { ready: boolean; minDurationMs?: number }) {
  // אם כבר הצגנו ב-session הזה — לא להראות שוב כלל
  const alreadyShown = useRef<boolean>(
    typeof window !== "undefined" && sessionStorage.getItem(SPLASH_SHOWN_KEY) === "1",
  );

  const [minElapsed, setMinElapsed] = useState(alreadyShown.current);
  const [hidden, setHidden] = useState(alreadyShown.current);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alreadyShown.current) return;
    const t1 = window.setTimeout(() => setVisible(true), 30);
    const t2 = window.setTimeout(() => setMinElapsed(true), minDurationMs);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [minDurationMs]);

  const shouldShow = !alreadyShown.current && !(ready && minElapsed);

  useEffect(() => {
    if (alreadyShown.current) return;
    if (shouldShow) return;
    try { sessionStorage.setItem(SPLASH_SHOWN_KEY, "1"); } catch { /* noop */ }
    const t = window.setTimeout(() => setHidden(true), 400);
    return () => window.clearTimeout(t);
  }, [shouldShow]);

  if (hidden) return null;

  return (
    <div
      aria-hidden={!shouldShow}
      role="status"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center",
        "bg-[#0A1F3D] transition-opacity duration-400 ease-out",
        shouldShow ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      <div
        className="transition-all duration-700 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.9)",
          width: "180px",
        }}
      >
        <BrandLogo size="xl" variant="light" className="h-auto w-full" />
      </div>
    </div>
  );
}
