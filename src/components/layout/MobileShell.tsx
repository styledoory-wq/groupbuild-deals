import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MobileShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-screen bg-background flex justify-center relative overflow-hidden">
      {/* Ambient premium background glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-gold/[0.06] blur-3xl" />
      </div>
      <div className={cn("w-full max-w-[480px] min-h-screen relative z-10 pb-24", className)}>
        {children}
      </div>
    </div>
  );
}
