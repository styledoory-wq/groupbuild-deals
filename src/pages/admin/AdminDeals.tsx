import { useCallback, useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DealActionsMenu } from "@/components/deals/DealActionsMenu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
};

type SupplierMap = Record<string, { business_name: string }>;

export default function AdminDeals() {
  const { categories } = useApp();
  const [deals, setDeals] = useState<DbDeal[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierMap>({});
  const [counts, setCounts] = useState<Record<string, { interests: number; paid: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("deals")
          .select("id,title,status,category_id,supplier_id,original_price,discounted_price,discount_percentage,base_price,offer_type")
          .eq("is_deleted", false)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const list = (data ?? []) as DbDeal[];
        if (cancelled) return;
        setDeals(list);

        const supplierIds = Array.from(new Set(list.map((d) => d.supplier_id))).filter(Boolean);
        if (supplierIds.length) {
          const { data: srows } = await supabase
            .from("suppliers")
            .select("id,business_name")
            .in("id", supplierIds);
          const m: SupplierMap = {};
          (srows ?? []).forEach((s: { id: string; business_name: string }) => { m[s.id] = { business_name: s.business_name }; });
          if (!cancelled) setSuppliers(m);
        }

        // counts
        const cMap: Record<string, { interests: number; paid: number }> = {};
        await Promise.all(list.map(async (d) => {
          const [{ count: interests }, { count: paid }] = await Promise.all([
            supabase.from("deal_interests").select("*", { count: "exact", head: true }).eq("deal_id", d.id).eq("is_deleted", false),
            supabase.from("deposits").select("*", { count: "exact", head: true }).eq("deal_id", d.id).eq("status", "paid").eq("is_deleted", false),
          ]);
          cMap[d.id] = { interests: interests ?? 0, paid: paid ?? 0 };
        }));
        if (!cancelled) setCounts(cMap);
      } catch (err) {
        console.error("[AdminDeals]", err);
        toast.error(err instanceof Error ? err.message : "טעינת ההצעות נכשלה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const priceFor = (d: DbDeal): number => {
    if (d.offer_type === "price_comparison" && d.discounted_price != null) return Number(d.discounted_price);
    if (d.offer_type === "percentage" && d.original_price != null && d.discount_percentage != null) {
      return Number(d.original_price) * (1 - Number(d.discount_percentage) / 100);
    }
    return Number(d.base_price ?? d.original_price ?? 0);
  };

  return (
    <MobileShell>
      <PageHeader title="ניהול עסקאות" subtitle={`${deals.length} עסקאות במערכת`} back={false} />
      {loading ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> טוען…
        </div>
      ) : (
        <div className="px-5 -mt-4 relative z-10 space-y-3">
          {deals.length === 0 && (
            <div className="gb-card p-8 text-center text-sm text-muted-foreground">אין הצעות עדיין</div>
          )}
          {deals.map((d) => {
            const supplier = suppliers[d.supplier_id];
            const category = categories.find((c) => c.id === d.category_id);
            const cnt = counts[d.id] ?? { interests: 0, paid: 0 };
            return (
              <div key={d.id} className="gb-card p-4">
                <div className="flex items-start gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center text-lg">{category?.icon ?? "🏷️"}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{d.title}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">{supplier?.business_name ?? "—"} · {d.status}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center text-[11px]">
                  <div>
                    <div className="font-bold text-primary">{formatILS(priceFor(d))}</div>
                    <div className="text-muted-foreground">מחיר</div>
                  </div>
                  <div className="border-x border-border">
                    <div className="font-bold text-success">{cnt.paid}</div>
                    <div className="text-muted-foreground">פיקדונות שולמו</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{cnt.interests}</div>
                    <div className="text-muted-foreground">לידים</div>
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
