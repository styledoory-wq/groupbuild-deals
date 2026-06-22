import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Eye, ArrowLeft, Inbox, ShieldCheck, CreditCard,
  TrendingUp, Users, Store, Tag, Wallet, Image as ImageIcon, AlertTriangle, Activity,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { setPreviewRole } from "@/lib/previewMode";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Stats = {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  totalDeposits: number;
  weeklyDeposits: number;
  users: number;
  newUsersWeek: number;
  suppliers: number;
  newSuppliersWeek: number;
  activeDeals: number;
  newDealsWeek: number;
  leads: number;
  conversionPct: number;
  // tasks
  pendingSuppliers: number;
  failedPayments: number;
  openLeads: number;
  dealsNoImage: number;
  suppliersNoDeals: number;
  inactiveProjects: number;
};

type ActivityItem = { id: string; label: string; time: string; tone: "lead" | "supplier" | "deposit" };

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useApp();
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0, monthlyRevenue: 0, weeklyRevenue: 0,
    totalDeposits: 0, weeklyDeposits: 0,
    users: 0, newUsersWeek: 0, suppliers: 0, newSuppliersWeek: 0,
    activeDeals: 0, newDealsWeek: 0, leads: 0, conversionPct: 0,
    pendingSuppliers: 0, failedPayments: 0, openLeads: 0,
    dealsNoImage: 0, suppliersNoDeals: 0, inactiveProjects: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const monthAgo = new Date(Date.now() - MONTH_MS).toISOString();
        const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

        const [
          users, newUsersWeek, suppliers, newSuppliersWeek, pendingSuppliers,
          activeDeals, newDealsWeek, depositsAll, paidAll, paidMonth, paidWeek,
          leadsRes, failedPayments, openLeads, dealsNoImage,
          recentInterests, recentSuppliers, recentDeposits,
        ] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false).gte("created_at", weekAgo),
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("approval_status", "pending"),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false).in("status", ["active", "closing-soon"]),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false).gte("created_at", weekAgo),
          supabase.from("deposits").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("deposits").select("gross_deposit_amount").eq("status", "paid").eq("is_deleted", false),
          supabase.from("deposits").select("gross_deposit_amount").eq("status", "paid").eq("is_deleted", false).gte("created_at", monthAgo),
          supabase.from("deposits").select("gross_deposit_amount,id", { count: "exact" }).eq("status", "paid").eq("is_deleted", false).gte("created_at", weekAgo),
          supabase.from("deal_interests").select("id, status", { count: "exact" }).eq("is_deleted", false),
          supabase.from("deposit_attempt_logs").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
          supabase.from("supplier_inquiries").select("id", { count: "exact", head: true }).eq("status", "new").lte("created_at", weekAgo).eq("is_deleted", false),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false).or("image_url.is.null,image_url.eq."),
          supabase.from("deal_interests").select("id, created_at, full_name").eq("is_deleted", false).order("created_at", { ascending: false }).limit(4),
          supabase.from("suppliers").select("id, created_at, business_name").eq("is_deleted", false).order("created_at", { ascending: false }).limit(3),
          supabase.from("deposits").select("id, created_at, gross_deposit_amount").eq("status", "paid").eq("is_deleted", false).order("created_at", { ascending: false }).limit(3),
        ]);

        const sum = (rows: Array<{ gross_deposit_amount: number | null }> | null) =>
          (rows ?? []).reduce((s, d) => s + Number(d.gross_deposit_amount ?? 0), 0);

        const leadsTotal = leadsRes.count ?? 0;
        const converted = (leadsRes.data ?? []).filter((i) => i.status === "joined" || i.status === "paid").length;

        setStats({
          totalRevenue: sum(paidAll.data),
          monthlyRevenue: sum(paidMonth.data),
          weeklyRevenue: sum(paidWeek.data),
          totalDeposits: depositsAll.count ?? 0,
          weeklyDeposits: paidWeek.count ?? 0,
          users: users.count ?? 0,
          newUsersWeek: newUsersWeek.count ?? 0,
          suppliers: suppliers.count ?? 0,
          newSuppliersWeek: newSuppliersWeek.count ?? 0,
          activeDeals: activeDeals.count ?? 0,
          newDealsWeek: newDealsWeek.count ?? 0,
          leads: leadsTotal,
          conversionPct: leadsTotal > 0 ? Math.round((converted / leadsTotal) * 100) : 0,
          pendingSuppliers: pendingSuppliers.count ?? 0,
          failedPayments: failedPayments.count ?? 0,
          openLeads: openLeads.count ?? 0,
          dealsNoImage: dealsNoImage.count ?? 0,
          suppliersNoDeals: 0,
          inactiveProjects: 0,
        });

        const acts: ActivityItem[] = [];
        (recentInterests.data ?? []).forEach((i) => acts.push({
          id: `i-${i.id}`, tone: "lead", label: `ליד חדש: ${i.full_name ?? "אנונימי"}`, time: i.created_at,
        }));
        (recentSuppliers.data ?? []).forEach((s) => acts.push({
          id: `s-${s.id}`, tone: "supplier", label: `ספק חדש: ${s.business_name}`, time: s.created_at,
        }));
        (recentDeposits.data ?? []).forEach((d) => acts.push({
          id: `d-${d.id}`, tone: "deposit", label: `פיקדון: ${formatILS(Number(d.gross_deposit_amount ?? 0))}`, time: d.created_at,
        }));
        acts.sort((a, b) => (b.time > a.time ? 1 : -1));
        setActivity(acts.slice(0, 8));
      } catch (err) {
        console.error("[AdminDashboard] stats", err);
      } finally {
        setLoading(false);
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
    { label: "הצעות ללא תמונה", count: stats.dealsNoImage, to: "/admin/deals", icon: ImageIcon, tone: "warning" as const },
  ].filter((t) => t.count > 0);

  return (
    <MobileShell>
      <AdminPageHeader
        title="מרכז שליטה"
        description="מבט-על על מצב המערכת"
        actions={
          <>
            <button onClick={() => { setPreviewRole("resident"); navigate("/resident"); }}
              className="hidden sm:inline-flex h-9 px-3 rounded-full bg-white border border-[#ECEEF2] items-center gap-1.5 text-[12px] font-bold text-[#1F2937] hover:bg-[#FAFBFC]">
              <Eye className="h-3.5 w-3.5" /> תצוגת דייר
            </button>
            <button onClick={() => { setPreviewRole("supplier"); navigate("/supplier"); }}
              className="hidden sm:inline-flex h-9 px-3 rounded-full bg-white border border-[#ECEEF2] items-center gap-1.5 text-[12px] font-bold text-[#1F2937] hover:bg-[#FAFBFC]">
              <Eye className="h-3.5 w-3.5" /> תצוגת ספק
            </button>
            <button onClick={handleLogout}
              className="h-9 px-3 rounded-full bg-white border border-[#ECEEF2] flex items-center gap-1.5 text-[12px] font-bold text-[#1F2937] hover:bg-[#FAFBFC]">
              <LogOut className="h-3.5 w-3.5" /> יציאה
            </button>
          </>
        }
      />

      <div dir="rtl" className="p-3 lg:p-6 space-y-3 lg:space-y-4">
        {/* HERO: Revenue summary */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-1 bg-gradient-to-br from-[#0E6B5A] to-[#0a574a] text-white rounded-[14px] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold opacity-80">סה״כ מחזור במערכת</span>
              <TrendingUp className="h-4 w-4 opacity-80" />
            </div>
            <div className="text-[26px] font-extrabold tabular-nums mt-2 leading-none">{formatILS(stats.totalRevenue)}</div>
            <div className="flex items-center gap-3 mt-3 text-[11px]">
              <span className="opacity-90"><span className="font-extrabold">{formatILS(stats.monthlyRevenue)}</span> · 30 ימים</span>
              <span className="opacity-70">·</span>
              <span className="opacity-90"><span className="font-extrabold">{formatILS(stats.weeklyRevenue)}</span> · השבוע</span>
            </div>
          </div>

          <RevenueCard label="פיקדונות שנאספו" value={stats.totalDeposits.toLocaleString("he-IL")}
            sub={`${stats.weeklyDeposits} השבוע`} icon={<Wallet className="h-4 w-4 text-[#0E6B5A]" />} accent="#0E6B5A" />
          <RevenueCard label="הצעות פעילות" value={stats.activeDeals.toLocaleString("he-IL")}
            sub={`${stats.newDealsWeek} חדשות השבוע`} icon={<Tag className="h-4 w-4 text-[#2563EB]" />} accent="#2563EB" />
        </section>

        {/* Weekly growth strip */}
        <section className="bg-white border border-[#ECEEF2] rounded-[14px] p-3 lg:p-4">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-extrabold text-[13px] text-[#0F172A]">מה קרה השבוע</h2>
            <span className="text-[10px] text-[#9CA3AF] font-bold">7 ימים אחרונים</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <WeekStat icon={<Users className="h-3.5 w-3.5" />} label="משתמשים חדשים" value={stats.newUsersWeek} total={stats.users} />
            <WeekStat icon={<Store className="h-3.5 w-3.5" />} label="ספקים חדשים" value={stats.newSuppliersWeek} total={stats.suppliers} />
            <WeekStat icon={<Tag className="h-3.5 w-3.5" />} label="הצעות חדשות" value={stats.newDealsWeek} total={stats.activeDeals} />
            <WeekStat icon={<Wallet className="h-3.5 w-3.5" />} label="פיקדונות" value={stats.weeklyDeposits} total={stats.totalDeposits} />
          </div>
        </section>

        {/* Two columns: Tasks (priority) + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* Tasks - takes priority */}
          <section className="lg:col-span-3 bg-white border border-[#ECEEF2] rounded-[14px] p-3 lg:p-4">
            <header className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-[13px] text-[#0F172A]">דורש טיפול</h2>
                {tasks.length > 0 && (
                  <span className="text-[10px] font-extrabold tabular-nums bg-[#FEE2E2] text-[#B91C1C] px-1.5 py-0.5 rounded-md">
                    {tasks.reduce((s, t) => s + t.count, 0)}
                  </span>
                )}
              </div>
              <button onClick={() => navigate("/admin/control")} className="text-[11px] font-extrabold text-[#0E6B5A] hover:underline">
                כל המשימות ←
              </button>
            </header>
            {tasks.length === 0 ? (
              <div className="py-8 text-center">
                <div className="inline-flex items-center gap-1.5 text-[12px] text-[#0E6B5A] font-bold bg-[#E7F5F0] px-3 py-1.5 rounded-full">
                  <ShieldCheck className="h-3.5 w-3.5" /> הכול תקין
                </div>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {tasks.map((t) => (
                  <li key={t.label}>
                    <button onClick={() => navigate(t.to)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] hover:bg-[#FAFBFC] text-right transition-colors border border-transparent hover:border-[#ECEEF2]">
                      <span className={cn(
                        "h-7 w-7 rounded-[8px] flex items-center justify-center shrink-0",
                        t.tone === "danger" ? "bg-[#FEE2E2]" : "bg-[#FEF3C7]",
                      )}>
                        <t.icon className={cn("h-3.5 w-3.5", t.tone === "danger" ? "text-[#B91C1C]" : "text-[#B45309]")} strokeWidth={2.2} />
                      </span>
                      <span className="text-[12.5px] text-[#1F2937] flex-1 truncate font-medium">{t.label}</span>
                      <span className={cn(
                        "text-[12px] font-extrabold tabular-nums px-1.5 rounded-md",
                        t.tone === "danger" ? "text-[#B91C1C] bg-[#FEE2E2]" : "text-[#B45309] bg-[#FEF3C7]",
                      )}>
                        {t.count}
                      </span>
                      <ArrowLeft className="h-3 w-3 text-[#9CA3AF]" strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Activity */}
          <section className="lg:col-span-2 bg-white border border-[#ECEEF2] rounded-[14px] p-3 lg:p-4">
            <header className="flex items-center justify-between mb-2.5">
              <h2 className="font-extrabold text-[13px] text-[#0F172A] flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-[#0E6B5A]" /> פעילות אחרונה
              </h2>
            </header>
            {loading ? (
              <div className="py-6 text-center text-[12px] text-[#9CA3AF]">טוען…</div>
            ) : activity.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[#9CA3AF]">אין פעילות חדשה</div>
            ) : (
              <ul className="divide-y divide-[#F1F3F7]">
                {activity.map((a) => (
                  <li key={a.id} className="py-2 flex items-center gap-2">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      a.tone === "lead" ? "bg-[#2563EB]" : a.tone === "supplier" ? "bg-[#D97706]" : "bg-[#0E6B5A]",
                    )} />
                    <span className="text-[12px] text-[#1F2937] flex-1 truncate">{a.label}</span>
                    <span className="text-[10px] text-[#9CA3AF] tabular-nums shrink-0">
                      {new Date(a.time).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Conversion footer */}
        <section className="bg-white border border-[#ECEEF2] rounded-[14px] p-3 lg:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-[#6B7280] font-bold">המרת לידים</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[20px] font-extrabold tabular-nums text-[#0F172A]">{stats.conversionPct}%</span>
                <span className="text-[11px] text-[#6B7280]">מתוך {stats.leads.toLocaleString("he-IL")} לידים</span>
              </div>
            </div>
            <div className="hidden sm:flex flex-1 max-w-xs h-2 rounded-full bg-[#F1F3F7] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-l from-[#0E6B5A] to-[#10B981] transition-all"
                style={{ width: `${stats.conversionPct}%` }} />
            </div>
            <button onClick={() => navigate("/admin/leads")}
              className="h-8 px-3 rounded-[10px] bg-[#F4F6FA] text-[#1F2937] text-[11px] font-bold hover:bg-[#ECEEF2] whitespace-nowrap">
              ניהול לידים
            </button>
          </div>
        </section>
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function RevenueCard({ label, value, sub, icon, accent }: {
  label: string; value: string; sub: string; icon: React.ReactNode; accent: string;
}) {
  return (
    <div className="bg-white border border-[#ECEEF2] rounded-[14px] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#6B7280]">{label}</span>
        <span className="h-7 w-7 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: `${accent}14` }}>
          {icon}
        </span>
      </div>
      <div className="text-[24px] font-extrabold tabular-nums mt-2 leading-none text-[#0F172A]">{value}</div>
      <div className="text-[11px] text-[#6B7280] mt-2">{sub}</div>
    </div>
  );
}

function WeekStat({ icon, label, value, total }: { icon: React.ReactNode; label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="bg-[#FAFBFC] border border-[#F1F3F7] rounded-[10px] p-2.5">
      <div className="flex items-center gap-1.5 text-[#6B7280]">
        {icon}
        <span className="text-[10.5px] font-bold truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5 mt-1.5">
        <span className="text-[18px] font-extrabold tabular-nums text-[#0F172A] leading-none">+{value.toLocaleString("he-IL")}</span>
        {total > 0 && <span className="text-[10px] text-[#0E6B5A] font-extrabold tabular-nums">{pct}%</span>}
      </div>
      <div className="text-[10px] text-[#9CA3AF] mt-1">מתוך {total.toLocaleString("he-IL")}</div>
    </div>
  );
}
