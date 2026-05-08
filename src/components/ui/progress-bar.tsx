import { cn } from "@/lib/utils";

export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div
      className={cn(
        "h-2.5 w-full rounded-full bg-muted/80 overflow-hidden relative ring-1 ring-border/50",
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, hsl(44 53% 54%) 0%, hsl(44 73% 66%) 50%, hsl(44 53% 54%) 100%)",
          boxShadow: "0 0 12px hsl(44 53% 54% / 0.55), inset 0 1px 0 hsl(0 0% 100% / 0.4)",
        }}
      >
        <div className="absolute inset-0 gb-shimmer opacity-60" />
      </div>
    </div>
  );
}
