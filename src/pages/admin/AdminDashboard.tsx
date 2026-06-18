import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, ShieldCheck, Tag, Wallet, TrendingUp, LogOut, BarChart3, LayoutGrid, ChevronLeft, CreditCard, MapPin, Settings, UserCog, AlertTriangle, Eye, Inbox, UserCheck, type LucideIcon } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { setPreviewRole } from "@/lib/previewMode";
import { toast } from "sonner";

type Stats = {
  projects: number;
  suppliers: number;
  pendingSuppliers: number;
  pendingCommittee: number;
  activeDeals: number;
  totalDeposits: number;
  paidDepositsAmount: number;
  apartments: number;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { projects, categories, logout } = useApp();
  const [stats, setStats] = useState<Stats>({
    projects: 0, suppliers: 0, pendingSuppliers: 0, pendingCommittee: 0, activeDeals: 0,
    totalDeposits: 0, paidDepositsAmount: 0, apartments: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const [projRes, supRes, pendingRes, dealsRes, depCountRes, depPaidRes, commRes] = await Promise.all([
          supabase.from("projects").select("apartment_count", { count: "exact" }).eq("is_deleted", false).eq("is_active", true),
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false),
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("approval_status", "pending"),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false).in("status", ["active", "closing-soon"]),
          supabase.from("deposits").select("id", { count: "exact", head: true }).eq("is_deleted", false).in("status", ["pending", "paid"]),
          supabase.from("deposits").select("gross_deposit_amount,net_deposit_amount").eq("status", "paid").eq("is_deleted", false),
          supabase.from("committee_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);

        const apartments = (projRes.data ?? []).reduce((s: number, p: { apartment_count: number | null }) => s + (p.apartment_count ?? 0), 0);
        const paidAmount = (depPaidRes.data ?? []).reduce((s: number, d: { gross_deposit_amount: number | null }) => s + Number(d.gross_deposit_amount ?? 0), 0);

        setStats({
          projects: projRes.count ?? (projRes.data?.length ?? 0),
          suppliers: supRes.count ?? 0,
          pendingSuppliers: pendingRes.count ?? 0,
          pendingCommittee: commRes.count ?? 0,
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
      <PageHeader size="large"
        title="פאנל ניהול"
        subtitle="מבט-על על המערכת"
        back={false}
        rightSlot={
          <button
            onClick={handleLogout}
            className="h-10 px-3 rounded-full bg-white border border-[#ECEEF2] flex items-center gap-1.5 text-[#1F2937] shadow-[0_2px_8px_-2px_rgba(10,31,61,0.06)] active:scale-95 transition-transform text-[12px] font-bold"
            aria-label="יציאה"
          >
            <LogOut className="h-[14px] w-[14px]" strokeWidth={2} />
            <span>התנתקות</span>
          </button>
        }
      />

      {stats.pendingSuppliers > 0 && (
        <div className="px-5 mt-1 mb-3">
          <button
            onClick={() => navigate("/admin/suppliers")}
            className="w-full bg-white rounded-[16px] px-4 py-3 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] text-[13px] flex items-center gap-2.5 text-right active:scale-[0.99] transition-transform"
          >
            <span className="h-9 w-9 rounded-[10px] bg-[#FFF8E1] flex items-center justify-center shrink-0">
              <ShieldCheck className="h-[16px] w-[16px] text-[#0E6B5A]" strokeWidth={2.2} />
            </span>
            <span className="text-[#1F2937] flex-1 font-medium">
              <b className="text-[#0E6B5A]">{stats.pendingSuppliers}</b> ספקים ממתינים לאישור
            </span>
            <ChevronLeft className="h-4 w-4 text-[#9CA3AF]" strokeWidth={2} />
          </button>
        </div>
      )}

      {stats.pendingCommittee > 0 && (
        <div className="px-5 mt-1 mb-3">
          <button
            onClick={() => navigate("/admin/committee-requests")}
            className="w-full bg-white rounded-[16px] px-4 py-3 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] text-[13px] flex items-center gap-2.5 text-right active:scale-[0.99] transition-transform"
          >
            <span className="h-9 w-9 rounded-[10px] bg-[#FFF8E1] flex items-center justify-center shrink-0">
              <UserCheck className="h-[16px] w-[16px] text-[#0E6B5A]" strokeWidth={2.2} />
            </span>
            <span className="text-[#1F2937] flex-1 font-medium">
              <b className="text-[#0E6B5A]">{stats.pendingCommittee}</b> בקשות הרשאת ועד בית ממתינות
            </span>
            <ChevronLeft className="h-4 w-4 text-[#9CA3AF]" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Hero revenue card — light, premium, matches Categories */}
      <div className="px-5 mt-2 mb-4">
        <div className="rounded-[20px] bg-white p-5 border border-[#ECEEF2] shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18),0_2px_4px_-2px_rgba(10,31,61,0.05)]">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">פיקדונות ששולמו</div>
              <div className="text-[26px] font-extrabold text-[#1F2937] mt-1 tracking-tight leading-none">
                {formatILS(stats.paidDepositsAmount)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-[12px] bg-[#FFF8E1] flex items-center justify-center shrink-0">
              <TrendingUp className="h-[18px] w-[18px] text-[#0E6B5A]" strokeWidth={2.2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#ECEEF2]">
            <div>
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">פיקדונות (סה״כ)</div>
              <div className="font-extrabold text-[#1F2937] mt-1 text-[15px]">{stats.totalDeposits}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">דירות</div>
              <div className="font-extrabold text-[#1F2937] mt-1 text-[15px]">{stats.apartments}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-5 grid grid-cols-2 gap-2.5 mb-5">
        <StatCard icon={Building2} label="פרויקטים" value={stats.projects || projects.length} />
        <StatCard icon={Users} label="ספקים" value={stats.suppliers} />
        <StatCard icon={Tag} label="עסקאות פעילות" value={stats.activeDeals} />
        <StatCard icon={LayoutGrid} label="קטגוריות" value={categories.length} />
      </div>

      {/* Preview-mode quick switchers */}
      <div className="px-5 mb-4 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => { setPreviewRole("resident"); navigate("/resident"); }}
          className="bg-white rounded-[16px] p-3.5 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] flex items-center gap-2.5 text-right active:scale-[0.99] transition-transform"
        >
          <span className="h-9 w-9 rounded-[10px] bg-[#FFF8E1] flex items-center justify-center shrink-0">
            <Eye className="h-[16px] w-[16px] text-[#0E6B5A]" strokeWidth={2.2} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[13px] text-[#1F2937] leading-tight">תצוגת דייר</div>
            <div className="text-[11px] text-[#6B7280] mt-0.5 font-medium">צפייה בממשק הדייר</div>
          </div>
        </button>
        <button
          onClick={() => { setPreviewRole("supplier"); navigate("/supplier"); }}
          className="bg-white rounded-[16px] p-3.5 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] flex items-center gap-2.5 text-right active:scale-[0.99] transition-transform"
        >
          <span className="h-9 w-9 rounded-[10px] bg-[#FFF8E1] flex items-center justify-center shrink-0">
            <Eye className="h-[16px] w-[16px] text-[#0E6B5A]" strokeWidth={2.2} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[13px] text-[#1F2937] leading-tight">תצוגת ספק</div>
            <div className="text-[11px] text-[#6B7280] mt-0.5 font-medium">צפייה בממשק הספק</div>
          </div>
        </button>
      </div>

      <section className="px-5 pb-10">
        <h2 className="text-[12px] font-extrabold text-[#1F2937] tracking-tight mb-2.5 px-1">ניהול מהיר</h2>
        <div className="space-y-2">
          <QuickLink onClick={() => navigate("/admin/projects")} icon={Building2} label="ניהול פרויקטים" desc="הוספה, עריכה ומחיקה" />
          <QuickLink onClick={() => navigate("/admin/suppliers")} icon={ShieldCheck} label="ניהול ספקים" desc="אזורי שירות, מדיה וקישורים" badge={stats.pendingSuppliers} />
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
          <QuickLink onClick={() => navigate("/admin/committee-requests")} icon={UserCheck} label="בקשות הרשאת ועד בית" desc="אישור דיירים לתפקיד נציג ועד" badge={stats.pendingCommittee} />
          <QuickLink onClick={() => navigate("/admin/leads")} icon={Inbox} label="ניהול לידים" desc="לידים, פניות ורשימת המתנה" />
        </div>
      </section>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="bg-white rounded-[16px] p-4 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]">
      <div className="h-9 w-9 rounded-[10px] bg-[#FFF8E1] flex items-center justify-center mb-2.5">
        <Icon className="h-[16px] w-[16px] text-[#0E6B5A]" strokeWidth={2.2} />
      </div>
      <div className="text-[20px] font-extrabold text-[#1F2937] leading-none tracking-tight">
        {value.toLocaleString("he-IL")}
      </div>
      <div className="text-[12px] text-[#6B7280] mt-1.5 font-medium">{label}</div>
    </div>
  );
}

function QuickLink({ onClick, icon: Icon, label, desc, badge }: { onClick: () => void; icon: LucideIcon; label: string; desc: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-[16px] p-3.5 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] flex items-center gap-3 text-right active:scale-[0.99] transition-transform"
    >
      <span className="h-10 w-10 rounded-[12px] bg-[#FFF8E1] flex items-center justify-center shrink-0">
        <Icon className="h-[16px] w-[16px] text-[#0E6B5A]" strokeWidth={2.2} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[13.5px] text-[#1F2937] leading-tight">{label}</div>
        <div className="text-[11.5px] text-[#6B7280] mt-0.5 font-medium leading-tight">{desc}</div>
      </div>
      {badge && badge > 0 ? (
        <span className="text-[11px] font-extrabold px-2 py-1 rounded-full bg-[#FEE2E2] text-[#DC2626]">{badge}</span>
      ) : (
        <ChevronLeft className="h-4 w-4 text-[#9CA3AF]" strokeWidth={2} />
      )}
    </button>
  );
}
