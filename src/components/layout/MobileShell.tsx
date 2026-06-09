import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Adaptive shell — mobile-first, fluid across phone → tablet → desktop → wide.
 *
 * - Width: full on phone, max-w-app (1280) on desktop, centered.
 * - Bottom padding: reserves the BottomNav height (var(--nav-h)) + iOS safe
 *   area, so content always clears the floating dock on every device.
 * - Top padding: safe-area-inset-top so notched devices don't clip content.
 *
 * Pages should still use <AppContainer> internally for horizontal padding;
 * this shell only handles outer chrome.
 */
export function MobileShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className="min-h-screen min-h-[100dvh] flex justify-center relative overflow-x-hidden"
      style={{ overscrollBehavior: "none", backgroundColor: "#E8ECF0" }}
    >
      <div
        className={cn(
          "w-full max-w-[var(--app-max-w)]",
          "min-h-screen min-h-[100dvh] relative z-10 overflow-x-hidden",
          "pt-[env(safe-area-inset-top)]",
          // Reserve space for the floating BottomNav + safe-area + breathing room
          "pb-[calc(env(safe-area-inset-bottom)+var(--nav-h)+12px)]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
