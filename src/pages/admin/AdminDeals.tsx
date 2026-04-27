import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp, formatILS, getActiveTier } from "@/store/AppStore";

export default function AdminDeals() {
  const { deals, suppliers, projects, categories } = useApp();
  return (
    <MobileShell>
      <PageHeader title="ניהול עסקאות" subtitle={`${deals.length} עסקאות במערכת`} back={false} />
      <div className="px-5 -mt-4 relative z-10 space-y-3">
        {deals.map((d) => {
          const supplier = suppliers.find((s) => s.id === d.supplierId);
          const project = projects.find((p) => p.id === d.projectId);
          const category = categories.find((c) => c.id === d.categoryId);
          const tier = getActiveTier(d);
          return (
            <div key={d.id} className="gb-card p-4">
              <div className="flex items-start gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center text-lg">{category?.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{d.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{supplier?.businessName} · {project?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center text-[11px]">
                <div>
                  <div className="font-bold text-primary">{formatILS(tier.price)}</div>
                  <div className="text-muted-foreground">דרגה פעילה</div>
                </div>
                <div className="border-x border-border">
                  <div className="font-bold text-success">{d.paidParticipants}</div>
                  <div className="text-muted-foreground">פיקדונות</div>
                </div>
                <div>
                  <div className="font-bold text-foreground">{d.tiers.length}</div>
                  <div className="text-muted-foreground">דרגות</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}
