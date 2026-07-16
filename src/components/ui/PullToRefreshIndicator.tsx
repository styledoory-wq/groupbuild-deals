import { Loader2, ArrowDown } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pulling: boolean;
  progress: number;
  refreshing: boolean;
}

/**
 * Small, unified visual indicator paired with `usePullToRefresh`.
 * Fixed at the top under the safe area — appears/rotates with pull progress.
 * Same styling everywhere so the gesture feels identical on every screen.
 */
export function PullToRefreshIndicator({ pulling, progress, refreshing }: PullToRefreshIndicatorProps) {
  const visible = pulling || refreshing;
  const translateY = refreshing ? 56 : Math.round(progress * 72);
  const rotate = Math.round(progress * 180);
  return (
    <div
      aria-hidden={!visible}
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-[95] transition-opacity"
      style={{
        top: "max(env(safe-area-inset-top), 6px)",
        transform: `translate(-50%, ${translateY - 40}px)`,
        opacity: visible ? 1 : 0,
        transition: refreshing ? "transform 200ms ease-out, opacity 150ms" : "opacity 150ms",
      }}
    >
      <div className="h-10 w-10 rounded-full bg-white border border-stone-200 shadow-[0_6px_20px_-8px_rgba(10,31,61,0.25)] grid place-items-center">
        {refreshing ? (
          <Loader2 className="h-4 w-4 text-[#0E6B5A] animate-spin" strokeWidth={2.4} />
        ) : (
          <ArrowDown
            className="h-4 w-4 text-[#0E6B5A] transition-transform"
            style={{ transform: `rotate(${rotate}deg)` }}
            strokeWidth={2.4}
          />
        )}
      </div>
    </div>
  );
}
