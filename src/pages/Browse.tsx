import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Tag, Search as SearchIcon, Store, Star, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import { DealCardSkeletonList } from "@/components/deals/DealCardSkeleton";
import { fetchDealJoinerCounts } from "@/lib/dealCounts";
import type { OfferTier } from "@/lib/offerPricing";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { SmartImg } from "@/components/ui/SmartImg";

type SupplierRow = {
  id: string;
  business_name: string;
  logo_url: string | null;
  service_areas: string[] | null;
  categories: string[] | null;
  category_name?: string | null;
};

export default function Browse() {
  const [deals, setDeals] = useState<RealDealCardData[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"deals" | "suppliers">("deals");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Deals (public — RLS allows reading active deals)
        const { data: dRows } = await supabase
          .from("deals")
          .select(
            "id,title,status,category_id,supplier_id,offer_type,listing_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,cover_image_url,gallery_images,visibility_type,target_participants,join_deadline,redemption_deadline,auto_closed_at,suppliers!inner(business_name,logo_url,is_active,approval_status)",
          )
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(60);

        const dealRows = (dRows ?? []) as Array<Record<string, unknown>>;
        const mappedDeals: RealDealCardData[] = dealRows
          .filter((r) => {
            const s = r.suppliers as { is_active?: boolean; approval_status?: string } | null;
            return s?.is_active === true && (s.approval_status === "approved" || s.approval_status === "active");
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
              cover_image_url: (r.cover_image_url as string | null) ?? null,
              gallery_images: (Array.isArray(r.gallery_images) ? (r.gallery_images as string[]) : []) as string[],
              target_participants: (r.target_participants as number | null) ?? null,
              join_deadline: (r.join_deadline as string | null) ?? null,
              redemption_deadline: (r.redemption_deadline as string | null) ?? null,
              auto_closed_at: (r.auto_closed_at as string | null) ?? null,
              listing_type: (r.listing_type as string | null) ?? "group_buy",
            };

          });

        // Suppliers
        const { data: sRows } = await supabase
          .from("suppliers")
          .select("id,business_name,logo_url,service_areas,categories")
          .eq("is_active", true)
          .in("approval_status", ["approved", "active"])
          .order("business_name", { ascending: true })
          .limit(60);

        const supplierList = (sRows ?? []) as unknown as SupplierRow[];
        const catIds = Array.from(
          new Set(supplierList.flatMap((s) => (Array.isArray(s.categories) ? s.categories : [])).filter(Boolean)),
        );
        const catMap = new Map<string, string>();
        if (catIds.length) {
          const { data: cats } = await supabase.from("categories").select("id,name").in("id", catIds);
          (cats ?? []).forEach((c) => catMap.set(String(c.id), String(c.name)));
        }
        const enrichedSuppliers = supplierList.map((s) => ({
          ...s,
          category_name: Array.isArray(s.categories) && s.categories[0] ? catMap.get(s.categories[0]) ?? null : null,
        }));

        let nextCounts: Record<string, number> = {};
        if (mappedDeals.length) nextCounts = await fetchDealJoinerCounts(mappedDeals.map((d) => d.id));

        if (!cancelled) {
          setDeals(mappedDeals);
          setCounts(nextCounts);
          setSuppliers(enrichedSuppliers);
        }
      } catch (e) {
        console.error("[Browse] load error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredDeals = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return deals;
    return deals.filter((d) => d.title.toLowerCase().includes(t) || (d.supplier_name ?? "").toLowerCase().includes(t));
  }, [deals, q]);

  const filteredSuppliers = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return suppliers;
    return suppliers.filter((s) => s.business_name.toLowerCase().includes(t) || (s.category_name ?? "").toLowerCase().includes(t));
  }, [suppliers, q]);

  const returnUrl = encodeURIComponent("/browse");

  return (
    <div dir="rtl" className="min-h-screen w-full bg-[#F7F5F0]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#ECEEF2]">
        <div className="mx-auto w-full max-w-[1200px] flex items-center justify-between gap-3 px-4 lg:px-8 h-14">
          <Link to="/" className="flex items-center">
            <BrandLogo />
          </Link>
          <Link to={`/auth?return=${returnUrl}&redirect=${returnUrl}`}>
            <Button variant="premium" className="h-10 px-5 text-[13px] font-bold">
              התחבר / הירשם
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-4 lg:px-8 py-6 space-y-5">
        <div>
          <h1 className="text-[24px] lg:text-[30px] font-extrabold text-[#1F2937] tracking-tight">צפייה חופשית בעסקאות</h1>
          <p className="text-[13px] lg:text-[14px] text-[#6B7280] mt-1">עיינו בהצעות ובספקים — ההצטרפות והשמירה דורשות הרשמה קצרה.</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-[#ECEEF2] rounded-full p-1 inline-flex items-center shadow-[0_2px_10px_-4px_rgba(10,31,61,0.06)]">
          <button
            onClick={() => setTab("deals")}
            className={`px-5 h-10 rounded-full text-[13px] font-bold transition-all ${
              tab === "deals" ? "bg-[#0E6B5A] text-white" : "text-[#6B7280]"
            }`}
          >
            <Tag className="inline h-4 w-4 ml-1" /> עסקאות ({deals.length})
          </button>
          <button
            onClick={() => setTab("suppliers")}
            className={`px-5 h-10 rounded-full text-[13px] font-bold transition-all ${
              tab === "suppliers" ? "bg-[#0E6B5A] text-white" : "text-[#6B7280]"
            }`}
          >
            <Store className="inline h-4 w-4 ml-1" /> ספקים ({suppliers.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === "deals" ? "חיפוש עסקה לפי שם..." : "חיפוש ספק..."}
            className="w-full h-12 rounded-[18px] bg-white border border-[#ECEEF2] pr-11 pl-4 text-[14px] font-medium text-[#1F2937] placeholder:text-[#6B7280] focus:outline-none focus:border-[#0E6B5A] focus:ring-[3px] focus:ring-[#0E6B5A]/15"
          />
        </div>

        {tab === "deals" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {loading && <DealCardSkeletonList count={8} />}
            {!loading && filteredDeals.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-[#ECEEF2] bg-white/60 p-10 text-center">
                <Tag className="h-8 w-8 mx-auto mb-3 text-[#9CA3AF]" />
                <p className="text-[14px] font-bold text-[#1F2937]">אין עסקאות תואמות</p>
              </div>
            )}
            {!loading && filteredDeals.map((d) => (
              <RealDealCard
                key={d.id}
                deal={d}
                joinersCount={counts[d.id] ?? 0}
                to={`/deals/${d.id}`}
                hideFavorite
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-white animate-pulse" />
            ))}
            {!loading && filteredSuppliers.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-[#ECEEF2] bg-white/60 p-10 text-center">
                <Store className="h-8 w-8 mx-auto mb-3 text-[#9CA3AF]" />
                <p className="text-[14px] font-bold text-[#1F2937]">אין ספקים תואמים</p>
              </div>
            )}
            {!loading && filteredSuppliers.map((s) => (
              <Link
                key={s.id}
                to={`/suppliers/${s.id}`}
                className="bg-white rounded-2xl p-4 border border-[#ECEEF2] hover:shadow-[0_8px_24px_-10px_rgba(10,31,61,0.18)] hover:-translate-y-0.5 transition-all flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  {s.logo_url ? (
                    <SmartImg src={s.logo_url} size="logo" alt={s.business_name} className="h-14 w-14 rounded-xl object-cover border border-[#ECEEF2]" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-[#F4F6FA] flex items-center justify-center">
                      <ShieldCheck className="h-6 w-6 text-[#0E6B5A]" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-[14px] text-[#1F2937] truncate">{s.business_name}</h3>
                    {s.category_name && (
                      <p className="text-[11px] text-[#6B7280] truncate">{s.category_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-[#0E6B5A] text-[#0E6B5A]" />
                    <span className="font-bold text-[#1F2937]">מאומת</span>
                  </span>
                  {s.service_areas?.[0] && <span className="truncate max-w-[60%]">{s.service_areas[0]}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Floating CTA */}
        <div className="sticky bottom-4 z-30 pt-6">
          <div className="mx-auto max-w-md bg-[#0E6B5A] text-white rounded-2xl p-4 shadow-[0_12px_32px_-12px_rgba(10,31,61,0.6)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-bold text-[14px]">רוצים להצטרף להצעה?</div>
              <div className="text-[12px] text-white/70">הרשמה מהירה — תחזרו לעמוד הזה אוטומטית.</div>
            </div>
            <Link to={`/auth?return=${returnUrl}&redirect=${returnUrl}`} className="shrink-0">
              <Button variant="premium" className="h-10 px-4 text-[13px] font-bold">הרשמה</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
