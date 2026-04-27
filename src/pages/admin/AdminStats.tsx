import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp, formatILS, getActiveTier } from "@/store/AppStore";
import { TrendingUp, Building2, Users, Tag, DollarSign, ShieldCheck } from "lucide-react";

export default function AdminStats() {
  const { projects, suppliers, deals, deposits, categories } = useApp();
  const revenue = deals.reduce((s, d) => s + d.paidParticipants * getActiveTier(d).price, 0);
  const totalApartments = projects.reduce((s, p) => s + p.apartmentCount, 0);
  const avgDealSize = deals.length ? Math.round(deals.reduce((s, d) => s + getActiveTier(d).price, 0) / deals.length) : 0;
  const totalSavings = deals.reduce((s, d) => s + (d.originalPrice - getActiveTier(d).price) * d.paidParticipants, 0);

  // Top categories by deal count
  const catStats = categories.map((c) => ({
    ...c,
    count: deals.filter((d) => d.categoryId === c.id).length,
    revenue: deals.filter((d) => d.categoryId === c.id).reduce((s, d) => s + d.paidParticipants * getActiveTier(d).price, 0),
  })).sort((a, b) => b.count - a.count).slice(0, 6);
  const maxCount = Math.max(1, ...catStats.map((c) => c.count));

  return (
    <MobileShell>
      <PageHeader title="סטטיסטיקות מערכת" subtitle="מבט-על על ביצועי הפלטפורמה" back={false} />

      <div className="px-5 -mt-4 relative z-10 mb-5">
        <div className="gb-card p-5 bg-gradient-hero text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-primary-foreground/60">הכנסה כוללת</div>
              <div className="text-3xl font-extrabold gb-gold-text mt-1">{formatILS(revenue)}</div>
            </div>
            <TrendingUp className="h-10 w-10 text-gold" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-sm">
            <div>
              <div className="text-[11px] text-primary-foreground/60">חיסכון לדיירים</div>
              <div className="font-bold gb-gold-text">{formatILS(totalSavings)}</div>
            </div>
            <div>
              <div className="text-[11px] text-primary-foreground/60">שווי עסקה ממוצע</div>
              <div className="font-bold">{formatILS(avgDealSize)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 grid grid-cols-2 gap-3 mb-5">
        <Mini icon={Building2} label="פרויקטים" value={projects.length} />
        <Mini icon={Users} label="ספקים מאושרים" value={suppliers.filter(s => s.approvalStatus === "approved").length} />
        <Mini icon={Tag} label="עסקאות" value={deals.length} />
        <Mini icon={DollarSign} label="פיקדונות" value={deposits.length} />
        <Mini icon={ShieldCheck} label="ספקים מובלטים" value={suppliers.filter(s => s.featured).length} />
        <Mini icon={Building2} label="דירות בפרויקטים" value={totalApartments} />
      </div>

      <section className="px-5 mb-5">
        <h2 className="text-sm font-bold mb-3">קטגוריות מובילות</h2>
        <div className="gb-card p-4 space-y-3">
          {catStats.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="text-base">{c.icon}</span>
                  {c.name}
                </span>
                <span className="text-muted-foreground">{c.count} עסקאות · {formatILS(c.revenue)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-gold" style={{ width: `${(c.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function Mini({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="gb-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-8 w-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-xl font-extrabold text-primary">{value.toLocaleString("he-IL")}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
