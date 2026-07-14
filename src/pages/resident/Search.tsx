import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, Store, X, ChevronLeft, FolderTree } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { BackHeader, SkeletonList, EmptyState } from "@/components/ds";
import { supabase } from "@/integrations/supabase/client";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { Seo } from "@/components/seo/Seo";

type SupplierRow = {
  id: string;
  business_name: string;
  short_description: string | null;
  logo_url: string | null;
};

type CatalogHit = {
  id: string;
  name: string;
  icon: string | null;
  level: number;
  parent_id: string | null;
  path: string | null;
  supplier_count: number;
  score: number;
};

const SUGGESTIONS = ["דלתות", "מזגן", "סולארי", "חשמלאי", "מטבחים", "ריצוף", "אדריכל", "פרגולה"];

function catalogHref(hit: CatalogHit) {
  // Levels 3-4 (subcategory / service) → supplier list for that node
  if (hit.level >= 3) return `/resident/categories/${hit.id}`;
  // Levels 1-2 (domain / category) → also open the node; CategorySuppliers handles empty state
  return `/resident/categories/${hit.id}`;
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogHit[]>([]);
  const [loading, setLoading] = useState(false);
  const term = q.trim();

  useEffect(() => {
    if (!term) { setSuppliers([]); setCatalog([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const [cat, sup] = await Promise.all([
          supabase.rpc("search_catalog", { _q: term }),
          supabase
            .from("suppliers")
            .select("id,business_name,short_description,logo_url,is_active,approval_status")
            .eq("is_active", true)
            .in("approval_status", ["approved", "active"])
            .or(`business_name.ilike.%${term}%,short_description.ilike.%${term}%`)
            .limit(20),
        ]);
        if (cancelled) return;
        setCatalog((cat.data ?? []) as CatalogHit[]);
        setSuppliers((sup.data ?? []) as SupplierRow[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [term]);

  const hasResults = catalog.length + suppliers.length > 0;

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F7F5F0" }}>
      <Seo
        title="חיפוש ספקים ובעלי מקצוע לפי שירות | GroupBuild"
        description="חפשו ספקים, בעלי מקצוע ושירותים לבית החדש — לפי שם, קטגוריה או שירות. ללא הרשמה."
        path="/search"
        noindex
      />
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        <BackHeader title="חיפוש" subtitle="חפש שירותים, קטגוריות וספקים בכל עץ הקטגוריות" />

        {/* Search field */}
        <div className="px-5 mt-2">
          <div className="relative">
            <SearchIcon className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280] pointer-events-none" strokeWidth={2} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="חפש: דלתות, מזגן, סולארי, חשמלאי..."
              className="w-full h-14 rounded-[20px] bg-white border border-[#ECEEF2] pr-12 pl-12 text-[15px] font-medium text-[#1F2937] placeholder:text-[#6B7280] focus:outline-none focus:border-[#0E6B5A] focus:ring-[3px] focus:ring-[#0E6B5A]/15 shadow-[0_4px_16px_-6px_rgba(10,31,61,0.08)] transition"
              dir="rtl"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-[#F7F5F0] flex items-center justify-center active:scale-90 transition-transform"
                aria-label="נקה"
              >
                <X className="h-4 w-4 text-[#6B7280]" strokeWidth={2.4} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-5 mt-5">
          {!term ? (
            <>
              <h2 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">חיפושים פופולריים</h2>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQ(s)}
                    className="h-9 px-4 rounded-full bg-white border border-[#E5E7EB] shadow-[0_2px_8px_-3px_rgba(10,31,61,0.10)] hover:shadow-[0_6px_14px_-6px_rgba(10,31,61,0.18)] text-[13px] font-semibold text-[#1F2937] active:scale-95 transition-[transform,box-shadow]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : loading ? (
            <SkeletonList count={3} itemClassName="h-20" />
          ) : !hasResults ? (
            <EmptyState
              icon={<SearchIcon className="h-7 w-7 text-[#0E6B5A]" />}
              title="לא נמצאו תוצאות"
              description="נסה מילה אחרת או קרובה"
            />
          ) : (
            <div className="space-y-6">
              {catalog.length > 0 && (
                <section>
                  <h2 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">
                    בעץ הקטגוריות ({catalog.length})
                  </h2>
                  <div className="space-y-2.5">
                    {catalog.map((h) => (
                      <Link
                        key={h.id}
                        to={catalogHref(h)}
                        className="flex items-center gap-3 bg-white rounded-[20px] p-3 shadow-[0_4px_12px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] active:scale-[0.99] transition-transform"
                      >
                        <span className="h-11 w-11 rounded-2xl bg-[#0E6B5A]/10 flex items-center justify-center text-xl shrink-0">
                          {h.icon || <FolderTree className="h-5 w-5 text-[#0E6B5A]" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[15px] text-[#1F2937] truncate tracking-tight">{h.name}</p>
                          {h.path && (
                            <p className="text-[11.5px] text-[#6B7280] truncate mt-0.5" dir="rtl">{h.path}</p>
                          )}
                          <p className="text-[11px] text-[#0E6B5A] font-semibold mt-0.5">
                            {h.supplier_count > 0 ? `${h.supplier_count} ספקים` : "בקרוב"}
                          </p>
                        </div>
                        <ChevronLeft className="h-4 w-4 text-[#6B7280] shrink-0" strokeWidth={2.2} />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {suppliers.length > 0 && (
                <section>
                  <h2 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">
                    ספקים ({suppliers.length})
                  </h2>
                  <div className="space-y-2.5">
                    {suppliers.map((s) => (
                      <Link
                        key={s.id}
                        to={`/suppliers/${s.id}`}
                        className="flex items-center gap-3 bg-white rounded-[20px] p-3 shadow-[0_4px_12px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] active:scale-[0.99] transition-transform"
                      >
                        <SupplierLogo logoUrl={s.logo_url} name={s.business_name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[15px] text-[#1F2937] truncate tracking-tight">{s.business_name}</p>
                          {s.short_description && (
                            <p className="text-[12px] text-[#6B7280] truncate mt-0.5">{s.short_description}</p>
                          )}
                        </div>
                        <span className="h-9 w-9 rounded-xl bg-[#0E6B5A]/12 flex items-center justify-center">
                          <Store className="h-4 w-4 text-[#0E6B5A]" strokeWidth={2.2} />
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
      <BottomNav role="resident" />
    </div>
  );
}
