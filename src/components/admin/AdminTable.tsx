import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  width?: string;
};

/**
 * Professional admin data table — thin headers, hover, subtle zebra,
 * horizontal-scroll on mobile. No heavy shadows, no decorative borders.
 */
export function AdminTable<T extends { id?: string | number }>({
  columns,
  rows,
  empty = "אין נתונים להצגה",
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}) {
  if (!rows.length) {
    return (
      <div className="bg-white border border-[#ECEEF2] rounded-[14px] px-6 py-12 text-center text-[13px] text-[#6B7280] font-medium">
        {empty}
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#ECEEF2] rounded-[14px] overflow-hidden">
      <div className="overflow-x-auto">
        <table dir="rtl" className="w-full text-right text-[13px]">
          <thead>
            <tr className="bg-[#FAFBFC] border-b border-[#ECEEF2]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={cn(
                    "px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-[#6B7280] whitespace-nowrap",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-[#F1F3F7] last:border-b-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-[#FAFBFC]",
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 text-[#1F2937]", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Small status pill — only 3 tones to keep the system calm. */
export function StatusPill({
  tone,
  children,
}: {
  tone: "positive" | "warning" | "danger" | "neutral";
  children: ReactNode;
}) {
  const map = {
    positive: "bg-[#E7F5F0] text-[#0E6B5A]",
    warning: "bg-[#FEF3C7] text-[#B45309]",
    danger: "bg-[#FEE2E2] text-[#B91C1C]",
    neutral: "bg-[#F1F3F7] text-[#6B7280]",
  } as const;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap", map[tone])}>
      {children}
    </span>
  );
}
