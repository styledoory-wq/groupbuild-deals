import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MobileShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-screen bg-background flex justify-center relative overflow-hidden">
      {/* Ambient premium background — layered light + soft texture */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-gold/12 blur-3xl gb-float" />
        <div className="absolute top-1/3 -left-24 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-gold/[0.08] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(hsl(217 56% 13%) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>
      <div className={cn("w-full max-w-[480px] min-h-screen relative z-10 pb-24", className)}>
        {children}
      </div>
    </div>
  );
}
