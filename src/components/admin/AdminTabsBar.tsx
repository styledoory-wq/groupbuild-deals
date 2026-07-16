import { cn } from "@/lib/utils";

export type AdminTab = {
  key: string;
  label: string;
  count?: number;
};

/**
 * Linear-style segmented tabs with subtle counts. Used across admin list screens.
 */
export function AdminTabsBar({
  tabs,
  active,
  onChange,
}: {
  tabs: AdminTab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div dir="rtl" className="inline-flex items-center gap-1 bg-[#F4F6FA] rounded-[12px] p-1">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              "h-9 px-3.5 rounded-[9px] text-[13px] font-semibold flex items-center gap-2 transition-all duration-200 ease-out",
              isActive
                ? "bg-white text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                : "text-[#6B7280] hover:text-[#0F172A]",
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className={cn(
                "min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums inline-flex items-center justify-center",
                isActive ? "bg-[#F1F3F7] text-[#0F172A]" : "bg-white text-[#8B94A3]",
              )}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
