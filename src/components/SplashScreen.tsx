import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * Premium splash screen — centered brand logo with a subtle pulse loader.
 * Stays mounted until `ready` is true AND a minimum display time has elapsed
 * (prevents flash on fast loads), then fades out smoothly.
 */
export function SplashScreen({ ready, minDurationMs = 650 }: { ready: boolean; minDurationMs?: number }) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), minDurationMs);
    return () => window.clearTimeout(t);
  }, [minDurationMs]);

  const shouldShow = !(ready && minElapsed);

  useEffect(() => {
    if (shouldShow) return;
    // Match fade-out duration before unmount
    const t = window.setTimeout(() => setHidden(true), 450);
    return () => window.clearTimeout(t);
  }, [shouldShow]);

  if (hidden) return null;

  return (
    <div
      aria-hidden={!shouldShow}
      role="status"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center",
        "bg-background transition-opacity duration-500 ease-out",
        shouldShow ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[28rem] w-[28rem] rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-10">
        <div className="animate-fade-in">
          <BrandLogo size="xl" variant="dark" className="drop-shadow-[0_8px_24px_hsl(217_56%_13%_/_0.18)]" />
        </div>

        {/* Pulse loader dots */}
        <div className="flex items-center gap-2" aria-label="טוען">
          <span className="h-2 w-2 rounded-full bg-gold animate-pulse [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-gold animate-pulse [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
        </div>
      </div>
    </div>
  );
}
