interface LoadingStateProps {
  /** Optional text below spinner. Defaults to "טוען…". */
  label?: string;
  /** Fills its container vertically. Default true. */
  fullHeight?: boolean;
}

/** Centered spinner + optional label, used as a unified Loading view. */
export function LoadingState({ label = "טוען…", fullHeight = true }: LoadingStateProps) {
  return (
    <div
      className={`${fullHeight ? "min-h-[60vh]" : "py-12"} flex flex-col items-center justify-center gap-3`}
      role="status"
      aria-live="polite"
    >
      <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  itemClassName?: string;
}

/**
 * Generic skeleton list. Uses the single shared `.gb-skeleton` shimmer so all
 * loading states across the app share animation, color and rhythm.
 */
export function SkeletonList({ count = 4, itemClassName = "h-20" }: SkeletonListProps) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`gb-skeleton rounded-2xl ${itemClassName}`} />
      ))}
    </div>
  );
}
