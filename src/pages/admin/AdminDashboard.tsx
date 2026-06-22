import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Eye, ArrowLeft, Inbox, AlertTriangle, ShieldCheck, CreditCard } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminKpiRow } from "@/components/admin/AdminKpiRow";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { setPreviewRole } from "@/lib/previewMode";
import { toast } from "sonner";

type Stats = {
  monthlyRevenue: number;
  users: number;
  suppliers: number;
  activeDeals: number;
  deposits: number;
  leads: number;
  conversionPct: number;
  pendingSuppliers: number;
  failedPayments: number;
  openLeads: number;
};

type Activity = { id: string; type: string; label: string; time: string };

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useApp();
  const [stats, setStats] = useState<Stats>({
    monthlyRevenue: 0, users: 0, suppliers: 0, activeDeals: 0,
    deposits: 0, leads: 0, conversionPct: 0,
    pendingSuppliers: 0, failedPayments: 0, openLeads: 0,
  });
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const monthAgo = new Date(Date.now() - MONTH_MS).toISOString();
        const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

        const [users, suppliers, pendingSuppliers, activeDeals, depositsAll, paidMonth, leadsRes, failedPayments, openLeads, recentInterests, recentSuppliers] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("approval_status", "pending"),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false).in("status", ["active", "closing-soon"]),
          supabase.from("deposits").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("deposits").select("gross_deposit_amount").eq("status", "paid").eq("is_deleted", false).gte("created_at", monthAgo),
          supabase.from("deal_interests").select("id, status", { count: "exact" }).eq("is_deleted", false),
          supabase.from("deposit_attempt_logs").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
          supabase.from("supplier_inquiries").select("id", { count: "exact", head: true }).eq("status", "new").lte("created_at", weekAgo).eq("is_deleted", false),
          supabase.from("deal_interests").select("id, created_at, full_name, status").eq("is_deleted", false).order("created_at", { ascending: false }).limit(5),
          supabase.from("suppliers").select("id, created_at, business_name").eq("is_deleted", false).order("created_at", { ascending: false }).limit(3),
        ]);

        const monthlyRevenue = (paidMonth.data ?? []).reduce((s, d) => s + Number(d.gross_deposit_amount ?? 0), 0);
        const leadsTotal = leadsRes.count ?? 0;
        const converted = (leadsRes.data ?? []).filter((i) => i.status === "joined" || i.status === "paid").length;
        const conversionPct = leadsTotal > 0 ? Math.round((converted / leadsTotal) * 100) : 0;

        setStats({
          monthlyRevenue,
          users: users.count ?? 0,
          suppliers: suppliers.count ?? 0,
          activeDeals: activeDeals.count ?? 0,
          deposits: depositsAll.count ?? 0,
          leads: leadsTotal,
          conversionPct,
          pendingSuppliers: pendingSuppliers.count ?? 0,
          failedPayments: failedPayments.count ?? 0,
          openLeads: openLeads.count ?? 0,
        });

        const acts: Activity[] = [];
        (recentInterests.data ?? []).forEach((i) => acts.push({
          id: `i-${i.id}`, type: "lead", label: `ליד חדש: ${i.customer_name ?? "אנונימי"}`, time: i.created_at,
        }));
        (recentSuppliers.data ?? []).forEach((s) => acts.push({
          id: `s-${s.id}`, type: "supplier", label: `ספק חדש: ${s.business_name}`, time: s.created_at,
        }));
        acts.sort((a, b) => (b.time > a.time ? 1 : -1));
        setActivity(acts.slice(0, 8));
      } catch (err) {
        console.error("[AdminDashboard] stats", err);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.warn(e); }
    logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  const tasks = [
    { label: "ספקים ממתינים לאישור", count: stats.pendingSuppliers, to: "/admin/suppliers", icon: ShieldCheck, tone: "warning" as const },
    { label: "תשלומים שנכשלו (7 ימים)", count: stats.failedPayments, to: "/admin/payments", icon: CreditCard, tone: "danger" as const },
    { label: "לידים ללא מענה", count: stats.openLeads, to: "/admin/leads", icon: Inbox, tone: "warning" as const },
  ].filter((t) => t.count > 0);

  return (
    <MobileShell>
      <AdminPageHeader
        title="דשבורד"
        description="מבט-על על הפעילות במערכת"
        actions={
          <>
            <button
              onClick={() => { setPreviewRole("resident"); navigate("/resident"); }}
              className="hidden sm:inline-flex h-9 px-3 rounded-full bg-white border border-[#ECEEF2] items-center gap-1.5 text-[12px] font-bold text-[#1F2937] hover:bg-[#FAFBFC]"
            >
              <Eye className="h-3.5 w-3.5" /> תצוגת דייר
            </button>
            <button
              onClick={() => { setPreviewRole("supplier"); navigate("/supplier"); }}
              className="hidden sm:inline-flex h-9 px-3 rounded-full bg-white border border-[#ECEEF2] items-center gap-1.5 text-[12px] font-bold text-[#1F2937] hover:bg-[#FAFBFC]"
            >
              <Eye className="h-3.5 w-3.5" /> תצוגת ספק
            </button>
            <button
              onClick={handleLogout}
              className="h-9 px-3 rounded-full bg-white border border-[#ECEEF2] flex items-center gap-1.5 text-[12px] font-bold text-[#1F2937] hover:bg-[#FAFBFC]"
            >
              <LogOut className="h-3.5 w-3.5" /> יציאה
            </button>
          </>
        }
      />

      <AdminKpiRow
        items={[
          { label: "מחזור חודשי", value: formatILS(stats.monthlyRevenue), tone: "positive" },
          { label: "משתמשים", value: stats.users.toLocaleString("he-IL") },
          { label: "ספקים", value: stats.suppliers.toLocaleString("he-IL"), hint: stats.pendingSuppliers > 0 ? `${stats.pendingSuppliers} ממתינים` : undefined },
          { label: "הצעות פעילות", value: stats.activeDeals.toLocaleString("he-IL") },
          { label: "פיקדונות", value: stats.deposits.toLocaleString("he-IL") },
          { label: "לידים", value: stats.leads.toLocaleString("he-IL") },
          { label: "אחוז המרה", value: `${stats.conversionPct}%`, tone: stats.conversionPct >= 20 ? "positive" : "neutral" },
        ]}
      />

      <div className="px-5 lg:px-8 py-5 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl">
        {/* Activity feed */}
        <section className="lg:col-span-2 bg-white border border-[#ECEEF2] rounded-[14px] p-5">
          <header className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-[15px] text-[#0F172A]">פעילות אחרונה</h2>
          </header>
          {activity.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#9CA3AF]">אין פעילות חדשה</div>
          ) : (
            <ul className="divide-y divide-[#F1F3F7]">
              {activity.map((a) => (
                <li key={a.id} className="py-2.5 flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#0E6B5A] shrink-0" />
                  <span className="text-[13px] text-[#1F2937] flex-1 truncate">{a.label}</span>
                  <span className="text-[11px] text-[#9CA3AF] tabular-nums shrink-0">
                    {new Date(a.time).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tasks */}
        <section className="bg-white border border-[#ECEEF2] rounded-[14px] p-5">
          <header className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-[15px] text-[#0F172A]">משימות לטיפול</h2>
            <button onClick={() => navigate("/admin/control")} className="text-[12px] font-extrabold text-[#0E6B5A] hover:underline">
              הכול ←
            </button>
          </header>
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#9CA3AF]">הכול תקין ✓</div>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.label}>
                  <button
                    onClick={() => navigate(t.to)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-[#FAFBFC] text-right transition-colors"
                  >
                    <span className={`h-8 w-8 rounded-[8px] flex items-center justify-center shrink-0 ${t.tone === "danger" ? "bg-[#FEE2E2]" : "bg-[#FEF3C7]"}`}>
                      <t.icon className={`h-4 w-4 ${t.tone === "danger" ? "text-[#B91C1C]" : "text-[#B45309]"}`} strokeWidth={2.2} />
                    </span>
                    <span className="text-[13px] text-[#1F2937] flex-1 truncate font-medium">{t.label}</span>
                    <span className={`text-[13px] font-extrabold tabular-nums ${t.tone === "danger" ? "text-[#B91C1C]" : "text-[#B45309]"}`}>
                      {t.count}
                    </span>
                    <ArrowLeft className="h-3.5 w-3.5 text-[#9CA3AF]" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {tasks.length === 0 && stats.failedPayments === 0 && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-[10px] bg-[#E7F5F0] text-[12px] text-[#0E6B5A]">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>אין משימות פתוחות. עברו על מסך הבקרה לוודא תקינות.</span>
            </div>
          )}
        </section>
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
