import { useNavigate } from "react-router-dom";
import { Building2, Users, ShieldCheck, Tag, Wallet, TrendingUp, LogOut, BarChart3, LayoutGrid } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatILS, getActiveTier, useApp } from "@/store/AppStore";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { projects, suppliers, deals, deposits, categories, logout } = useApp();

  const totalRevenue = deals.reduce((s, d) => s + d.paidParticipants * getActiveTier(d).price, 0);
  const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);
  const activeDeals = deals.filter((d) => d.status === "active" || d.status === "closing-soon").length;
  const pendingSuppliers = suppliers.filter((s) => s.approvalStatus === "pending").length;

  return (
    <MobileShell>
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-8 pb-12 rounded-b-[32px] relative overflow-hidden">
        <div className="absolute -top-16 -left-10 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />
        <div className="flex items-center justify-between mb-6 relative">
          <div>
            <p className="text-primary-foreground/60 text-xs">אזור ניהול</p>
            <h1 className="text-2xl font-bold">GroupBuild Admin</h1>
            <div className="gb-divider-gold mt-2" />
          </div>
          <button onClick={() => { logout(); navigate("/"); }} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {pendingSuppliers > 0 && (
          <div className="bg-gold/15 border border-gold/30 rounded-2xl p-3 text-sm flex items-center gap-2 relative">
            <ShieldCheck className="h-4 w-4 text-gold" />
            <span><b>{pendingSuppliers}</b> ספקים ממתינים לאישור</span>
          </div>
        )}
      </header>

      <div className="px-5 -mt-6 relative z-10 grid grid-cols-2 gap-3 mb-5">
        <StatCard icon={Building2} label="פרויקטים" value={projects.length} accent />
        <StatCard icon={Users} label="ספקים" value={suppliers.length} />
        <StatCard icon={Tag} label="עסקאות פעילות" value={activeDeals} />
        <StatCard icon={LayoutGrid} label="קטגוריות" value={categories.length} />
        <div className="col-span-2">
          <div className="gb-card p-4 bg-gradient-hero text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-primary-foreground/60">הכנסה כוללת</div>
                <div className="text-2xl font-extrabold gb-gold-text">{formatILS(totalRevenue)}</div>
              </div>
              <TrendingUp className="h-8 w-8 text-gold" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10">
              <div>
                <div className="text-[11px] text-primary-foreground/60">פיקדונות</div>
                <div className="font-bold">{formatILS(totalDeposits)}</div>
              </div>
              <div>
                <div className="text-[11px] text-primary-foreground/60">דירות בפרויקטים</div>
                <div className="font-bold">{projects.reduce((s, p) => s + p.apartmentCount, 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="px-5 space-y-2">
        <h2 className="text-sm font-bold mb-2">ניהול מהיר</h2>
        <QuickLink onClick={() => navigate("/admin/projects")} icon={Building2} label="ניהול פרויקטים" desc="הוספה, עריכה ומחיקה" />
        <QuickLink onClick={() => navigate("/admin/suppliers")} icon={ShieldCheck} label="ניהול ספקים" desc="אישור והגדרת עמלה" badge={pendingSuppliers} />
        <QuickLink onClick={() => navigate("/admin/residents")} icon={Users} label="ניהול דיירים" desc="כל הדיירים והפרויקטים" />
        <QuickLink onClick={() => navigate("/admin/categories")} icon={LayoutGrid} label="ניהול קטגוריות" desc={`${categories.length} קטגוריות פעילות`} />
        <QuickLink onClick={() => navigate("/admin/deals")} icon={Tag} label="ניהול עסקאות" desc={`${activeDeals} עסקאות פעילות`} />
        <QuickLink onClick={() => navigate("/admin/deposits")} icon={Wallet} label="ניהול פיקדונות" desc={`${deposits.length} פיקדונות`} />
        <QuickLink onClick={() => navigate("/admin/stats")} icon={BarChart3} label="סטטיסטיקות" desc="ניתוח מערכת מלא" />
      </section>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; accent?: boolean }) {
  return (
    <div className="gb-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={"h-9 w-9 rounded-xl flex items-center justify-center " + (accent ? "bg-gradient-gold text-primary" : "bg-primary/5 text-primary")}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-extrabold text-primary leading-none">{value.toLocaleString("he-IL")}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function QuickLink({ onClick, icon: Icon, label, desc, badge }: { onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; desc: string; badge?: number }) {
  return (
    <button onClick={onClick} className="w-full gb-card p-3 flex items-center gap-3 text-right hover:shadow-elevated transition-smooth">
      <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center">
        <Icon className="h-5 w-5 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      {badge && badge > 0 ? (
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-destructive text-destructive-foreground">{badge}</span>
      ) : (
        <span className="text-gold font-bold">←</span>
      )}
    </button>
  );
}
