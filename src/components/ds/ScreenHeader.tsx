import { ReactNode } from "react";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/**
 * Unified screen header (no back button — top-level screens).
 * Shares the exact metrics of PageHeader / BackHeader:
 * px-5, pt-4, pb-3, 24px extrabold title, 13px muted subtitle.
 */
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <header className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 animate-fade-in">
      <div className="min-w-0">
        <h1 className="text-[24px] font-extrabold text-foreground tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
