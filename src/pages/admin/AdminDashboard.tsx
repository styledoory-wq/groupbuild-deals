import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, ShieldCheck, Tag, Wallet, TrendingUp, LogOut, BarChart3, LayoutGrid, ChevronLeft, CreditCard, MapPin, Settings, UserCog, AlertTriangle, Eye, Inbox, UserCheck, type LucideIcon } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { setPreviewRole } from "@/lib/previewMode";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

type TabKey = "overview" | "content" | "users" | "finance" | "system";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "סקירה" },
  { key: "content", label: "תוכן" },
  { key: "users", label: "משתמשים" },
  { key: "finance", label: "כספים" },
  { key: "system", label: "מערכת" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { projects, categories, logout } = useApp();
  const [tab, setTab] = useState<TabKey>("overview");
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

  const groups = useMemo(() => ({
    content: [
      { to: "/admin/projects", icon: Building2, label: "פרויקטים", desc: `${stats.projects || projects.length} פעילים` },
      { to: "/admin/categories", icon: LayoutGrid, label: "קטגוריות", desc: `${categories.length} פעילות` },
      { to: "/admin/deals", icon: Tag, label: "עסקאות", desc: `${stats.activeDeals} פעילות` },
      { to: "/admin/regions", icon: MapPin, label: "אזורי שירות", desc: "ערים ואזורים" },
    ],
    users: [
      { to: "/admin/residents", icon: Users, label: "דיירים", desc: "כל הדיירים" },
      { to: "/admin/suppliers", icon: ShieldCheck, label: "ספקים", desc: `${stats.suppliers} רשומים`, badge: stats.pendingSuppliers },
      { to: "/admin/users", icon: UserCog, label: "משתמשים", desc: "עריכה מלאה" },
      { to: "/admin/committee-requests", icon: UserCheck, label: "ועד בית", desc: "בקשות ואישורים", badge: stats.pendingCommittee },
      { to: "/admin/complaints", icon: AlertTriangle, label: "תלונות", desc: "דיווחי בעיות" },
    ],
    finance: [
      { to: "/admin/deposits", icon: Wallet, label: "פיקדונות", desc: `${stats.totalDeposits} פיקדונות` },
      { to: "/admin/payment-settings", icon: CreditCard, label: "הגדרות תשלום", desc: "ספק סליקה" },
      { to: "/admin/stats", icon: BarChart3, label: "סטטיסטיקות", desc: "ניתוח כספי" },
    ],
    system: [
      { to: "/admin/settings", icon: Settings, label: "הגדרות מערכת", desc: "התראות ומייל" },
      { to: "/admin/leads", icon: Inbox, label: "לידים", desc: "פניות והמתנה" },
      { to: "/admin/stats", icon: BarChart3, label: "סטטיסטיקות", desc: "מבט-על מלא" },
    ],
  }), [stats, projects.length, categories.length]);

  const pendingTotal = stats.pendingSuppliers + stats.pendingCommittee;

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

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="bg-white rounded-[14px] border border-[#ECEEF2] p-1 flex gap-1 overflow-x-auto scrollbar-hide shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]">
          {TABS.map(t => {
            const active = tab === t.key;
            const showDot = t.key === "users" && pendingTotal > 0;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative flex-1 min-w-fit h-9 px-3 rounded-[10px] text-[12.5px] font-extrabold transition-all whitespace-nowrap",
                  active ? "bg-[#0E6B5A] text-white shadow-[0_4px_12px_-4px_rgba(14,107,90,0.5)]" : "text-[#6B7280] hover:bg-[#F4F6FA]"
                )}
              >
                {t.label}
                {showDot && !active && (
                  <span className="absolute top-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" && (
        <>
          {(stats.pendingSuppliers > 0 || stats.pendingCommittee > 0) && (
            <div className="px-5 mb-3 space-y-2">
              {stats.pendingSuppliers > 0 && (
                <AlertBanner
                  icon={ShieldCheck}
                  onClick={() => navigate("/admin/suppliers")}
                  label={<><b className="text-[#0E6B5A]">{stats.pendingSuppliers}</b> ספקים ממתינים לאישור</>}
                />
              )}
              {stats.pendingCommittee > 0 && (
                <AlertBanner
                  icon={UserCheck}
                  onClick={() => navigate("/admin/committee-requests")}
                  label={<><b className="text-[#0E6B5A]">{stats.pendingCommittee}</b> בקשות הרשאת ועד בית ממתינות</>}
                />
              )}
            </div>
          )}

          {/* Bento grid */}
          <div className="px-5 mb-4">
            <div className="grid grid-cols-4 gap-2.5 auto-rows-[minmax(0,_1fr)]">
              {/* Hero — revenue (col-span-4) */}
              <div className="col-span-4 rounded-[20px] bg-gradient-to-br from-[#0E6B5A] to-[#0a5446] p-5 text-white shadow-[0_10px_30px_-12px_rgba(14,107,90,0.55)]">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">פיקדונות ששולמו</div>
                    <div className="text-[28px] font-extrabold mt-1 tracking-tight leading-none">
                      {formatILS(stats.paidDepositsAmount)}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-[14px] bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                    <TrendingUp className="h-[20px] w-[20px] text-white" strokeWidth={2.2} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/15">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">פיקדונות</div>
                    <div className="font-extrabold mt-1 text-[16px]">{stats.totalDeposits}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">דירות</div>
                    <div className="font-extrabold mt-1 text-[16px]">{stats.apartments}</div>
                  </div>
                </div>
              </div>

              {/* Stat tiles — bento mix */}
              <BentoStat className="col-span-2 row-span-2" icon={Building2} label="פרויקטים" value={stats.projects || projects.length} accent />
              <BentoStat className="col-span-2" icon={Users} label="ספקים" value={stats.suppliers} />
              <BentoStat className="col-span-2" icon={Tag} label="עסקאות פעילות" value={stats.activeDeals} />
              <BentoStat className="col-span-2" icon={LayoutGrid} label="קטגוריות" value={categories.length} />
              <BentoStat className="col-span-2" icon={Wallet} label="פיקדונות" value={stats.totalDeposits} />
            </div>
          </div>

          {/* Preview-mode switchers */}
          <div className="px-5 mb-5 grid grid-cols-2 gap-2.5">
            <PreviewTile label="תצוגת דייר" desc="ממשק הדייר" onClick={() => { setPreviewRole("resident"); navigate("/resident"); }} />
            <PreviewTile label="תצוגת ספק" desc="ממשק הספק" onClick={() => { setPreviewRole("supplier"); navigate("/supplier"); }} />
          </div>
        </>
      )}

      {tab !== "overview" && (
        <section className="px-5 pb-10">
          <div className="grid grid-cols-2 gap-2.5">
            {groups[tab].map((g, i) => (
              <BentoLink
                key={g.to + i}
                onClick={() => navigate(g.to)}
                icon={g.icon}
                label={g.label}
                desc={g.desc}
                badge={(g as { badge?: number }).badge}
                className={i === 0 ? "col-span-2" : ""}
              />
            ))}
          </div>
        </section>
      )}

      <div className="h-4" />
      <BottomNav role="admin" />
    </MobileShell>
  );
}

function AlertBanner({ icon: Icon, onClick, label }: { icon: LucideIcon; onClick: () => void; label: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-[16px] px-4 py-3 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] text-[13px] flex items-center gap-2.5 text-right active:scale-[0.99] transition-transform"
    >
      <span className="h-9 w-9 rounded-[10px] bg-[#FFF8E1] flex items-center justify-center shrink-0">
        <Icon className="h-[16px] w-[16px] text-[#0E6B5A]" strokeWidth={2.2} />
      </span>
      <span className="text-[#1F2937] flex-1 font-medium">{label}</span>
      <ChevronLeft className="h-4 w-4 text-[#9CA3AF]" strokeWidth={2} />
    </button>
  );
}

