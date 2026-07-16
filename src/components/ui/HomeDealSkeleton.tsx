import { Skeleton } from "@/components/ui/skeleton";

/**
 * Unified deal card skeleton for the guest home / lists.
 * Uses the shared `.gb-skeleton` shimmer so every loading state feels the same.
 */
export function HomeDealSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-stone-100">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-1/2 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

export function HomeDealSkeletonList({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <HomeDealSkeleton key={i} />
      ))}
    </div>
  );
}
