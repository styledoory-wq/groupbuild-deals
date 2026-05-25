import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, ShieldCheck, Tag, Wallet, TrendingUp, LogOut, BarChart3, LayoutGrid, ChevronLeft, CreditCard, MapPin, Settings, UserCog, AlertTriangle, type LucideIcon } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Stats = {
  projects: number;
  suppliers: number;
  pendingSuppliers: number;
  activeDeals: number;
  totalDeposits: number;
  paidDepositsAmount: number;
  apartments: number;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { projects, categories, logout } = useApp();
  const [stats, setStats] = useState<Stats>({
    projects: 0, suppliers: 0, pendingSuppliers: 0, activeDeals: 0,
    totalDeposits: 0, paidDepositsAmount: 0, apartments: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const [projRes, supRes, pendingRes, dealsRes, depCountRes, depPaidRes] = await Promise.all([
          supabase.from("projects").select("apartment_count", { count: "exact" }).eq("is_deleted", false).eq("is_active", true),
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("approval_status", "pending"),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false).in("status", ["active", "closing-soon"]),
          supabase.from("deposits").select("id", { count: "exact", head: true }).eq("is_deleted", false).in("status", ["pending", "paid"]),
          supabase.from("deposits").select("amount").eq("status", "paid").eq("is_deleted", false),
        ]);

        const apartments = (projRes.data ?? []).reduce((s: number, p: { apartment_count: number | null }) => s + (p.apartment_count ?? 0), 0);
        const paidAmount = (depPaidRes.data ?? []).reduce((s: number, d: { amount: number | null }) => s + Number(d.amount ?? 0), 0);

        setStats({
          projects: projRes.count ?? (projRes.data?.length ?? 0),
          suppliers: supRes.count ?? 0,
          pendingSuppliers: pendingRes.count ?? 0,
          activeDeals: dealsRes.count ?? 0,
          totalDeposits: depCountRes.count ?? 0,
          paidDepositsAmount: paidAmount,
          apartments,
        });
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

  return (
    <MobileShell>
      <header className="relative">
        <div className="relative h-[230px] overflow-hidden rounded-b-[28px] bg-[#0A1F3D]">
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#0A1F3D] via-[#0A1F3D] to-[#071427]" />
          <div aria-hidden className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[#C9A961]/10 blur-3xl" />
          <div aria-hidden className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-[#C9A961]/5 blur-2xl" />

          <div className="relative flex items-center justify-between gap-2 px-5 pt-4">
            <span className="h-9 px-3 rounded-full bg-white/10 border border-white/20 backdrop-blur flex items-center text-white text-[11px] font-semibold uppercase tracking-[0.14em]">
              אזור ניהול
            </span>
            <button
              onClick={handleLogout}
              className="h-9 px-3 rounded-full bg-white/12 border border-white/25 backdrop-blur flex items-center gap-1.5 text-white hover:bg-white/20 transition-smooth text-[12px] font-semibold"
              aria-label="יציאה"
            >
              <LogOut className="h-[15px] w-[15px]" strokeWidth={2} />
              <span>התנתקות</span>
            </button>
          </div>

          <div className="relative px-5 mt-8 text-right">
            <h1 className="text-[26px] sm:text-[28px] font-extrabold text-white leading-[1.15] tracking-tight">
              GroupBuild Admin
            </h1>
            <p className="text-white/65 text-[12px] mt-1">פאנל בקרה ראשי</p>
          </div>
        </div>
      </header>

      {stats.pendingSuppliers > 0 && (
        <div className="px-5 mt-4">
          <button
            onClick={() => navigate("/admin/suppliers")}
            className="w-full bg-white rounded-2xl px-4 py-3 border border-[#C9A961]/40 ring-1 ring-[#C9A961]/20 shadow-[0_4px_14px_-8px_rgba(15,30,60,0.10)] text-sm flex items-center gap-2.5 text-right hover:border-[#C9A961]/60 transition-all"
          >
            <ShieldCheck className="h-4 w-4 text-[#B8923F] shrink-0" strokeWidth={2} />
            <span className="text-[#0A1F3D] flex-1"><b className="text-[#B8923F]">{stats.pendingSuppliers}</b> ספקים ממתינים לאישור</span>
            <ChevronLeft className="h-4 w-4 text-[#475569]" strokeWidth={2} />
          </button>
        </div>
      )}

      <div className="px-5 mt-4 grid grid-cols-2 gap-3 mb-4">
        <StatCard icon={Building2} label="פרויקטים" value={stats.projects || projects.length} />
        <StatCard icon={Users} label="ספקים" value={stats.suppliers} />
        <StatCard icon={Tag} label="עסקאות פעילות" value={stats.activeDeals} />
        <StatCard icon={LayoutGrid} label="קטגוריות" value={categories.length} />
      </div>

      <div className="px-5 mb-8">
        <div className="rounded-2xl bg-[#0A1F3D] text-white p-5 shadow-[0_8px_24px_-12px_rgba(10,31,61,0.40)] border border-[#0A1F3D] relative overflow-hidden">
          <div aria-hidden className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-[#C9A961]/15 blur-2xl" />
          <div className="flex items-center justify-between relative">
            <div>
              <div className="text-[11px] text-white/60 uppercase tracking-[0.14em] font-semibold">פיקדונות ששולמו</div>
              <div className="text-[26px] font-extrabold text-[#C9A961] mt-1.5 tracking-tight">{formatILS(stats.paidDepositsAmount)}</div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <TrendingUp className="h-[18px] w-[18px] text-[#C9A961]" strokeWidth={2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-white/10 relative">
            <div>
              <div className="text-[11px] text-white/55 uppercase tracking-[0.14em] font-semibold">פיקדונות (סה״כ)</div>
              <div className="font-bold mt-1 text-white">{stats.totalDeposits}</div>
            </div>
            <div>
              <div className="text-[11px] text-white/55 uppercase tracking-[0.14em] font-semibold">דירות</div>
              <div className="font-bold mt-1 text-white">{stats.apartments}</div>
            </div>
          </div>
        </div>
      </div>

      <section className="px-5 space-y-2.5 pb-10">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-[#475569] font-semibold mb-3 px-1">ניהול מהיר</h2>
        <QuickLink onClick={() => navigate("/admin/projects")} icon={Building2} label="ניהול פרויקטים" desc="הוספה, עריכה ומחיקה" />
        <QuickLink onClick={() => navigate("/admin/suppliers")} icon={ShieldCheck} label="ניהול ספקים" desc="הוספה, אזורי שירות, מדיה וקישורים" badge={stats.pendingSuppliers} />
        <QuickLink onClick={() => navigate("/admin/residents")} icon={Users} label="ניהול דיירים" desc="כל הדיירים והפרויקטים" />
        <QuickLink onClick={() => navigate("/admin/users")} icon={UserCog} label="ניהול משתמשים" desc="עריכה מלאה לכל המשתמשים" />
        <QuickLink onClick={() => navigate("/admin/categories")} icon={LayoutGrid} label="ניהול קטגוריות" desc={`${categories.length} קטגוריות פעילות`} />
        <QuickLink onClick={() => navigate("/admin/deals")} icon={Tag} label="ניהול עסקאות" desc={`${stats.activeDeals} עסקאות פעילות`} />
        <QuickLink onClick={() => navigate("/admin/deposits")} icon={Wallet} label="ניהול פיקדונות" desc={`${stats.totalDeposits} פיקדונות`} />
        <QuickLink onClick={() => navigate("/admin/payment-settings")} icon={CreditCard} label="הגדרות תשלום" desc="ספק סליקה וברירות מחדל" />
        <QuickLink onClick={() => navigate("/admin/regions")} icon={MapPin} label="אזורי שירות" desc="ניהול אזורים וערים" />
        <QuickLink onClick={() => navigate("/admin/settings")} icon={Settings} label="הגדרות מערכת" desc="התראות ומייל אדמין" />
        <QuickLink onClick={() => navigate("/admin/stats")} icon={BarChart3} label="סטטיסטיקות" desc="ניתוח מערכת מלא" />
        <QuickLink onClick={() => navigate("/admin/complaints")} icon={AlertTriangle} label="תלונות דיירים" desc="דיווחי בעיות" />
      </section>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-[0_4px_14px_-8px_rgba(15,30,60,0.08)]">
      <div className="flex items-center justify-between mb-3">
        <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#F3E9CC] to-[#FAF4E2] border border-[#C9A961]/40 flex items-center justify-center">
          <Icon className="h-[18px] w-[18px] text-[#B8923F]" strokeWidth={2} />
        </span>
      </div>
      <div className="text-[24px] font-extrabold text-[#0A1F3D] leading-none tracking-tight">{value.toLocaleString("he-IL")}</div>
      <div className="text-[12px] text-[#475569] mt-2 font-medium">{label}</div>
    </div>
  );
}

function QuickLink({ onClick, icon: Icon, label, desc, badge }: { onClick: () => void; icon: LucideIcon; label: string; desc: string; badge?: number }) {
  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-[0_4px_14px_-8px_rgba(15,30,60,0.08)] flex items-center gap-3 text-right hover:border-[#C9A961]/45 hover:shadow-[0_6px_18px_-10px_rgba(15,30,60,0.14)] transition-all active:scale-[0.99]">
      <span className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#F3E9CC] to-[#FAF4E2] border border-[#C9A961]/40 flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px] text-[#B8923F]" strokeWidth={2} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[14px] text-[#0A1F3D]">{label}</div>
        <div className="text-[11px] text-[#475569] mt-0.5">{desc}</div>
      </div>
      {badge && badge > 0 ? (
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/25">{badge}</span>
      ) : (
        <ChevronLeft className="h-4 w-4 text-[#94A3B8]" strokeWidth={2} />
      )}
    </button>
  );
}
