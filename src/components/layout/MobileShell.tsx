import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Adaptive shell — mobile-first but expands cleanly on tablet & desktop.
 * Breakpoints:
 *  - Phone:   max-w-[480px]    (default)
 *  - Tablet:  md (≥768)  → max-w-2xl + extra padding
 *  - Desktop: lg (≥1024) → max-w-4xl
 *  - Wide:    xl (≥1280) → max-w-6xl
 */
export function MobileShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-screen bg-background flex justify-center relative overflow-hidden">
      {/* Ambient premium background — layered light + soft texture */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -top-32 -right-24 h-80 w-80 md:h-[28rem] md:w-[28rem] rounded-full bg-gold/12 blur-3xl gb-float" />
        <div className="absolute top-1/3 -left-24 h-96 w-96 md:h-[32rem] md:w-[32rem] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-72 w-72 md:h-[24rem] md:w-[24rem] rounded-full bg-gold/[0.08] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(hsl(217 56% 13%) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>
      <div
        className={cn(
          "w-full max-w-[480px] md:max-w-2xl lg:max-w-4xl xl:max-w-6xl",
          "min-h-screen relative z-10 pb-28 md:pb-32 safe-top",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
