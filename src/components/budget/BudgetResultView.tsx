import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingDown } from "lucide-react";
import { BudgetResult, ILS } from "@/lib/budgetPricing";

const COLORS = [
  "#0E6B5A", "#16A34A", "#7C3AED", "#0E6B5A", "#EA580C", "#0FB5C9",
  "#DC2626", "#0891B2", "#65A30D", "#DB2777", "#9333EA", "#475569",
];

export function BudgetResultView({ result }: { result: BudgetResult }) {
  const pieData = useMemo(
    () => result.categories.map((c, i) => ({ name: c.name, value: Math.max(c.avg, 1), color: COLORS[i % COLORS.length] })),
    [result],
  );
  const maxCat = Math.max(...result.categories.map((c) => c.max));

  return (
    <div className="bg-white rounded-3xl p-5 space-y-5 border border-[#E5E7EB] shadow-sm" style={{ fontFamily: "'Epilogue', system-ui, sans-serif" }}>
      <div className="text-center">
        <div className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">הערכת עלות כוללת</div>
        <div className="text-[26px] font-extrabold text-[#1F2937] mt-1" style={{ fontFamily: "'Urbanist'" }}>
          {ILS(result.total.min)} – {ILS(result.total.max)}
        </div>
        <div className="text-[13px] text-[#6B7280] mt-1">
          ממוצע צפוי: <span className="font-bold text-[#1F2937]">{ILS(result.total.avg)}</span>
        </div>
        <div
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-extrabold text-[12px] bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]"
        >
          <TrendingDown className="h-3.5 w-3.5" />
          חיסכון משוער דרך GroupBuild: 12%–22%
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={1}>
              {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v: number) => ILS(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <div className="text-[13px] font-bold text-[#1F2937]" style={{ fontFamily: "'Urbanist'" }}>פירוט לפי קטגוריות</div>
        {result.categories.map((c, i) => {
          const pct = Math.max(8, Math.round((c.max / maxCat) * 100));
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-bold text-[#1F2937] flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {c.name}
                  {c.note && <span className="text-[11px] font-medium text-[#9CA3AF]">· {c.note}</span>}
                </span>
                <span className="text-[#6B7280] font-medium">{ILS(c.min)} – {ILS(c.max)}</span>
              </div>
              <div className="h-2 rounded-full bg-[#FCFBF8] overflow-hidden">
                <div className="h-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[#9CA3AF] text-center">
        * הערכת עלות בלבד, מבוססת על טווחי שוק 2026. למחיר סופי קבלו הצעות מספקים מאומתים.
      </p>
    </div>
  );
}
