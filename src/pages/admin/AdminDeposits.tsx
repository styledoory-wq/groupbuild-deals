import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatILS } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Check, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

type DbDeposit = {
  id: string;
  user_id: string;
  deal_id: string;
  amount: number;
  status: string;
  created_at: string;
};

type DealMap = Record<string, { title: string }>;

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState<DbDeposit[]>([]);
  const [deals, setDeals] = useState<DealMap>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deposits")
        .select("id,user_id,deal_id,amount,status,created_at")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as DbDeposit[];
      setDeposits(list);

      const dealIds = Array.from(new Set(list.map((d) => d.deal_id))).filter(Boolean);
      if (dealIds.length) {
        const { data: dealRows } = await supabase
          .from("deals")
          .select("id,title")
          .in("id", dealIds);
        const map: DealMap = {};
        (dealRows ?? []).forEach((d: { id: string; title: string }) => { map[d.id] = { title: d.title }; });
        setDeals(map);
      } else {
        setDeals({});
      }
    } catch (err) {
      console.error("[AdminDeposits] load failed", err);
      toast.error(err instanceof Error ? err.message : "טעינת הפיקדונות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const updateStatus = async (id: string, status: "paid" | "refunded") => {
    setBusyId(id);
    try {
      const nowIso = new Date().toISOString();
      const patch = status === "paid"
        ? { status, paid_at: nowIso }
        : { status, refunded_at: nowIso };

      const { error } = await supabase.from("deposits").update(patch).eq("id", id);
      if (error) throw error;
      toast.success(status === "paid" ? "הפיקדון סומן כשולם" : "הפיקדון הוחזר");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "עדכון נכשל");
    } finally {
      setBusyId(null);
    }
  };

  const total = deposits.reduce((s, d) => s + Number(d.amount || 0), 0);

  return (
    <MobileShell>
      <PageHeader title="ניהול פיקדונות" subtitle={`${deposits.length} פיקדונות · ${formatILS(total)}`} />

      {loading ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> טוען…
        </div>
      ) : (
        <div className="px-5 -mt-4 relative z-10 space-y-2">
          {deposits.length === 0 && (
            <div className="gb-card p-8 text-center text-sm text-muted-foreground">אין פיקדונות עדיין</div>
          )}
          {deposits.map((dep) => {
            const dealTitle = deals[dep.deal_id]?.title ?? dep.deal_id;
            const isPending = dep.status === "pending";
            const isPaid = dep.status === "paid";
            const isRefunded = dep.status === "refunded";
            return (
              <div key={dep.id} className="gb-card p-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-gold flex items-center justify-center text-primary">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{dealTitle}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {new Date(dep.created_at).toLocaleDateString("he-IL")} · {dep.user_id.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-primary text-sm">{formatILS(Number(dep.amount))}</div>
                    <div className={
                      "text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 " +
                      (isPaid ? "bg-success/10 text-success" : isRefunded ? "bg-muted text-muted-foreground" : "bg-gold/15 text-primary")
                    }>
                      {isPaid ? "שולם" : isPending ? "ממתין" : isRefunded ? "הוחזר" : dep.status}
                    </div>
                  </div>
                </div>

                {isPending && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => updateStatus(dep.id, "paid")}
                      disabled={busyId === dep.id}
                      className="h-9 rounded-xl bg-success text-success-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> סמן כשולם
                    </button>
                    <button
                      onClick={() => updateStatus(dep.id, "refunded")}
                      disabled={busyId === dep.id}
                      className="h-9 rounded-xl bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> בטל / החזר
                    </button>
                  </div>
                )}
                {isPaid && (
                  <div className="grid grid-cols-1 gap-2 mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => updateStatus(dep.id, "refunded")}
                      disabled={busyId === dep.id}
                      className="h-9 rounded-xl bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> סמן כהוחזר
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <BottomNav role="admin" />
    </MobileShell>
  );
}
