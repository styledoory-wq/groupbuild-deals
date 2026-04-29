import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Tag } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import type { OfferTier } from "@/lib/offerPricing";

type DealWithSupplier = RealDealCardData;

export default function DealsList() {
  const { categoryId } = useParams();
  const { categories } = useApp();
  const [deals, setDeals] = useState<DealWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from("deals")
          .select(
            "id,title,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,suppliers!inner(business_name,logo_url,is_active,approval_status)",
          )
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (categoryId) query = query.eq("category_id", categoryId);

        const { data, error: dErr } = await query;
        if (dErr) throw dErr;
        if (cancelled) return;

        const rows = (data ?? []) as Array<Record<string, unknown>>;
        const mapped: DealWithSupplier[] = rows
          .filter((r) => {
            const s = r.suppliers as { is_active?: boolean; approval_status?: string } | null;
            if (!s) return false;
            return s.is_active === true && (s.approval_status === "approved" || s.approval_status === "active");
          })
          .map((r) => {
            const s = r.suppliers as { business_name?: string; logo_url?: string | null } | null;
            return {
              id: String(r.id),
              title: String(r.title ?? ""),
              status: String(r.status ?? "active"),
              category_id: (r.category_id as string | null) ?? null,
              supplier_id: String(r.supplier_id),
              supplier_name: s?.business_name ?? null,
              supplier_logo_url: s?.logo_url ?? null,
              offer_type: (r.offer_type as string | null) ?? "percentage",
              original_price: (r.original_price as number | null) ?? null,
              discounted_price: (r.discounted_price as number | null) ?? null,
              discount_percentage: (r.discount_percentage as number | null) ?? null,
              base_price: (r.base_price as number | null) ?? null,
              tiers: (Array.isArray(r.tiers) ? (r.tiers as OfferTier[]) : []) as OfferTier[],
              ends_at: (r.ends_at as string | null) ?? null,
            };
          });
        setDeals(mapped);
      } catch (e) {
        console.error("[DealsList] load error", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה בטעינה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const cat = categories.find((c) => c.id === categoryId);

  return (
    <MobileShell>
      <PageHeader
        title={cat ? `${cat.icon}  ${cat.name}` : "כל העסקאות"}
        subtitle={loading ? "טוען עסקאות..." : `${deals.length} עסקאות פעילות`}
      />
      <div className="px-5 -mt-4 relative z-10 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="gb-card p-6 text-center">
            <p className="text-sm font-bold text-foreground">שגיאה בטעינה</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && deals.length === 0 && (
          <div className="gb-card p-8 text-center">
            <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">אין עדיין עסקאות פעילות{cat ? ` בקטגוריה ${cat.name}` : ""}.</p>
          </div>
        )}

        {!loading && !error && deals.map((d) => <RealDealCard key={d.id} deal={d} />)}
      </div>
      <BottomNav role="resident" />
    </MobileShell>
  );
}
