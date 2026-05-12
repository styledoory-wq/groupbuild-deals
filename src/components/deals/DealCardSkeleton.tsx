import { Skeleton } from "@/components/ui/skeleton";

/**
 * Stable-height skeleton for RealDealCard.
 * Matches the real card footprint (cover image + content) so no layout shift
 * occurs when real data lands.
 */
export function DealCardSkeleton({ withImage = true }: { withImage?: boolean }) {
  return (
    <div className="gb-card-premium overflow-hidden p-0">
      {withImage && <Skeleton className="h-40 w-full rounded-none" />}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="pt-3 border-t border-border/50 space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function DealCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <DealCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Compact skeleton for category tiles — matches grid card height. */
export function CategoryTileSkeleton() {
  return (
    <div className="gb-card-premium p-4">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2 mt-2" />
    </div>
  );
}
