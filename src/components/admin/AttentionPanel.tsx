import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldCheck, CreditCard, Inbox, ImageOff, MessageSquare, UserCheck, type LucideIcon } from "lucide-react";
import { useAdminAttention } from "@/hooks/useAdminAttention";
import { cn } from "@/lib/utils";

type Row = { key: keyof ReturnType<typeof useAdminAttention>["data"] & string; icon: LucideIcon; label: string; to: string; severe?: boolean };

const ROWS: Row[] = [
  { key: "pendingSuppliers", icon: ShieldCheck, label: "ספקים ממתינים לאישור", to: "/admin/suppliers?tab=pending" },
  { key: "openComplaints", icon: MessageSquare, label: "תלונות פתוחות", to: "/admin/complaints", severe: true },
  { key: "failedPayments", icon: CreditCard, label: "תשלומים שנכשלו", to: "/admin/payments", severe: true },
  { key: "openLeads", icon: Inbox, label: "לידים ללא מענה", to: "/admin/leads" },
  { key: "pendingCommittee", icon: UserCheck, label: "בקשות ועד בית", to: "/admin/committee-requests" },
  { key: "dealsNoImage", icon: ImageOff, label: "הצעות ללא תמונה", to: "/admin/deals?tab=no_image" },
];

/**
 * Silent, calm attention panel. Only rows with count > 0 are shown.
 * Zero state = single reassuring line — no chart, no clutter.
 */
export function AttentionPanel() {
  const navigate = useNavigate();
  const { data, isLoading } = useAdminAttention();

  if (isLoading) {
    return (
      <div className="rounded-[16px] bg-white border border-[#EEF0F4] p-6 animate-pulse">
        <div className="h-4 w-24 bg-[#F1F3F7] rounded mb-4" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-[#F7F8FA] rounded-lg" />)}
        </div>
      </div>
    );
  }

  const visible = ROWS.map((r) => ({ ...r, count: data?.[r.key] ?? 0 })).filter((r) => r.count > 0);

  if (visible.length === 0) {
    return (
      <div className="rounded-[16px] bg-white border border-[#EEF0F4] p-6 flex items-center gap-3">
        <span className="h-10 w-10 rounded-full bg-[#E7F5F0] flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-[#0E6B5A]" strokeWidth={2} />
        </span>
        <div>
          <div className="text-[15px] font-bold text-[#0F172A]">הכול תחת שליטה</div>
          <div className="text-[13px] text-[#8B94A3]">אין פריטים שדורשים טיפול כרגע.</div>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-[16px] bg-white border border-[#EEF0F4] overflow-hidden">
      <header className="px-6 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[#0F172A] tracking-tight">דורש טיפול</h2>
          <p className="text-[12px] text-[#8B94A3] mt-0.5">{visible.length} פריטים · לחץ לפעולה</p>
        </div>
      </header>
      <ul className="divide-y divide-[#F3F5F8]">
        {visible.map((r) => (
          <li key={r.key}>
            <button
              onClick={() => navigate(r.to)}
              className="w-full flex items-center gap-4 px-6 py-3.5 text-right hover:bg-[#FAFBFC] transition-all duration-200 ease-out group"
            >
              <span className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                r.severe ? "bg-[#FEECEC]" : "bg-[#F4F6FA]",
              )}>
                <r.icon className={cn("h-[17px] w-[17px]", r.severe ? "text-[#C1483C]" : "text-[#4B5563]")} strokeWidth={1.75} />
              </span>
              <span className="flex-1 text-[14px] font-semibold text-[#0F172A] truncate">{r.label}</span>
              <span className={cn(
                "min-w-[28px] h-7 px-2.5 rounded-full inline-flex items-center justify-center text-[12px] font-bold tabular-nums",
                r.severe ? "bg-[#C1483C] text-white" : "bg-[#0F172A] text-white",
              )}>
                {r.count}
              </span>
              <ArrowLeft className="h-4 w-4 text-[#C4CAD3] group-hover:text-[#0E6B5A] group-hover:-translate-x-0.5 transition-all duration-200 shrink-0" strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
