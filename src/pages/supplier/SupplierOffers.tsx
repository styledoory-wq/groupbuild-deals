import { Link } from "react-router-dom";
import { Plus, Briefcase } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { formatILS, getActiveTier, useApp } from "@/store/AppStore";

export default function SupplierOffers() {
  const { deals, suppliers, user, projects } = useApp();
  const supplier = suppliers.find((s) => s.ownerName === user?.name) || suppliers[0];
  const myDeals = deals.filter((d) => d.supplierId === supplier.id);

  return (
    <MobileShell>
      <PageHeader title="ההצעות שלי" subtitle="ניהול כל ההצעות הפעילות שלך" back={false} />
      <div className="px-5 -mt-4 relative z-10 mb-4">
        <Link to="/supplier/offers/new">
          <Button className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold">
            <Plus className="h-4 w-4 ml-2" /> צרו הצעה חדשה
          </Button>
        </Link>
      </div>

      <div className="px-5 space-y-3">
        {myDeals.length === 0 && (
          <div className="gb-card p-8 text-center">
            <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">אין הצעות עדיין</p>
          </div>
        )}
        {myDeals.map((d) => {
          const tier = getActiveTier(d);
          const project = projects.find((p) => p.id === d.projectId);
          return (
            <div key={d.id} className="gb-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{d.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{project?.name}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-success/10 text-success">פעילה</span>
              </div>
              <div className="flex items-end justify-between pt-2 border-t border-border mt-2">
                <div>
                  <div className="text-[10px] text-muted-foreground line-through">{formatILS(d.originalPrice)}</div>
                  <div className="font-extrabold text-primary">{formatILS(tier.price)}</div>
                </div>
                <div className="text-left text-[11px]">
                  <div className="text-muted-foreground">לידים: <b className="text-foreground">{d.joinedParticipants}</b></div>
                  <div className="text-muted-foreground">פיקדונות: <b className="text-success">{d.paidParticipants}</b></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav role="supplier" />
    </MobileShell>
  );
}
