import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Sparkles } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ds/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import type { OfferTier } from "@/lib/offerPricing";
import { fetchDealJoinerCounts } from "@/lib/dealCounts";

export default function Favorites() {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<RealDealCardData[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { setLoading(false); return; }
      const uid = session.session.user.id;
      const { data: favs } = await supabase.from("favorites").select("deal_id").eq("user_id", uid);
      const ids = (favs ?? []).map((r) => r.deal_id as string);
      setFavIds(new Set(ids));
      if (!ids.length) { setLoading(false); return; }
      const { data } = await supabase
        .from("deals")
        .select(
          "id,title,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,cover_image_url,gallery_images,visibility_type,visibility_project_id,target_participants,join_deadline,redemption_deadline,auto_closed_at,suppliers(business_name,logo_url)",
        )
        .in("id", ids);
      const rows = (data ?? []) as Array<Record<string, unknown>>;
      const mapped: RealDealCardData[] = rows.map((r) => {
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
          target_participants: (r.target_participants as number | null) ?? null,
          join_deadline: (r.join_deadline as string | null) ?? null,
          redemption_deadline: (r.redemption_deadline as string | null) ?? null,
          auto_closed_at: (r.auto_closed_at as string | null) ?? null,
        };
      });
      setDeals(mapped);
      if (mapped.length) setCounts(await fetchDealJoinerCounts(mapped.map((d) => d.id)));
      setLoading(false);
    })();
  }, []);

  return (
    <MobileShell>
      <PageHeader title="המועדפים שלי" subtitle="עסקאות ששמרת לעיון מאוחר יותר" />
      <div className="px-5 lg:px-0 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl gb-skeleton" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-7 w-7 text-[#E11D48]" strokeWidth={2} />}
            title="אין עדיין מועדפים"
            description="לחצו על הלב בכל הצעה כדי לשמור אותה כאן."
            action={
              <Link
                to="/resident/deals"
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-2xl bg-[#2563EB] text-white text-[14px] font-bold"
              >
                <Sparkles className="h-4 w-4" /> לעסקאות חיות
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {deals.map((d) => (
              <RealDealCard key={d.id} deal={d} joinersCount={counts[d.id] ?? 0} isFavorite={favIds.has(d.id)} />
            ))}
          </div>
        )}
      </div>
      <BottomNav role="resident" />
    </MobileShell>
  );
}
