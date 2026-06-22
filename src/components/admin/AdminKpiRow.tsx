import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Kpi = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
};

const toneText: Record<NonNullable<Kpi["tone"]>, string> = {
  neutral: "text-[#0F172A]",
  positive: "text-[#0E6B5A]",
  warning: "text-[#B45309]",
  danger: "text-[#B91C1C]",
};

/**
 * Single horizontal KPI strip — no boxy cards, no shadows.
 * Auto-wraps on mobile (2 cols), spreads on desktop.
 */
export function AdminKpiRow({ items }: { items: Kpi[] }) {
  return (
    <div
      dir="rtl"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 divide-x divide-x-reverse divide-[#ECEEF2] border-b border-[#ECEEF2] bg-white"
    >
      {items.map((k, i) => (
        <div key={i} className="px-4 lg:px-5 py-4 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
            {k.label}
          </div>
          <div
            className={cn(
              "mt-1.5 text-[20px] lg:text-[22px] font-extrabold tracking-tight leading-none truncate",
              toneText[k.tone ?? "neutral"],
            )}
          >
            {k.value}
          </div>
          {k.hint && <div className="mt-1 text-[11px] text-[#9CA3AF] truncate">{k.hint}</div>}
        </div>
      ))}
    </div>
  );
}
