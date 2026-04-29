import { useNavigate } from "react-router-dom";
import { Building2, Users, ShieldCheck, Tag, Wallet, TrendingUp, LogOut, BarChart3, LayoutGrid, ChevronLeft, CreditCard, MapPin, Settings, UserCog, type LucideIcon } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatILS, getActiveTier, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { projects, suppliers, deals, deposits, categories, logout } = useApp();

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.warn(e); }
    logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  const totalRevenue = deals.reduce((s, d) => s + d.paidParticipants * getActiveTier(d).price, 0);
  const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);
  const activeDeals = deals.filter((d) => d.status === "active" || d.status === "closing-soon").length;
  const pendingSuppliers = suppliers.filter((s) => s.approvalStatus === "pending").length;

  return (
    <MobileShell>
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-9 pb-14 rounded-b-[24px] relative overflow-hidden">
        <div className="flex items-center justify-between mb-7 relative">
          <div>
            <p className="text-primary-foreground/55 text-[11px] uppercase tracking-wider">אזור ניהול</p>
            <h1 className="text-[26px] font-semibold mt-1 tracking-tight">GroupBuild Admin</h1>
            <div className="gb-divider-gold mt-3" />
          </div>
          <button
            onClick={handleLogout}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-smooth"
            aria-label="יציאה"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>

        {pendingSuppliers > 0 && (
          <div className="bg-white/5 border border-gold/25 rounded-xl px-4 py-3 text-sm flex items-center gap-2.5 relative">
            <ShieldCheck className="h-4 w-4 text-gold shrink-0" strokeWidth={1.75} />
            <span className="text-primary-foreground/85"><b className="text-gold">{pendingSuppliers}</b> ספקים ממתינים לאישור</span>
          </div>
        )}
      </header>

      <div className="px-5 -mt-8 relative z-10 grid grid-cols-2 gap-3 mb-6">
        <StatCard icon={Building2} label="פרויקטים" value={projects.length} />
        <StatCard icon={Users} label="ספקים" value={suppliers.length} />
        <StatCard icon={Tag} label="עסקאות פעילות" value={activeDeals} />
        <StatCard icon={LayoutGrid} label="קטגוריות" value={categories.length} />
        <div className="col-span-2">
          <div className="rounded-2xl border border-border bg-primary text-primary-foreground p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-primary-foreground/60 uppercase tracking-wider">הכנסה כוללת</div>
                <div className="text-[26px] font-semibold gb-gold-text mt-1.5 tracking-tight">{formatILS(totalRevenue)}</div>
              </div>
              <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <TrendingUp className="h-[18px] w-[18px] text-gold" strokeWidth={1.75} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-white/10">
              <div>
                <div className="text-[11px] text-primary-foreground/55 uppercase tracking-wider">פיקדונות</div>
                <div className="font-semibold mt-1">{formatILS(totalDeposits)}</div>
              </div>
              <div>
                <div className="text-[11px] text-primary-foreground/55 uppercase tracking-wider">דירות</div>
                <div className="font-semibold mt-1">{projects.reduce((s, p) => s + p.apartmentCount, 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="px-5 space-y-2">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 px-1">ניהול מהיר</h2>
        <QuickLink onClick={() => navigate("/admin/projects")} icon={Building2} label="ניהול פרויקטים" desc="הוספה, עריכה ומחיקה" />
        <QuickLink onClick={() => navigate("/admin/suppliers")} icon={ShieldCheck} label="ניהול ספקים" desc="הוספה, אזורי שירות, מדיה וקישורים" badge={pendingSuppliers} />
        <QuickLink onClick={() => navigate("/admin/residents")} icon={Users} label="ניהול דיירים" desc="כל הדיירים והפרויקטים" />
        <QuickLink onClick={() => navigate("/admin/users")} icon={UserCog} label="ניהול משתמשים" desc="עריכה מלאה לכל המשתמשים" />
        <QuickLink onClick={() => navigate("/admin/categories")} icon={LayoutGrid} label="ניהול קטגוריות" desc={`${categories.length} קטגוריות פעילות`} />
        <QuickLink onClick={() => navigate("/admin/deals")} icon={Tag} label="ניהול עסקאות" desc={`${activeDeals} עסקאות פעילות`} />
        <QuickLink onClick={() => navigate("/admin/deposits")} icon={Wallet} label="ניהול פיקדונות" desc={`${deposits.length} פיקדונות`} />
        <QuickLink onClick={() => navigate("/admin/payment-settings")} icon={CreditCard} label="הגדרות תשלום" desc="ספק סליקה וברירות מחדל" />
        <QuickLink onClick={() => navigate("/admin/regions")} icon={MapPin} label="אזורי שירות" desc="ניהול אזורים וערים" />
        <QuickLink onClick={() => navigate("/admin/settings")} icon={Settings} label="הגדרות מערכת" desc="התראות ומייל אדמין" />
        <QuickLink onClick={() => navigate("/admin/stats")} icon={BarChart3} label="סטטיסטיקות" desc="ניתוח מערכת מלא" />
      </section>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="gb-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="h-8 w-8 rounded-lg bg-muted/60 border border-border flex items-center justify-center text-primary">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
      </div>
      <div className="text-[22px] font-semibold text-primary leading-none tracking-tight">{value.toLocaleString("he-IL")}</div>
      <div className="text-[11px] text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

function QuickLink({ onClick, icon: Icon, label, desc, badge }: { onClick: () => void; icon: LucideIcon; label: string; desc: string; badge?: number }) {
  return (
    <button onClick={onClick} className="w-full gb-card p-4 flex items-center gap-3.5 text-right hover:border-gold/40 transition-smooth">
      <div className="h-10 w-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-primary">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
      </div>
      {badge && badge > 0 ? (
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">{badge}</span>
      ) : (
        <ChevronLeft className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
      )}
    </button>
  );
}
