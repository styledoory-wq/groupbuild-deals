import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Search, X, Tag, Users } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { PremiumHeader } from "@/components/layout/PremiumHeader";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

const STAGES: { id: string; title: string; ids: string[] }[] = [
  { id: "planning",  title: "תכנון ועיצוב",       ids: ["architect", "interior-designer", "consultant"] },
  { id: "structure", title: "שלד ובנייה",          ids: ["contractor", "skeleton", "gypsum"] },
  { id: "systems",   title: "מערכות הבית",         ids: ["electric", "plumbing", "ac", "smart-home"] },
  { id: "finishes",  title: "גמרים",                ids: ["windows","doors","security-door","flooring","cladding","painting","kitchen","bath","showers","sanitary","carpentry","closets","lighting"] },
  { id: "furniture", title: "ריהוט והלבשת הבית",  ids: [] },
  { id: "outdoor",   title: "חצר ופיתוח",          ids: ["garden", "pergola", "cleaning"] },
];

const STAGE_BY_ID: Record<string, typeof STAGES[number]> = Object.fromEntries(STAGES.map(s => [s.id, s]));

interface SupplierLite {
  id: string; business_name: string; short_description: string | null;
  logo_url: string | null; categories: string[]; service_areas: string[];
}

export default function CategoriesList() {
  const { categories } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stageId = searchParams.get("stage") || "";
  const view = searchParams.get("view") || "";
  const stage = stageId ? STAGE_BY_ID[stageId] : null;
  const showStageChoice = !!stage && view !== "suppliers";

  const cached = getCachedValue<SupplierLite[]>("categories:suppliers", 5 * 60_000);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>(() => cached ?? []);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await cachedQuery<SupplierLite[]>("categories:suppliers", async () => {
        const { data } = await supabase
          .from("suppliers")
          .select("id,business_name,short_description,logo_url,categories,service_areas")
          .eq("is_active", true).eq("is_deleted", false)
          .in("approval_status", ["approved", "active"])
          .order("business_name");
        return (data as SupplierLite[]) ?? [];
      }, 5 * 60_000);
      if (!cancelled) setSuppliers(data);
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    suppliers.forEach((s) => (s.categories ?? []).forEach((c) => { map[c] = (map[c] ?? 0) + 1; }));
    return map;
  }, [suppliers]);

  const q = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!q) return [];
    return suppliers.filter((s) => {
      const catNames = (s.categories ?? []).map((cid) => categories.find((c) => c.id === cid)?.name?.toLowerCase() ?? "").join(" ");
      return s.business_name.toLowerCase().includes(q)
        || (s.short_description ?? "").toLowerCase().includes(q)
        || (s.service_areas ?? []).some((a) => a.toLowerCase().includes(q))
        || catNames.includes(q);
    }).slice(0, 20);
  }, [q, suppliers, categories]);

  // Categories visible for the current scope
  const visibleCategories = useMemo(() => {
    if (!stage) return categories;
    const allowed = new Set(stage.ids);
    return categories.filter((c) => allowed.has(c.id));
  }, [categories, stage]);

  // Group all categories by stage for hub view
  const groupedByStage = useMemo(() => {
    return STAGES.map((s) => ({
      ...s,
      categories: categories.filter((c) => s.ids.includes(c.id)),
    })).filter((g) => g.categories.length > 0);
  }, [categories]);

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F7F8FA" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        <PremiumHeader
          title={stage ? stage.title : "כל הקטגוריות"}
          subtitle={stage ? "בחרו תחום או צפו בהצעות פעילות" : "מצא את הספק או הקטגוריה שאתה צריך"}
        />

        {/* Search */}
        {!showStageChoice && (
          <div className="px-5 mt-2">
            <div className="relative">
              <Search className="h-[18px] w-[18px] absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280]" strokeWidth={2} />
              <input
                type="text" dir="rtl" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי ספק, קטגוריה או אזור"
                className="w-full h-12 pr-11 pl-10 rounded-[16px] bg-white border border-[#ECEEF2] text-[14px] font-medium text-[#0A1F3D] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#D4AF37] shadow-[0_2px_8px_-4px_rgba(10,31,61,0.05)]"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-[#F4F6FA] flex items-center justify-center">
                  <X className="h-4 w-4 text-[#6B7280]" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stage chooser (entered via dashboard stage click) */}
        {showStageChoice && (
          <div className="px-5 mt-4 space-y-2.5">
            <button
              onClick={() => navigate(`/resident/deals?stage=${stageId}`)}
              className="w-full bg-white rounded-[20px] p-4 border border-[#ECEEF2] flex items-center gap-3 active:scale-[0.99] transition-transform shadow-[0_2px_10px_-6px_rgba(10,31,61,0.06)]"
            >
              <div className="h-12 w-12 rounded-[14px] bg-[#D4AF37]/12 flex items-center justify-center shrink-0">
                <Tag className="h-5 w-5 text-[#D4AF37]" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <h3 className="text-[15px] font-bold text-[#0A1F3D] leading-tight">הצעות קבוצתיות</h3>
                <p className="text-[12.5px] text-[#6B7280] mt-1 font-medium">הצעות פעילות בשלב {stage!.title}</p>
              </div>
              <ChevronLeft className="h-[18px] w-[18px] text-[#9CA3AF]" strokeWidth={2.2} />
            </button>
            <button
              onClick={() => navigate(`/resident/categories?stage=${stageId}&view=suppliers`)}
              className="w-full bg-white rounded-[20px] p-4 border border-[#ECEEF2] flex items-center gap-3 active:scale-[0.99] transition-transform shadow-[0_2px_10px_-6px_rgba(10,31,61,0.06)]"
            >
              <div className="h-12 w-12 rounded-[14px] bg-[#0A1F3D]/8 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-[#0A1F3D]" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <h3 className="text-[15px] font-bold text-[#0A1F3D] leading-tight">ספקים בתחום</h3>
                <p className="text-[12.5px] text-[#6B7280] mt-1 font-medium">בעלי מקצוע וספקים בשלב {stage!.title}</p>
              </div>
              <ChevronLeft className="h-[18px] w-[18px] text-[#9CA3AF]" strokeWidth={2.2} />
            </button>
          </div>
        )}

        {/* Search results */}
        {!showStageChoice && q && (
          <div className="px-5 mt-4 space-y-2">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
              {searchResults.length} ספקים תואמים
            </p>
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-[16px] p-5 text-center text-[13px] text-[#6B7280] border border-[#ECEEF2]">
                לא נמצאו ספקים מתאימים ל"{search}"
              </div>
            ) : searchResults.map((s) => {
              const catNames = (s.categories ?? []).map((cid) => categories.find((c) => c.id === cid)?.name).filter(Boolean).slice(0, 2).join(" · ");
              return (
                <button key={s.id} onClick={() => navigate(`/suppliers/${s.id}`)}
                  className="w-full bg-white rounded-[16px] p-3 border border-[#ECEEF2] flex items-center gap-3 text-right active:scale-[0.99] transition-transform">
                  <SupplierLogo name={s.business_name} logoUrl={s.logo_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-[#0A1F3D] truncate">{s.business_name}</p>
                    <p className="text-[12px] text-[#6B7280] truncate font-medium">{catNames || "ספק"}</p>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-[#9CA3AF]" />
                </button>
              );
            })}
          </div>
        )}

        {/* HUB: all stages with their categories */}
        {!showStageChoice && !q && !stage && (
          <div className="px-5 mt-5 space-y-6">
            {groupedByStage.map((g, gi) => (
              <section key={g.id}>
                <div className="flex items-center justify-between mb-3">
                  <Link to={`/resident/categories?stage=${g.id}`} className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider">
                    הצג הכל ←
                  </Link>
                  <h2 className="text-[16px] font-extrabold text-[#0A1F3D] tracking-tight">
                    <span className="text-[#9CA3AF] font-bold tabular-nums ml-1.5">{gi + 1}.</span>
                    {g.title}
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {g.categories.map((c) => {
                    const count = counts[c.id] ?? 0;
                    return (
                      <Link key={c.id} to={`/resident/categories/${c.id}`}
                        className="bg-white rounded-[18px] p-3.5 border border-[#ECEEF2] flex items-center gap-2.5 active:scale-[0.98] transition-transform shadow-[0_2px_8px_-4px_rgba(10,31,61,0.05)]">
                        <div className="h-10 w-10 rounded-[12px] bg-[#F4F6FA] flex items-center justify-center text-[18px] shrink-0">
                          {c.icon}
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-[13px] font-bold text-[#0A1F3D] truncate leading-tight">{c.name}</p>
                          <p className="text-[11px] text-[#6B7280] mt-0.5 font-medium">
                            {count > 0 ? `${count} ספקים` : "בקרוב"}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Stage category grid */}
        {!showStageChoice && !q && stage && (
          <div className="px-5 mt-5 grid grid-cols-2 gap-3">
            {visibleCategories.map((c) => {
              const count = counts[c.id] ?? 0;
              return (
                <Link key={c.id} to={`/resident/categories/${c.id}`}
                  className="bg-white rounded-[20px] p-4 border border-[#ECEEF2] active:scale-[0.98] transition-transform shadow-[0_2px_10px_-6px_rgba(10,31,61,0.06)]">
                  <div className="h-12 w-12 rounded-[14px] bg-[#F4F6FA] flex items-center justify-center text-[22px] mb-3">{c.icon}</div>
                  <h3 className="text-[14px] font-bold text-[#0A1F3D] leading-tight tracking-tight">{c.name}</h3>
                  <p className="text-[11.5px] text-[#6B7280] mt-1 font-medium">
                    {count > 0 ? `${count} ספקים זמינים` : "אין ספקים כרגע"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav role="resident" />
    </div>
  );
}
