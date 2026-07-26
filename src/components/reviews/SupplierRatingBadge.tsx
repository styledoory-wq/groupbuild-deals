import { Star } from "lucide-react";
import { useSupplierRating } from "@/hooks/useSupplierRating";
import { cn } from "@/lib/utils";

interface Props {
  supplierId?: string | null;
  className?: string;
  showEmpty?: boolean;
  /** compact = single star + avg; stars = full 5-star row like the mock */
  variant?: "compact" | "stars";
}

/** Live rating — fully automatic, no manual entry. */
export function SupplierRatingBadge({
  supplierId,
  className,
  showEmpty = true,
  variant = "compact",
}: Props) {
  const { avg, count, loading } = useSupplierRating(supplierId);

  if (loading) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-fs-xs text-muted-foreground", className)}>
        <Star className="h-3 w-3 text-muted" /> ...
      </span>
    );
  }

  if (count === 0) {
    if (!showEmpty) return null;
    return (
      <span className={cn("inline-flex items-center gap-1 text-fs-xs text-muted-foreground", className)}>
        <Star className="h-3 w-3 text-gold/60" /> ספק חדש בפלטפורמה
      </span>
    );
  }

  if (variant === "stars") {
    const filled = Math.round(avg);
    return (
      <span className={cn("inline-flex items-center gap-1 text-[12px]", className)}>
        <b className="text-slate-900 tabular-nums">{avg.toFixed(1)}</b>
        <span className="inline-flex items-center gap-0.5" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-3 w-3",
                i < filled ? "fill-[#F5B600] text-[#F5B600]" : "text-slate-200",
              )}
            />
          ))}
        </span>
        <span className="text-slate-400">({count})</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 text-fs-xs", className)}>
      <Star className="h-3 w-3 fill-gold text-gold" />
      <b className="text-foreground">{avg.toFixed(1)}</b>
      <span className="text-muted-foreground">({count} חוות דעת)</span>
    </span>
  );
}
