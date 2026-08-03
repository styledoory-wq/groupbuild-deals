import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** Unified error view — icon medallion + title + optional description + retry. */
export function ErrorState({
  title = "משהו השתבש",
  description,
  onRetry,
  retryLabel = "נסה שוב",
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10 animate-fade-in">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="h-7 w-7 text-destructive" strokeWidth={2} />
      </div>
      <h3 className="mt-4 text-[16px] font-extrabold text-foreground tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 text-[13px] font-medium text-muted-foreground max-w-[320px] leading-relaxed">
          {description}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition duration-150 touch-manipulation"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
