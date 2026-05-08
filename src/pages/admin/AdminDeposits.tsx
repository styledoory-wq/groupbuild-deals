import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatILS } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Check, RefreshCw, Loader2, Search, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";

type DbDeposit = {
  id: string;
  user_id: string;
  deal_id: string;
  amount: number;
  status: string;
  payment_provider: string | null;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  is_hidden: boolean;
};

type DealMap = Record<string, { title: string }>;
type ProfileMap = Record<string, { name: string; email: string | null; phone: string | null }>;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "ממתין", cls: "bg-gold/15 text-primary" },
  paid: { label: "שולם", cls: "bg-success/10 text-success" },
  refunded: { label: "הוחזר", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "בוטל", cls: "bg-muted text-muted-foreground" },
  failed: { label: "נכשל", cls: "bg-destructive/10 text-destructive" },
};

const VIEW_FILTERS: Array<{ key: string; label: string }> = [
  { key: "active", label: "פעילים" },
  { key: "refunded", label: "מוחזרים" },
  { key: "hidden", label: "מוסתרים" },
  { key: "all", label: "הכול" },
];

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState<DbDeposit[]>([]);
  const [deals, setDeals] = useState<DealMap>({});
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<string>("active");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deposits")
        .select("id,user_id,deal_id,amount,status,payment_provider,created_at,paid_at,refunded_at,is_hidden")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as DbDeposit[];
      setDeposits(list);

      const dealIds = Array.from(new Set(list.map((d) => d.deal_id))).filter(Boolean);
      const userIds = Array.from(new Set(list.map((d) => d.user_id))).filter(Boolean);

      const [dealsRes, profilesRes] = await Promise.all([
        dealIds.length
          ? supabase.from("deals").select("id,title").in("id", dealIds)
          : Promise.resolve({ data: [] as { id: string; title: string }[] }),
        userIds.length
          ? supabase.from("profiles").select("id,full_name,email,phone").in("id", userIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null; phone: string | null }[] }),
      ]);

      const dealMap: DealMap = {};
      (dealsRes.data ?? []).forEach((d) => { dealMap[d.id] = { title: d.title }; });
      setDeals(dealMap);

      const profMap: ProfileMap = {};
      (profilesRes.data ?? []).forEach((p) => {
        profMap[p.id] = { name: p.full_name || "ללא שם", email: p.email, phone: p.phone };
      });
      setProfiles(profMap);
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
      const patch = status === "paid" ? { status, paid_at: nowIso } : { status, refunded_at: nowIso };
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

  const toggleHidden = async (id: string, currentlyHidden: boolean) => {
    setBusyId(id);
    try {
      const { error } = await supabase
        .from("deposits")
        .update({ is_hidden: !currentlyHidden })
        .eq("id", id);
      if (error) throw error;
      toast.success(currentlyHidden ? "הפיקדון הוחזר לתצוגה" : "הפיקדון הוסתר מהתצוגה");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "פעולה נכשלה");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deposits.filter((d) => {
      if (view === "active" && (d.is_hidden || d.status === "refunded" || d.status === "cancelled" || d.status === "failed")) return false;
      if (view === "refunded" && (d.is_hidden || d.status !== "refunded")) return false;
      if (view === "hidden" && !d.is_hidden) return false;
      // "all" → no filter
      if (!q) return true;
      const dealTitle = (deals[d.deal_id]?.title ?? "").toLowerCase();
      const prof = profiles[d.user_id];
      const userBlob = `${prof?.name ?? ""} ${prof?.email ?? ""} ${prof?.phone ?? ""}`.toLowerCase();
      return dealTitle.includes(q) || userBlob.includes(q) || d.id.includes(q);
    });
  }, [deposits, deals, profiles, view, query]);

  const activeTotal = deposits
    .filter((d) => !d.is_hidden && (d.status === "pending" || d.status === "paid"))
    .reduce((s, d) => s + Number(d.amount || 0), 0);
  const activeCount = deposits.filter((d) => !d.is_hidden && (d.status === "pending" || d.status === "paid")).length;

  return (
    <MobileShell>
      <PageHeader title="מעקב פיקדונות" subtitle={`${activeCount} פיקדונות פעילים · ${formatILS(activeTotal)}`} />

      <div className="px-5 -mt-4 relative z-10 space-y-3">
        <div className="gb-card p-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי דייר, אימייל, טלפון או הצעה…"
              className="w-full h-10 rounded-xl bg-muted/40 px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  "px-3 h-7 rounded-full text-[11px] font-bold transition-smooth " +
                  (filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> טוען…
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="gb-card p-8 text-center text-sm text-muted-foreground">אין פיקדונות תואמים</div>
            )}
            {filtered.map((dep) => {
              const dealMissing = !deals[dep.deal_id];
              const dealTitle = deals[dep.deal_id]?.title ?? "עסקה שנמחקה";
              const prof = profiles[dep.user_id];
              const meta = STATUS_META[dep.status] ?? { label: dep.status, cls: "bg-muted text-muted-foreground" };
              const isPending = dep.status === "pending";
              const isPaid = dep.status === "paid";
              const stamp = dep.status === "refunded" && dep.refunded_at
                ? `הוחזר ${new Date(dep.refunded_at).toLocaleDateString("he-IL")}`
                : dep.status === "paid" && dep.paid_at
                ? `שולם ${new Date(dep.paid_at).toLocaleDateString("he-IL")}`
                : `נוצר ${new Date(dep.created_at).toLocaleDateString("he-IL")}`;
              return (
                <div key={dep.id} className="gb-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-gold flex items-center justify-center text-primary">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={"font-bold text-sm truncate " + (dealMissing ? "italic text-muted-foreground" : "")}>
                        {dealTitle}
                      </h3>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {prof?.name ?? dep.user_id.slice(0, 8) + "…"}
                        {prof?.phone ? ` · ${prof.phone}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                        {stamp}{dep.payment_provider ? ` · ${dep.payment_provider}` : ""}
                      </p>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-primary text-sm">{formatILS(Number(dep.amount))}</div>
                      <div className={"text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 " + meta.cls}>
                        {meta.label}
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
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}
