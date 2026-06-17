import { ReactNode } from "react";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/**
 * Unified screen header. Large title + small subtitle below.
 * Use at the top of every screen for consistent hierarchy.
 */
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[24px] font-extrabold text-[#1F2937] tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px] font-medium text-[#6B7280]">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
