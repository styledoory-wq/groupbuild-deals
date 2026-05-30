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
      className="min-h-screen min-h-[100dvh] flex justify-center relative overflow-x-hidden ios-bg"
      style={{ overscrollBehavior: "none", backgroundColor: "#F1F5F9" }}
    >
      {/* Soft ambient lighting — pearl & gold */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-72 w-72 sm:h-80 sm:w-80 md:h-[28rem] md:w-[28rem] rounded-full bg-[#C9A961]/[0.10] blur-3xl gb-float" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 sm:h-96 sm:w-96 md:h-[32rem] md:w-[32rem] rounded-full bg-[#0A1F3D]/[0.06] blur-3xl" />
        <div className="absolute bottom-10 right-0 h-64 w-64 sm:h-72 sm:w-72 md:h-[24rem] md:w-[24rem] rounded-full bg-[#C9A961]/[0.06] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(rgba(10,31,61,0.45) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>
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
