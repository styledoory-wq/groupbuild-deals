import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** Unified error view — red icon + title + optional description + retry button. */
export function ErrorState({
  title = "משהו השתבש",
  description,
  onRetry,
  retryLabel = "נסה שוב",
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <div className="h-16 w-16 rounded-full bg-[#FDECEC] flex items-center justify-center">
        <AlertCircle className="h-7 w-7 text-[#C73E3E]" strokeWidth={2} />
      </div>
      <h3 className="mt-4 text-[16px] font-extrabold text-[#1F2937] tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-[13px] font-medium text-[#6B7280] max-w-[320px]">
          {description}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 h-11 px-5 rounded-xl bg-[#0E6B5A] text-white text-sm font-medium hover:bg-[#0c5a4c] active:scale-95 transition"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
