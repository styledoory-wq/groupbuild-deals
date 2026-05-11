import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

export interface SupplierRating {
  avg: number;
  count: number;
  loading: boolean;
}

/**
 * Live aggregate rating for a supplier — computed automatically from the
 * `reviews` table via the `get_supplier_rating` SQL function.
 * NEVER set manually.
 */
export function useSupplierRating(supplierId?: string | null): SupplierRating {
  const cacheKey = supplierId ? `supplier-rating:${supplierId}` : "";
  const [state, setState] = useState<SupplierRating>(() => {
    if (!supplierId) return { avg: 0, count: 0, loading: false };
    return getCachedValue<Omit<SupplierRating, "loading">>(cacheKey, 5 * 60_000)
      ? { ...getCachedValue<Omit<SupplierRating, "loading">>(cacheKey, 5 * 60_000)!, loading: false }
      : { avg: 0, count: 0, loading: true };
  });

  useEffect(() => {
    if (!supplierId) {
      setState({ avg: 0, count: 0, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      const rating = await cachedQuery(cacheKey, async () => {
        const { data, error } = await supabase.rpc("get_supplier_rating", { _supplier_id: supplierId });
        if (error || !data || data.length === 0) return { avg: 0, count: 0 };
        const row = data[0] as { avg_rating: number | string; review_count: number };
        return { avg: Number(row.avg_rating) || 0, count: Number(row.review_count) || 0 };
      }, 5 * 60_000);
      if (!cancelled) setState({ ...rating, loading: false });
    })().catch(() => {
      if (!cancelled) setState({ avg: 0, count: 0, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId, cacheKey]);

  return state;
}
