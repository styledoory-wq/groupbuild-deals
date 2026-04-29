import { useNavigate } from "react-router-dom";
import { Briefcase, TrendingUp, Users, DollarSign, Plus, LogOut, Pencil, type LucideIcon } from "lucide-react";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { formatILS, getActiveTier, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const { user, deals, suppliers, deposits, logout } = useApp();
  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.warn(e); }
    logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };
  const supplier = suppliers.find((s) => s.ownerName === user?.name) || suppliers[0];
  const myDeals = deals.filter((d) => d.supplierId === supplier.id);
  const totalLeads = myDeals.reduce((s, d) => s + d.joinedParticipants, 0);
  const totalPaid = myDeals.reduce((s, d) => s + d.paidParticipants, 0);
  const revenue = myDeals.reduce((s, d) => s + d.paidParticipants * getActiveTier(d).price, 0);
  const conversion = totalLeads ? Math.round((totalPaid / totalLeads) * 100) : 0;

  return (
    <MobileShell>
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-9 pb-14 rounded-b-[24px] relative overflow-hidden">
        <div className="flex items-center justify-between mb-7 relative">
          <div>
            <p className="text-primary-foreground/55 text-[11px] uppercase tracking-wider">איזור ספק</p>
            <h1 className="text-[24px] font-semibold mt-1 tracking-tight">{supplier.businessName}</h1>
            <div className="mt-2">
              <SupplierRatingBadge supplierId={supplier.id} className="text-[11px] gb-gold-text" />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-smooth"
            aria-label="יציאה"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 relative">
          <Stat icon={Users} label="לידים" value={totalLeads.toString()} />
          <Stat icon={TrendingUp} label="המרה" value={`${conversion}%`} />
          <Stat icon={Briefcase} label="עסקאות פעילות" value={myDeals.length.toString()} />
          <Stat icon={DollarSign} label="הכנסה" value={formatILS(revenue)} small />
        </div>
      </header>

      <div className="px-5 -mt-8 relative z-10 mb-6 space-y-2">
        <Button
          onClick={() => navigate("/supplier/offers/new")}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary-soft text-primary-foreground font-semibold shadow-soft"
        >
          <Plus className="h-4 w-4 ml-2" strokeWidth={2} /> צרו הצעה חדשה
        </Button>
        <Button
          onClick={() => navigate("/supplier/profile/edit")}
          variant="outline"
          className="w-full h-11 rounded-xl border-border"
        >
          <Pencil className="h-4 w-4 ml-2" /> עריכת פרופיל ואזורי שירות
        </Button>
      </div>

      <section className="px-5 space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1 px-1">
          <Briefcase className="h-3 w-3 text-gold" strokeWidth={1.75} /> ההצעות שלי
        </h2>
        {myDeals.map((d) => {
          const tier = getActiveTier(d);
          return (
            <div key={d.id} className="gb-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{d.title}</h3>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{tier.label}</div>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-primary text-sm">{formatILS(tier.price)}</div>
                  <div className="text-[10px] text-success font-medium mt-0.5">{d.paidParticipants} שילמו</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] pt-3 border-t border-border">
                <span className="px-2.5 py-1 rounded-full bg-muted/60 text-foreground border border-border">{d.joinedParticipants} לידים</span>
                <span className="px-2.5 py-1 rounded-full bg-success/10 text-success">{d.paidParticipants} פיקדונות</span>
              </div>
            </div>
          );
        })}
      </section>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function Stat({ icon: Icon, label, value, small }: { icon: LucideIcon; label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-white/[0.06] backdrop-blur border border-white/10 rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-gold" strokeWidth={1.75} />
        <span className="text-[10px] text-primary-foreground/60 uppercase tracking-wider">{label}</span>
      </div>
      <div className={small ? "text-base font-semibold" : "text-xl font-semibold tracking-tight"}>{value}</div>
    </div>
  );
}
