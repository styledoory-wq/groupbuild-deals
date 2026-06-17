import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Tag, Search as SearchIcon, Heart } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import { DealCardSkeletonList } from "@/components/deals/DealCardSkeleton";
import { fetchDealJoinerCounts } from "@/lib/dealCounts";
import { listFavoriteIds } from "@/lib/favorites";
import type { OfferTier } from "@/lib/offerPricing";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

type DealWithSupplier = RealDealCardData;
type TabKey = "active" | "favorites" | "archive";

const STAGE_CATEGORY_IDS: Record<string, string[]> = {
  planning: ["architect", "interior-designer", "consultant"],
  structure: ["contractor", "skeleton", "gypsum"],
  systems: ["electric", "plumbing", "ac", "smart-home"],
  finishes: ["windows", "doors", "security-door", "flooring", "cladding", "painting", "kitchen", "bath", "showers", "sanitary", "carpentry", "closets", "lighting"],
  outdoor: ["garden", "pergola", "cleaning"],
};
const STAGE_TITLES: Record<string, string> = {
  planning: "תכנון ועיצוב", structure: "שלד ובנייה", systems: "מערכות הבית", finishes: "גמרים", outdoor: "חוץ ופיתוח",
};

export default function DealsList() {
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const stageId = searchParams.get("stage") || "";
  const stageCategoryIds = stageId ? STAGE_CATEGORY_IDS[stageId] ?? [] : [];
  const { categories } = useApp();

  const cacheKey = `deals-list:v2:${categoryId ?? (stageId ? `stage-${stageId}` : "all")}`;

  // ✅ טוען מה-cache מיד — בלי skeleton אם יש נתונים שמורים
  const cached = getCachedValue<{ deals: DealWithSupplier[]; counts: Record<string, number> }>(cacheKey, 5 * 60_000);
  const [deals, setDeals] = useState<DealWithSupplier[]>(() => cached?.deals ?? []);
  const [counts, setCounts] = useState<Record<string, number>>(() => cached?.counts ?? {});
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("active");
  const [q, setQ] = useState("");
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // ✅ אם יש cache — לא מציג skeleton, טוען ברקע בשקט
      if (!cached) setLoading(true);
      setError(null);
      try {
        const result = await cachedQuery(cacheKey, async () => {
          let query = supabase
            .from("deals")
            .select(
              "id,title,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,cover_image_url,gallery_images,visibility_type,visibility_project_id,target_participants,join_deadline,redemption_deadline,auto_closed_at,suppliers!inner(business_name,logo_url,is_active,approval_status)",
            )
            .in("status", ["active", "closed"])
            .order("created_at", { ascending: false });

          if (categoryId) query = query.eq("category_id", categoryId);
          else if (stageId && stageCategoryIds.length) query = query.in("category_id", stageCategoryIds);

          const { data, error: dErr } = await query;
          if (dErr) throw dErr;

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

          let nextCounts: Record<string, number> = {};
          if (mapped.length) {
            nextCounts = await fetchDealJoinerCounts(mapped.map((d) => d.id));
          }
          return { deals: mapped, counts: nextCounts };
        }, 5 * 60_000);

        if (!cancelled) {
          setDeals(result.deals);
          setCounts(result.counts);
        }
      } catch (e) {
        console.error("[DealsList] load error", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה בטעינה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [categoryId, stageId, cacheKey]);

  const cat = categories.find((c) => c.id === categoryId);
  const stageTitle = stageId ? STAGE_TITLES[stageId] : "";

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return deals.filter((d) => {
      const statusMatch =
        tab === "active"
          ? d.status === "active" && !d.auto_closed_at
          : d.status === "closed" || !!d.auto_closed_at;
      if (!statusMatch) return false;
      if (!term) return true;
      return (
        d.title.toLowerCase().includes(term) ||
        (d.supplier_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [deals, tab, q]);

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F8F8F6" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        <PageHeader size="large"
          title={cat ? `${cat.icon} ${cat.name}` : stageTitle ? stageTitle : "כל ההצעות"}
          subtitle={loading ? "טוען..." : `${filtered.length} הצעות ${tab === "active" ? "פעילות" : "בארכיון"}`}
        />

        {/* Tabs — segmented control */}
        <div className="px-5 mt-3">
          <div className="bg-white border border-[#ECEEF2] rounded-full p-1 flex items-center shadow-[0_2px_10px_-4px_rgba(10,31,61,0.06)]">
            <button
              onClick={() => setTab("active")}
              className={`flex-1 h-10 rounded-full text-[13px] font-bold transition-all ${
                tab === "active" ? "bg-[#2563EB] text-white shadow-[0_4px_12px_-4px_rgba(10,31,61,0.4)]" : "text-[#6B7280]"
              }`}
            >
              פעילות
            </button>
            <button
              onClick={() => setTab("archive")}
              className={`flex-1 h-10 rounded-full text-[13px] font-bold transition-all ${
                tab === "archive" ? "bg-[#2563EB] text-white shadow-[0_4px_12px_-4px_rgba(10,31,61,0.4)]" : "text-[#6B7280]"
              }`}
            >
              ארכיון
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 mt-3">
          <div className="relative">
            <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#6B7280]" strokeWidth={2} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="חפש הצעה לפי שם..."
              className="w-full h-12 rounded-[18px] bg-white border border-[#ECEEF2] pr-11 pl-4 text-[14px] font-medium text-[#1F2937] placeholder:text-[#6B7280] focus:outline-none focus:border-[#C9A227] focus:ring-[3px] focus:ring-[#C9A227]/15 transition"
              dir="rtl"
            />
          </div>
        </div>

        <div className="px-5 md:px-8 lg:px-10 mt-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
            {loading && <DealCardSkeletonList count={4} />}

            {!loading && error && (
              <div className="rounded-[20px] border border-[#ECEEF2] bg-white p-6 text-center col-span-2 md:col-span-3">
                <p className="text-[14px] font-bold text-[#1F2937]">שגיאה בטעינה</p>
                <p className="text-[12px] text-[#6B7280] mt-1">{error}</p>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-[#ECEEF2] bg-white/60 p-10 text-center col-span-2 md:col-span-3">
                <Tag className="h-8 w-8 mx-auto mb-3 text-[#9CA3AF]" />
                <p className="text-[14px] font-bold text-[#1F2937]">
                  {tab === "active" ? "אין עדיין הצעות פעילות" : "אין הצעות בארכיון"}
                </p>
                <p className="text-[12px] text-[#6B7280] mt-1">
                  {cat ? `בקטגוריה ${cat.name} עוד אין הצעות זמינות.` : "חזרו בקרוב לבדוק הצעות חדשות."}
                </p>
              </div>
            )}

            {!loading && !error && filtered.map((d) => (
              <RealDealCard key={d.id} deal={d} joinersCount={counts[d.id] ?? 0} />
            ))}
          </div>
        </div>
      </div>
      <BottomNav role="resident" />
    </div>
  );
}