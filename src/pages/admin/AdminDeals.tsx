import { useCallback, useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Search } from "lucide-react";
import { toast } from "sonner";
import { DealActionsMenu } from "@/components/deals/DealActionsMenu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type DbDeal = {
  id: string;
  title: string;
  status: string;
  category_id: string | null;
  supplier_id: string;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  offer_type: string | null;
  target_participants: number | null;
  auto_closed_at: string | null;
  max_redemptions: number | null;
};

type SupplierMap = Record<string, { business_name: string }>;
type DealCounts = { interests: number; paid: number; eligible: number; redeemed: number };

export default function AdminDeals() {
  const { categories } = useApp();
  const [deals, setDeals] = useState<DbDeal[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierMap>({});
  const [counts, setCounts] = useState<Record<string, DealCounts>>({});
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deals")
        .select("id,title,status,category_id,supplier_id,original_price,discounted_price,discount_percentage,base_price,offer_type,target_participants,auto_closed_at,max_redemptions")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as DbDeal[];
      setDeals(list);

      const supplierIds = Array.from(new Set(list.map((d) => d.supplier_id))).filter(Boolean);
      if (supplierIds.length) {
        const { data: srows } = await supabase
          .from("suppliers")
          .select("id,business_name")
          .in("id", supplierIds);
        const m: SupplierMap = {};
        (srows ?? []).forEach((s: { id: string; business_name: string }) => { m[s.id] = { business_name: s.business_name }; });
        setSuppliers(m);
      }

      const cMap: Record<string, DealCounts> = {};
      await Promise.all(list.map(async (d) => {
        const [{ count: interests }, { count: paid }, { count: eligible }, { count: redeemed }] = await Promise.all([
          supabase.from("deal_interests").select("*", { count: "exact", head: true }).eq("deal_id", d.id).eq("is_deleted", false),
          supabase.from("deposits").select("*", { count: "exact", head: true }).eq("deal_id", d.id).eq("status", "paid").eq("is_deleted", false),
          supabase.from("vouchers").select("*", { count: "exact", head: true }).eq("deal_id", d.id).eq("status", "eligible"),
          supabase.from("vouchers").select("*", { count: "exact", head: true }).eq("deal_id", d.id).eq("status", "redeemed"),
        ]);
        cMap[d.id] = {
          interests: interests ?? 0,
          paid: paid ?? 0,
          eligible: eligible ?? 0,
          redeemed: redeemed ?? 0,
        };
      }));
      setCounts(cMap);
    } catch (err) {
      console.error("[AdminDeals]", err);
      toast.error(err instanceof Error ? err.message : "טעינת ההצעות נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleDeals = useMemo(() => {
    const base = showInactive ? deals : deals.filter((d) => d.status === "active");
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((d) => {
      const supplier = suppliers[d.supplier_id]?.business_name ?? "";
      const category = categories.find((c) => c.id === d.category_id)?.name ?? "";
      return [d.title, supplier, category].some((s) => (s ?? "").toLowerCase().includes(q));
    });
  }, [deals, showInactive, query, suppliers, categories]);

  const priceFor = (d: DbDeal): number => {
    if (d.offer_type === "price_comparison" && d.discounted_price != null) return Number(d.discounted_price);
    if (d.offer_type === "percentage" && d.original_price != null && d.discount_percentage != null) {
      return Number(d.original_price) * (1 - Number(d.discount_percentage) / 100);
    }
    return Number(d.base_price ?? d.original_price ?? 0);
  };

  const statusLabel = (d: DbDeal) => {
    if (d.status === "closed" || d.auto_closed_at) return { label: "נסגרה", cls: "bg-emerald-500/10 text-emerald-700" };
    if (d.status === "redeemed") return { label: "מומשה", cls: "bg-blue-500/10 text-blue-700" };
    if (d.status === "active") return { label: "פעילה", cls: "bg-success/10 text-success" };
    return { label: d.status, cls: "bg-muted text-muted-foreground" };
  };

  return (
    <MobileShell>
      <PageHeader title="ניהול עסקאות" subtitle={`${visibleDeals.length} מוצגות מתוך ${deals.length}`} back={false} />
      <div className="px-5 -mt-2 mb-3 space-y-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם הצעה, ספק או קטגוריה"
            className="h-10 pr-9 text-sm"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Label htmlFor="show-inactive" className="text-xs text-muted-foreground">הצג מושבתות</Label>
          <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
        </div>
      </div>
      {loading ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> טוען…
        </div>
      ) : (
        <div className="px-5 relative z-10 space-y-3">
          {visibleDeals.length === 0 && (
            <div className="gb-card p-8 text-center text-sm text-muted-foreground">אין הצעות להצגה</div>
          )}
          {visibleDeals.map((d) => {
            const supplier = suppliers[d.supplier_id];
            const category = categories.find((c) => c.id === d.category_id);
            const cnt = counts[d.id] ?? { interests: 0, paid: 0, eligible: 0, redeemed: 0 };
            const st = statusLabel(d);
            const target = d.target_participants ?? 0;
            const totalIssued = cnt.eligible + cnt.redeemed;
            const rate = totalIssued > 0 ? Math.round((cnt.redeemed / totalIssued) * 100) : 0;
            const isLocked = !!d.auto_closed_at;
            return (
              <div key={d.id} className="gb-card p-4">
                <div className="flex items-start gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center text-lg">{category?.icon ?? "🏷️"}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{d.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      {isLocked && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" /> נעולה
                        </span>
                      )}
                      <p className="text-[11px] text-muted-foreground truncate">{supplier?.business_name ?? "—"}</p>
                    </div>
                  </div>
                  <DealActionsMenu dealId={d.id} status={d.status} onChanged={load} />
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border text-center text-[11px]">
                  <div>
                    <div className="font-bold text-primary">{formatILS(priceFor(d))}</div>
                    <div className="text-muted-foreground">מחיר</div>
                  </div>
                  <div className="border-x border-border">
                    <div className="font-bold text-foreground">{cnt.paid}{target ? `/${target}` : ""}</div>
                    <div className="text-muted-foreground">הצטרפו</div>
                  </div>
                  <div className="border-l border-border">
                    <div className="font-bold text-emerald-700">{cnt.eligible + cnt.redeemed}</div>
                    <div className="text-muted-foreground">זכאים</div>
                  </div>
                  <div>
                    <div className="font-bold text-blue-700">{cnt.redeemed} <span className="text-[10px] text-muted-foreground">({rate}%)</span></div>
                    <div className="text-muted-foreground">מומשו</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <BottomNav role="admin" />
    </MobileShell>
  );
}
