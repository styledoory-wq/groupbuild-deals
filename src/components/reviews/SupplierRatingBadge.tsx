import { Star } from "lucide-react";
import { useSupplierRating } from "@/hooks/useSupplierRating";
import { cn } from "@/lib/utils";

interface Props {
  supplierId?: string | null;
  className?: string;
  showEmpty?: boolean; // show "אין דירוגים עדיין" when count = 0
}

/** Live ⭐ avg (count חוות דעת) — fully automatic, no manual entry. */
export function SupplierRatingBadge({ supplierId, className, showEmpty = true }: Props) {
  const { avg, count, loading } = useSupplierRating(supplierId);

  if (loading) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[11px] text-muted-foreground", className)}>
        <Star className="h-3 w-3 text-muted" /> ...
      </span>
    );
  }

  if (count === 0) {
    if (!showEmpty) return null;
    return (
      <span className={cn("inline-flex items-center gap-1 text-[11px] text-muted-foreground", className)}>
        <Star className="h-3 w-3 text-gold/60" /> ספק חדש בפלטפורמה
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px]", className)}>
      <Star className="h-3 w-3 fill-gold text-gold" />
      <b className="text-foreground">{avg.toFixed(1)}</b>
      <span className="text-muted-foreground">({count} חוות דעת)</span>
    </span>
  );
}
