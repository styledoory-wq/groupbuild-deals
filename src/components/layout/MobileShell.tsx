import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Adaptive shell — mobile-first, scales cleanly across phone → tablet → desktop.
 * Breakpoints:
 *  - Phone:   full width up to 480px (handles iPhone SE 320px → 14 Pro Max 430px)
 *  - Tablet:  sm (≥640) → max-w-xl, md (≥768) → max-w-2xl with extra padding
 *  - Desktop: lg (≥1024) → max-w-4xl
 *  - Wide:    xl (≥1280) → max-w-6xl
 */
export function MobileShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex justify-center relative overflow-x-hidden ios-bg">
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
          "w-full max-w-[480px] sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl",
          "min-h-screen min-h-[100dvh] relative z-10 safe-top",
          "pb-[calc(env(safe-area-inset-bottom)+88px)] md:pb-[calc(env(safe-area-inset-bottom)+100px)]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