function BentoStat({ icon: Icon, label, value, className, accent }: { icon: LucideIcon; label: string; value: number; className?: string; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-[16px] p-4 border flex flex-col justify-between min-h-[96px]",
      accent
        ? "bg-[#FFF8E1] border-[#F3E8B8] shadow-[0_4px_14px_-6px_rgba(180,150,40,0.25)]"
        : "bg-white border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]",
      className,
    )}>
      <div className={cn(
        "h-9 w-9 rounded-[10px] flex items-center justify-center",
        accent ? "bg-white" : "bg-[#FFF8E1]"
      )}>
        <Icon className="h-[16px] w-[16px] text-[#0E6B5A]" strokeWidth={2.2} />
      </div>
      <div>
        <div className={cn("font-extrabold text-[#1F2937] leading-none tracking-tight", accent ? "text-[26px]" : "text-[20px]")}>
          {value.toLocaleString("he-IL")}
        </div>
        <div className="text-[12px] text-[#6B7280] mt-1.5 font-medium">{label}</div>
      </div>
    </div>
  );
}

function PreviewTile({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-[16px] p-3.5 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] flex items-center gap-2.5 text-right active:scale-[0.99] transition-transform"
    >
      <span className="h-9 w-9 rounded-[10px] bg-[#FFF8E1] flex items-center justify-center shrink-0">
        <Eye className="h-[16px] w-[16px] text-[#0E6B5A]" strokeWidth={2.2} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[13px] text-[#1F2937] leading-tight">{label}</div>
        <div className="text-[11px] text-[#6B7280] mt-0.5 font-medium">{desc}</div>
      </div>
    </button>
  );
}

function BentoLink({ onClick, icon: Icon, label, desc, badge, className }: { onClick: () => void; icon: LucideIcon; label: string; desc: string; badge?: number; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative bg-white rounded-[18px] p-4 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] flex flex-col gap-3 text-right active:scale-[0.99] transition-transform min-h-[110px]",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="h-10 w-10 rounded-[12px] bg-[#FFF8E1] flex items-center justify-center shrink-0">
          <Icon className="h-[18px] w-[18px] text-[#0E6B5A]" strokeWidth={2.2} />
        </span>
        {badge && badge > 0 ? (
          <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626]">{badge}</span>
        ) : (
          <ChevronLeft className="h-4 w-4 text-[#9CA3AF]" strokeWidth={2} />
        )}
      </div>
      <div className="mt-auto">
        <div className="font-extrabold text-[14px] text-[#1F2937] leading-tight">{label}</div>
        <div className="text-[11.5px] text-[#6B7280] mt-1 font-medium leading-tight">{desc}</div>
      </div>
    </button>
  );
}
