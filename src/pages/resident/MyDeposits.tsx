import { useCallback, useEffect, useRef, useState } from "react";
import { History, Eye, Trash2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatILS } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DbDeposit = {
  id: string;
  deal_id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  is_hidden: boolean;
};

type DealMap = Record<string, { title: string; status: string; is_deleted: boolean }>;

const ACTIVE_STATUSES = new Set(["pending", "paid"]);
const HISTORY_STATUSES = new Set(["refunded"]);
const IRRELEVANT_STATUSES = new Set(["cancelled", "failed", "expired"]);

export default function MyDeposits() {
  const [myDeposits, setMyDeposits] = useState<DbDeposit[]>([]);
  const [deals, setDeals] = useState<DealMap>({});
  const [depositsLoading, setDepositsLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);

  const loadDeposits = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("deposits")
      .select("id,deal_id,amount,status,created_at,paid_at,refunded_at,is_hidden")
      .eq("user_id", uid)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) { setDepositsLoading(false); return; }
    const list = (data ?? []) as DbDeposit[];
    setMyDeposits(list);
    const dealIds = Array.from(new Set(list.map((d) => d.deal_id)));
    if (dealIds.length) {
      const { data: dealRows } = await supabase
        .from("deals").select("id,title,status,is_deleted").in("id", dealIds);
      const m: DealMap = {};
      (dealRows ?? []).forEach((d: { id: string; title: string; status: string; is_deleted: boolean }) => {
        m[d.id] = { title: d.title, status: d.status, is_deleted: !!d.is_deleted };
      });
      setDeals(m);
    } else { setDeals({}); }
    setDepositsLoading(false);
  }, []);

  const toggleHidden = async (id: string, currentlyHidden: boolean) => {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("set_deposit_hidden", { _deposit_id: id, _hidden: !currentlyHidden });
      if (error) throw error;
      toast.success(currentlyHidden ? "הוחזר לתצוגה" : "הוסתר מהתצוגה");
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (uid) await loadDeposits(uid);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "פעולה נכשלה");
    }
    setBusyId(null);
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return;
      await loadDeposits(uid);
      channel = supabase.channel(`resident-deposits-${uid}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${uid}` },
          () => { void loadDeposits(uid); })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [loadDeposits]);

  const isRelevant = (d: DbDeposit) => {
    const deal = deals[d.deal_id];
    if (!deal || deal.is_deleted) return false;
    if (ACTIVE_STATUSES.has(d.status) && deal.status !== "active") return false;
    return true;
  };
  const isIrrelevant = (d: DbDeposit) => IRRELEVANT_STATUSES.has(d.status) || !isRelevant(d);

  const visibleDeposits = myDeposits.filter((d) => showHidden || !d.is_hidden);
  const activeDeposits = visibleDeposits.filter((d) => ACTIVE_STATUSES.has(d.status) && isRelevant(d));
  const historyDeposits = visibleDeposits.filter((d) => HISTORY_STATUSES.has(d.status));
  const irrelevantDeposits = visibleDeposits.filter(isIrrelevant);
  const hiddenCount = myDeposits.filter((d) => d.is_hidden).length;

  const renderItem = (dep: DbDeposit) => {
    const dealMissing = !deals[dep.deal_id];
    const dealTitle = deals[dep.deal_id]?.title ?? "עסקה שנמחקה";
    const status = dep.status;
    const meta =
      status === "paid" ? { label: "שולם", cls: "text-success bg-success/10" }
      : status === "pending" ? { label: "ממתין", cls: "text-primary bg-gold/15" }
      : status === "refunded" ? { label: "פיקדון הוחזר", cls: "text-muted-foreground bg-muted" }
      : status === "cancelled" ? { label: "בוטל", cls: "text-muted-foreground bg-muted" }
      : status === "failed" ? { label: "נכשל", cls: "text-destructive bg-destructive/10" }
      : { label: status, cls: "text-muted-foreground bg-muted" };
    const stampDate = status === "refunded" && dep.refunded_at
      ? new Date(dep.refunded_at).toLocaleDateString("he-IL")
      : status === "paid" && dep.paid_at
      ? new Date(dep.paid_at).toLocaleDateString("he-IL")
      : new Date(dep.created_at).toLocaleDateString("he-IL");
    return (
      <div key={dep.id}
        className={"gb-card p-4 relative overflow-hidden transition-transform " + (dep.is_hidden ? "opacity-60" : "")}
        style={swipeId === dep.id ? { transform: "translateX(-72px)" } : undefined}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (dx < -60) setSwipeId(dep.id); else if (dx > 30) setSwipeId(null);
        }}>
        {swipeId === dep.id && (
          <button onClick={() => setConfirmDeleteId(dep.id)}
            className="absolute top-0 bottom-0 -left-16 w-16 bg-destructive text-destructive-foreground flex items-center justify-center" aria-label="מחק">
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center text-xl shrink-0">🛒</div>
          <div className="flex-1 min-w-0">
            <div className={"font-bold text-sm truncate " + (dealMissing ? "text-muted-foreground italic" : "")}>{dealTitle}</div>
            <div className="text-[11px] text-muted-foreground">
              פיקדון {formatILS(Number(dep.amount))} · {stampDate}
              {status === "refunded" && dep.refunded_at ? " · הוחזר" : ""}
            </div>
          </div>
          <div className="text-left">
            <div className={"text-xs font-bold px-2 py-1 rounded-full " + meta.cls}>{meta.label}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {dep.is_hidden ? (
            <button onClick={() => toggleHidden(dep.id, dep.is_hidden)} disabled={busyId === dep.id}
              className="flex-1 h-7 rounded-lg text-[11px] text-muted-foreground hover:text-primary hover:bg-muted/40 flex items-center justify-center gap-1 transition-smooth disabled:opacity-50">
              <Eye className="h-3 w-3" /> החזר לתצוגה
            </button>
          ) : (
            <button onClick={() => setConfirmDeleteId(dep.id)} disabled={busyId === dep.id}
              className="flex-1 h-7 rounded-lg text-[11px] text-destructive hover:bg-destructive/10 flex items-center justify-center gap-1 transition-smooth disabled:opacity-50">
              <Trash2 className="h-3 w-3" /> מחק מההיסטוריה
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <MobileShell>
      <PageHeader title="הפיקדונות שלי" subtitle="ריכוז כל הפיקדונות שלך" />

      <section className="px-5 mt-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-gold" />
            פיקדונות פעילים
          </h2>
          {hiddenCount > 0 && (
            <button onClick={() => setShowHidden((v) => !v)} className="text-[11px] text-muted-foreground hover:text-primary">
              {showHidden ? `הסתר מוסתרים (${hiddenCount})` : `הצג מוסתרים (${hiddenCount})`}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {depositsLoading ? (
            <><div className="gb-skeleton h-20 rounded-2xl" /><div className="gb-skeleton h-20 rounded-2xl" /></>
          ) : activeDeposits.length === 0 ? (
            <div className="gb-card p-6 text-center text-sm text-muted-foreground">אין פיקדונות פעילים.</div>
          ) : activeDeposits.map(renderItem)}
        </div>
      </section>

      {!depositsLoading && historyDeposits.length > 0 && (
        <section className="px-5 mb-5">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            היסטוריית פיקדונות
          </h2>
          <div className="space-y-2">{historyDeposits.map(renderItem)}</div>
        </section>
      )}

      {!depositsLoading && showHidden && irrelevantDeposits.length > 0 && (
        <section className="px-5 mb-5">
          <h2 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
            <History className="h-4 w-4" />
            פיקדונות לא רלוונטיים
          </h2>
          <div className="space-y-2 opacity-80">{irrelevantDeposits.map(renderItem)}</div>
        </section>
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את הפיקדון מההיסטוריה?</AlertDialogTitle>
            <AlertDialogDescription>
              הפיקדון יוסתר מהתצוגה שלך. הנתונים נשמרים במערכת לצורך תיעוד ואפשר לשחזר דרך מנהל המערכת.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!confirmDeleteId) return;
                await toggleHidden(confirmDeleteId, false);
                setConfirmDeleteId(null);
                setSwipeId(null);
              }}>
              מחק מההיסטוריה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
