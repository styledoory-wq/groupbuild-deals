import { Skeleton } from "@/components/ui/skeleton";

export function DealCardSkeleton() {
  return (
    <div className="gb-card-premium overflow-hidden p-0">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-1.5 w-full rounded-full" />
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
