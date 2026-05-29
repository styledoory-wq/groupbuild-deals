import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, Store } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";

type SupplierRow = {
  id: string;
  business_name: string;
  short_description: string | null;
  logo_url: string | null;
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"deals" | "suppliers">("deals");
  const [deals, setDeals] = useState<RealDealCardData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(false);

  const term = q.trim();

  useEffect(() => {
    if (!term) {
      setDeals([]);
      setSuppliers([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        if (tab === "deals") {
          const { data } = await supabase
            .from("deals")
            .select(
              "id,title,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,cover_image_url,gallery_images,visibility_type,visibility_project_id,target_participants,join_deadline,redemption_deadline,auto_closed_at,suppliers!inner(business_name,logo_url,is_active,approval_status)"
            )
            .eq("status", "active")
            .ilike("title", `%${term}%`)
            .limit(40);
          if (cancelled) return;
          const rows = (data ?? []) as Array<Record<string, unknown>>;
          const mapped: RealDealCardData[] = rows
            .filter((r) => {
              const s = r.suppliers as { is_active?: boolean; approval_status?: string } | null;
              return !!s && s.is_active === true && (s.approval_status === "approved" || s.approval_status === "active");
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
                tiers: (r.tiers as never) ?? null,
                ends_at: (r.ends_at as string | null) ?? null,
                visibility_type: (r.visibility_type as string | null) ?? null,
                visibility_project_id: (r.visibility_project_id as string | null) ?? null,
                cover_image_url: (r.cover_image_url as string | null) ?? null,
                gallery_images: (r.gallery_images as string[] | null) ?? null,
                target_participants: (r.target_participants as number | null) ?? null,
                join_deadline: (r.join_deadline as string | null) ?? null,
                redemption_deadline: (r.redemption_deadline as string | null) ?? null,
                auto_closed_at: (r.auto_closed_at as string | null) ?? null,
              };
            });
          setDeals(mapped);
        } else {
          const { data } = await supabase
            .from("suppliers")
            .select("id,business_name,short_description,logo_url,is_active,approval_status")
            .eq("is_active", true)
            .in("approval_status", ["approved", "active"])
            .or(`business_name.ilike.%${term}%,short_description.ilike.%${term}%`)
            .limit(40);
          if (cancelled) return;
          setSuppliers((data ?? []) as SupplierRow[]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term, tab]);

  const showEmpty = !term;

  return (
    <MobileShell>
      <PageHeader title="חיפוש" subtitle="עסקאות, ספקים ובעלי מקצוע" />
      <div className="px-5 pb-28 space-y-4">
        <div className="relative">
          <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חפש עסקאות, ספקים, בעלי מקצוע..."
            className="w-full h-12 rounded-2xl bg-white border border-[#E2E8F0] pr-11 pl-4 text-fs-base text-[#0D1B2E] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#C9A84C] focus:ring-[3px] focus:ring-[#C9A84C]/15 transition"
            dir="rtl"
          />
        </div>

        <div className="flex gap-2 bg-white border border-[#E2E8F0] rounded-2xl p-1">
          {([
            { id: "deals", label: "עסקאות" },
            { id: "suppliers", label: "ספקים" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 h-10 rounded-xl text-fs-sm font-semibold transition ${
                tab === t.id
                  ? "bg-[#0D1B2E] text-white"
                  : "text-[#475569] hover:text-[#0D1B2E]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {showEmpty ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-[#94A3B8]">
            <div className="h-16 w-16 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center mb-4">
              <SearchIcon className="h-7 w-7 text-[#C9A84C]" />
            </div>
            <p className="text-fs-base font-semibold text-[#475569]">התחל לחפש...</p>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            <div className="h-28 gb-skeleton rounded-2xl" />
            <div className="h-28 gb-skeleton rounded-2xl" />
          </div>
        ) : tab === "deals" ? (
          deals.length === 0 ? (
            <p className="text-center text-[#94A3B8] py-12 text-fs-sm">לא נמצאו עסקאות</p>
          ) : (
            <div className="space-y-4">
              {deals.map((d) => (
                <RealDealCard key={d.id} deal={d} />
              ))}
            </div>
          )
        ) : suppliers.length === 0 ? (
          <p className="text-center text-[#94A3B8] py-12 text-fs-sm">לא נמצאו ספקים</p>
        ) : (
          <div className="space-y-3">
            {suppliers.map((s) => (
              <Link
                key={s.id}
                to={`/suppliers/${s.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-[#E2E8F0] shadow-[0_4px_14px_-8px_rgba(15,30,60,0.08)] hover:border-[#C9A84C]/40 transition"
              >
                <SupplierLogo logoUrl={s.logo_url} name={s.business_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-fs-base text-[#0D1B2E] truncate">{s.business_name}</p>
                  {s.short_description && (
                    <p className="text-fs-xs text-[#64748B] truncate">{s.short_description}</p>
                  )}
                </div>
                <Store className="h-5 w-5 text-[#C9A84C]" />
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav role="resident" />
    </MobileShell>
  );
}
