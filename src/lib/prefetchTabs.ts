import { supabase } from "@/integrations/supabase/client";
import { prefetchQuery } from "@/lib/clientCache";
import { fetchDealJoinerCounts } from "@/lib/dealCounts";
import type { RealDealCardData } from "@/components/deals/RealDealCard";
import type { OfferTier } from "@/lib/offerPricing";

type SupplierLite = {
  id: string;
  business_name: string;
  short_description: string | null;
  logo_url: string | null;
  categories: string[];
  service_areas: string[];
};

/** Warm caches for the most-used resident tabs so tab switches feel instant. */
export function prefetchResidentTabs() {
  // Categories tab — supplier list
  prefetchQuery<SupplierLite[]>("categories:suppliers", async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("id,business_name,short_description,logo_url,categories,service_areas")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .in("approval_status", ["approved", "active"])
      .order("business_name");
    return (data as SupplierLite[]) ?? [];
  });

  // Deals tab — all active deals + joiner counts
  prefetchQuery<{ deals: RealDealCardData[]; counts: Record<string, number> }>("deals-list:all", async () => {
    const { data } = await supabase
      .from("deals")
      .select(
        "id,title,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,cover_image_url,gallery_images,visibility_type,visibility_project_id,suppliers!inner(business_name,logo_url,is_active,approval_status)",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const mapped: RealDealCardData[] = rows
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
          visibility_type: (r.visibility_type as string | null) ?? "public",
          visibility_project_id: (r.visibility_project_id as string | null) ?? null,
          cover_image_url: (r.cover_image_url as string | null) ?? null,
          gallery_images: (Array.isArray(r.gallery_images) ? (r.gallery_images as string[]) : []) as string[],
        };
      });
    const counts = mapped.length ? await fetchDealJoinerCounts(mapped.map((d) => d.id)) : {};
    return { deals: mapped, counts };
  });
}
