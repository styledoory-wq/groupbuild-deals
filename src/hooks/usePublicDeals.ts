import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isShowcase, showcasePublicDeals } from "@/lib/showcase";

export type PublicDeal = {
  id: string;
  title: string;
  discount_percentage: number | null;
  cover_image_url: string | null;
  service_areas: string[];
  supplier: {
    id: string;
    business_name: string;
    logo_url: string | null;
  };
};

/**
 * Public, community-visible deals only.
 * Filters mirror the shared rule used across the app (Browse.tsx / prefetchTabs.ts):
 *   - deal: status=active, not deleted, not demo, public visibility, not auto-closed, not expired
 *   - supplier: is_active + not deleted + approval_status in (approved, active)
 * No demo/placeholder fallback — if nothing matches, returns [].
 */
export function usePublicDeals(limit = 6) {
  return useQuery<PublicDeal[]>({
    queryKey: ["public-deals", "home", limit],
    queryFn: async () => {
      if (isShowcase()) return showcasePublicDeals(limit);
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("deals")
        .select(
          "id,title,discount_percentage,cover_image_url,service_areas,ends_at,auto_closed_at,created_at,suppliers!inner(id,business_name,logo_url,is_active,approval_status,is_deleted)",
        )
        .eq("status", "active")
        .eq("is_deleted", false)
        .eq("is_demo", false)
        .eq("visibility_type", "public")
        .is("auto_closed_at", null)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(limit * 3);

      if (error) throw error;

      type Row = {
        id: string;
        title: string;
        discount_percentage: number | null;
        cover_image_url: string | null;
        service_areas: string[] | null;
        suppliers: {
          id: string;
          business_name: string;
          logo_url: string | null;
          is_active: boolean | null;
          approval_status: string | null;
          is_deleted: boolean | null;
        } | null;
      };

      return ((data ?? []) as Row[])
        .filter((r) => {
          const s = r.suppliers;
          if (!s) return false;
          if (s.is_active !== true) return false;
          if (s.is_deleted === true) return false;
          return s.approval_status === "approved" || s.approval_status === "active";
        })
        .slice(0, limit)
        .map((r) => ({
          id: r.id,
          title: r.title,
          discount_percentage: r.discount_percentage,
          cover_image_url: r.cover_image_url,
          service_areas: r.service_areas ?? [],
          supplier: {
            id: r.suppliers!.id,
            business_name: r.suppliers!.business_name,
            logo_url: r.suppliers!.logo_url,
          },
        }));
    },
    staleTime: 60_000,
  });
}
