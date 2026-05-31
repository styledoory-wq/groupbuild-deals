import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

export function SplashScreen({ ready, minDurationMs = 2000 }: { ready: boolean; minDurationMs?: number }) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // כניסה חלקה — מתחיל שקוף ועולה
    const t1 = window.setTimeout(() => setVisible(true), 50);
    const t2 = window.setTimeout(() => setMinElapsed(true), minDurationMs);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [minDurationMs]);

  const shouldShow = !(ready && minElapsed);

  useEffect(() => {
    if (shouldShow) return;
    const t = window.setTimeout(() => setHidden(true), 500);
    return () => window.clearTimeout(t);
  }, [shouldShow]);

  if (hidden) return null;

  return (
    <div
      aria-hidden={!shouldShow}
      role="status"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center",
        "bg-[#0A1F3D] transition-opacity duration-500 ease-out",
        shouldShow ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div
        className="transition-all duration-700 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.85)",
          width: "180px",
        }}
      >
        <BrandLogo
          size="xl"
          variant="light"
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}