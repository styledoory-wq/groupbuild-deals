import { ReactNode } from "react";

/**
 * Unified header for every admin screen — calm, generous, Linear-like.
 */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      dir="rtl"
      className="px-5 lg:px-8 pt-7 pb-5 bg-[#F7F8FA] sticky top-0 z-30 backdrop-blur-xl bg-[#F7F8FA]/85"
    >
      <div className="flex items-start gap-3 justify-between max-w-6xl">
        <div className="min-w-0">
          <h1 className="text-[22px] lg:text-[26px] font-bold text-[#0F172A] tracking-tight leading-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-[13px] text-[#8B94A3] mt-1 leading-snug">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
