import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MobileShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className={cn("w-full max-w-[480px] min-h-screen relative pb-24", className)}>
        {children}
      </div>
    </div>
  );
}
