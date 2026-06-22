import { ReactNode } from "react";

/**
 * Unified header for every admin screen.
 * Clean SaaS look — title + optional description + right actions slot.
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
    <header dir="rtl" className="px-5 lg:px-8 pt-6 pb-4 border-b border-[#ECEEF2] bg-white">
      <div className="flex items-start gap-3 justify-between">
        <div className="min-w-0">
          <h1 className="text-[20px] lg:text-[24px] font-extrabold text-[#0F172A] tracking-tight leading-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-[13px] text-[#6B7280] mt-1 font-medium leading-snug">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
