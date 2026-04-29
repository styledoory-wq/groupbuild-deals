import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [state, setState] = useState<SupplierRating>({ avg: 0, count: 0, loading: true });

  useEffect(() => {
    if (!supplierId) {
      setState({ avg: 0, count: 0, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_supplier_rating", { _supplier_id: supplierId });
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setState({ avg: 0, count: 0, loading: false });
        return;
      }
      const row = data[0] as { avg_rating: number | string; review_count: number };
      setState({
        avg: Number(row.avg_rating) || 0,
        count: Number(row.review_count) || 0,
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  return state;
}
