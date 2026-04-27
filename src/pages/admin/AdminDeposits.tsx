import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp, formatILS } from "@/store/AppStore";
import { Wallet } from "lucide-react";

export default function AdminDeposits() {
  const { deposits, deals } = useApp();
  const total = deposits.reduce((s, d) => s + d.amount, 0);

  return (
    <MobileShell>
      <PageHeader title="ניהול פיקדונות" subtitle={`${deposits.length} פיקדונות · ${formatILS(total)}`} />
      <div className="px-5 -mt-4 relative z-10 space-y-2">
        {deposits.map((dep) => {
          const deal = deals.find((d) => d.id === dep.dealId);
          return (
            <div key={dep.id} className="gb-card p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-gold flex items-center justify-center text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{deal?.title}</h3>
                <p className="text-[11px] text-muted-foreground">{new Date(dep.createdAt).toLocaleDateString("he-IL")} · {dep.userId}</p>
              </div>
              <div className="text-left">
                <div className="font-bold text-primary text-sm">{formatILS(dep.amount)}</div>
                <div className={"text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 " + (dep.status === "paid" ? "bg-success/10 text-success" : "bg-gold/15 text-primary")}>
                  {dep.status === "paid" ? "שולם" : dep.status === "pending" ? "ממתין" : "הוחזר"}
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
