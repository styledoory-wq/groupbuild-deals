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
      <div className="h-9 w-9 rounded-full border-2 border-[#0E6B5A] border-t-transparent animate-spin" />
      {label && <p className="text-sm text-[#6B6B6B]">{label}</p>}
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  itemClassName?: string;
}

/** Generic skeleton list — neutral cards for list-style pages. */
export function SkeletonList({ count = 4, itemClassName = "h-20" }: SkeletonListProps) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${itemClassName} rounded-2xl bg-white border border-[#EDEAE3] overflow-hidden relative`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.04] to-transparent animate-[shimmer_1.4s_infinite]" />
        </div>
      ))}
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }`}</style>
    </div>
  );
}
