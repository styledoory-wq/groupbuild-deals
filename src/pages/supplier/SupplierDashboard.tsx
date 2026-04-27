import { useNavigate } from "react-router-dom";
import { Briefcase, TrendingUp, Users, DollarSign, Plus, Star, MessageSquare, LogOut } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { formatILS, getActiveTier, useApp } from "@/store/AppStore";

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const { user, deals, suppliers, deposits, logout } = useApp();
  const supplier = suppliers.find((s) => s.ownerName === user?.name) || suppliers[0];
  const myDeals = deals.filter((d) => d.supplierId === supplier.id);
  const totalLeads = myDeals.reduce((s, d) => s + d.joinedParticipants, 0);
  const totalPaid = myDeals.reduce((s, d) => s + d.paidParticipants, 0);
  const revenue = myDeals.reduce((s, d) => s + d.paidParticipants * getActiveTier(d).price, 0);
  const conversion = totalLeads ? Math.round((totalPaid / totalLeads) * 100) : 0;

  return (
    <MobileShell>
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-8 pb-12 rounded-b-[32px] relative overflow-hidden">
        <div className="absolute -top-12 -left-12 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
        <div className="flex items-center justify-between mb-6 relative">
          <div>
            <p className="text-primary-foreground/60 text-xs">איזור ספק</p>
            <h1 className="text-2xl font-bold">{supplier.businessName}</h1>
            <div className="flex items-center gap-1 text-xs gb-gold-text mt-1">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" /> {supplier.rating} · {supplier.reviewsCount} ביקורות
            </div>
          </div>
          <button onClick={() => { logout(); navigate("/"); }} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 relative">
          <Stat icon={Users} label="לידים" value={totalLeads.toString()} />
          <Stat icon={TrendingUp} label="המרה" value={`${conversion}%`} />
          <Stat icon={Briefcase} label="עסקאות פעילות" value={myDeals.length.toString()} />
          <Stat icon={DollarSign} label="הכנסה" value={formatILS(revenue)} small />
        </div>
      </header>

      <div className="px-5 -mt-6 relative z-10 mb-5">
        <Button
          onClick={() => navigate("/supplier/offers/new")}
          className="w-full h-14 rounded-2xl bg-gradient-gold hover:opacity-90 text-primary font-bold shadow-gold"
        >
          <Plus className="h-5 w-5 ml-2" /> צרו הצעה חדשה
        </Button>
      </div>

      <section className="px-5 space-y-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-gold" /> ההצעות שלי
        </h2>
        {myDeals.map((d) => {
          const tier = getActiveTier(d);
          return (
            <div key={d.id} className="gb-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{d.title}</h3>
                  <div className="text-[11px] text-muted-foreground">{tier.label}</div>
                </div>
                <div className="text-left">
                  <div className="font-extrabold text-primary text-sm">{formatILS(tier.price)}</div>
                  <div className="text-[10px] text-success font-bold">{d.paidParticipants} שילמו</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-1 rounded-full bg-primary/5 text-primary">{d.joinedParticipants} לידים</span>
                <span className="px-2 py-1 rounded-full bg-success/10 text-success">{d.paidParticipants} פיקדונות</span>
              </div>
            </div>
          );
        })}
      </section>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function Stat({ icon: Icon, label, value, small }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-gold" />
        <span className="text-[11px] text-primary-foreground/70">{label}</span>
      </div>
      <div className={small ? "text-base font-bold" : "text-xl font-extrabold"}>{value}</div>
    </div>
  );
}
