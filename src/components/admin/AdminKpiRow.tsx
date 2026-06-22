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
      className="flex overflow-x-auto lg:grid lg:grid-cols-7 lg:overflow-visible divide-x divide-x-reverse divide-[#ECEEF2] border-b border-[#ECEEF2] bg-white scrollbar-none"
    >
      {items.map((k, i) => (
        <div key={i} className="px-3 lg:px-4 py-2 min-w-[110px] lg:min-w-0 shrink-0 lg:shrink">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] truncate">
            {k.label}
          </div>
          <div
            className={cn(
              "mt-0.5 text-[14px] lg:text-[15px] font-extrabold tracking-tight leading-tight truncate",
              toneText[k.tone ?? "neutral"],
            )}
          >
            {k.value}
          </div>
          {k.hint && <div className="text-[10px] text-[#9CA3AF] truncate">{k.hint}</div>}
        </div>
      ))}
    </div>
  );
}
