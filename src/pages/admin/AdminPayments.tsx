import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, CreditCard, AlertTriangle, ArrowLeft } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminKpiRow } from "@/components/admin/AdminKpiRow";
import { supabase } from "@/integrations/supabase/client";
import { formatILS } from "@/store/AppStore";

type Stats = { totalDeposits: number; paidAmount: number; pendingDeposits: number; failedAttempts: number };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function AdminPayments() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalDeposits: 0, paidAmount: 0, pendingDeposits: 0, failedAttempts: 0 });

  useEffect(() => {
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - WEEK_MS).toISOString();
      const [total, paid, pending, failed] = await Promise.all([
        supabase.from("deposits").select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("deposits").select("gross_deposit_amount").eq("status", "paid").eq("is_deleted", false),
        supabase.from("deposits").select("id", { count: "exact", head: true }).eq("status", "pending").eq("is_deleted", false),
        supabase.from("deposit_attempt_logs").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      ]);
      setStats({
        totalDeposits: total.count ?? 0,
        paidAmount: (paid.data ?? []).reduce((s, d) => s + Number(d.gross_deposit_amount ?? 0), 0),
        pendingDeposits: pending.count ?? 0,
        failedAttempts: failed.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { to: "/admin/deposits", icon: Wallet, title: "פיקדונות", desc: "ניהול ומעקב פיקדונות, החזרים ויומן ניסיונות סליקה" },
    { to: "/admin/payment-settings", icon: CreditCard, title: "הגדרות סליקה", desc: "ספק סליקה, סכומי פיקדון, עמלות וחלוקת עלות" },
  ];

  return (
    <MobileShell>
      <AdminPageHeader title="תשלומים" description="פיקדונות, סליקה וניסיונות תשלום" />

      <AdminKpiRow
        items={[
          { label: "סה״כ פיקדונות", value: stats.totalDeposits.toLocaleString("he-IL") },
          { label: "ששולמו (סכום)", value: formatILS(stats.paidAmount), tone: "positive" },
          { label: "ממתינים", value: stats.pendingDeposits.toLocaleString("he-IL"), tone: "warning" },
          { label: "ניסיונות שנכשלו (7 ימים)", value: stats.failedAttempts.toLocaleString("he-IL"), tone: stats.failedAttempts > 0 ? "danger" : "neutral" },
        ]}
      />

      <div className="px-5 lg:px-8 py-5 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl">
        {cards.map((c) => (
          <button
            key={c.to}
            onClick={() => navigate(c.to)}
            className="text-right bg-white border border-[#ECEEF2] rounded-[14px] p-5 hover:border-[#0E6B5A]/40 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <span className="h-11 w-11 rounded-[10px] bg-[#E7F5F0] flex items-center justify-center shrink-0">
                <c.icon className="h-5 w-5 text-[#0E6B5A]" strokeWidth={2.2} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-[15px] text-[#0F172A]">{c.title}</div>
                <div className="text-[12.5px] text-[#6B7280] mt-1 leading-snug">{c.desc}</div>
              </div>
              <ArrowLeft className="h-4 w-4 text-[#9CA3AF] group-hover:text-[#0E6B5A] mt-1 shrink-0" strokeWidth={2} />
            </div>
          </button>
        ))}
        {stats.failedAttempts > 0 && (
          <div className="md:col-span-2 flex items-center gap-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-[14px] px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-[#B45309] shrink-0" strokeWidth={2.2} />
            <div className="text-[13px] text-[#92400E] font-medium flex-1">
              {stats.failedAttempts} ניסיונות סליקה נכשלו השבוע — מומלץ לבדוק במסך הבקרה.
            </div>
            <button onClick={() => navigate("/admin/control")} className="text-[12px] font-extrabold text-[#B45309] hover:underline">
              לבקרה ←
            </button>
          </div>
        )}
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
