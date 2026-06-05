import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, X, Flame, Compass, HardHat, Plug, DoorOpen,
  PaintBucket, ChefHat, Trees, ChevronLeft,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { PremiumHeader } from "@/components/layout/PremiumHeader";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

/* ---------- Stage definitions ---------- */
type StageDef = {
  id: string;
  index: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  ids: string[];
  Icon: typeof Compass;
  accent: string;
  accentStrong: string;
  tint: string;
};

const STAGES: StageDef[] = [
  { id: "planning",    index: 1, title: "תכנון ועיצוב",      shortTitle: "תכנון",       subtitle: "התחלת המסע — הגדרת החזון",
    ids: ["architect","interior-designer","consultant"],
    Icon: Compass,    accent: "#BFD7FF", accentStrong: "#2F6BFF", tint: "#EAF2FF" },
  { id: "structure",   index: 2, title: "שלד ובנייה",         shortTitle: "בנייה",       subtitle: "יסודות, שלד וקירות",
    ids: ["contractor","skeleton"],
    Icon: HardHat,    accent: "#FFD4B0", accentStrong: "#E8742C", tint: "#FFF1E4" },
  { id: "systems",     index: 3, title: "מערכות הבית",        shortTitle: "מערכות",      subtitle: "חשמל, מים ומיזוג",
    ids: ["electric","plumbing","ac","smart-home"],
    Icon: Plug,       accent: "#B5E8EF", accentStrong: "#0FB5C9", tint: "#E7F8FB" },
  { id: "openings",    index: 4, title: "פתחים ואבטחה",       shortTitle: "פתחים",       subtitle: "דלתות, חלונות ואבטחה",
    ids: ["doors","security-door","windows"],
    Icon: DoorOpen,   accent: "#BFE9C6", accentStrong: "#2EA85A", tint: "#E8F7EC" },
  { id: "finishes",    index: 5, title: "עבודות גמר",          shortTitle: "גמר",         subtitle: "צבע, ריצוף, חיפוי ונגרות",
    ids: ["painting","flooring","cladding","carpentry","gypsum","closets","lighting"],
    Icon: PaintBucket,accent: "#D8C9F0", accentStrong: "#7A4FCF", tint: "#F2ECFB" },
  { id: "kitchen-bath",index: 6, title: "מטבחים ואמבטיות",   shortTitle: "מטבח ואמבט",  subtitle: "המרחבים הרטובים של הבית",
    ids: ["kitchen","bath","sanitary","showers"],
    Icon: ChefHat,    accent: "#E9D9BD", accentStrong: "#B07E2E", tint: "#F8F1E4" },
  { id: "outdoor",     index: 7, title: "חצר ופיתוח",          shortTitle: "חצר",         subtitle: "גינה, פרגולות וסיום",
    ids: ["garden","pergola","cleaning"],
    Icon: Trees,      accent: "#D2DEB5", accentStrong: "#6E8A2E", tint: "#F1F5E4" },
];

interface SupplierLite {
  id: string; business_name: string; short_description: string | null;
  logo_url: string | null; categories: string[]; service_areas: string[];
  created_at?: string;
}

const INITIAL_VISIBLE = 4; // categories per stage before "show more"

export default function CategoriesList() {
  const { categories } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStage = searchParams.get("stage") || "";

  const cached = getCachedValue<SupplierLite[]>("categories:suppliers", 5 * 60_000);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>(() => cached ?? []);
  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState<string>(initialStage || "all");
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await cachedQuery<SupplierLite[]>("categories:suppliers", async () => {
        const { data } = await supabase
          .from("suppliers")
          .select("id,business_name,short_description,logo_url,categories,service_areas,created_at")
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

  /* Build subcategory chips per category (top supplier names) */
  const subcategoriesByCat = useMemo(() => {
    const map: Record<string, string[]> = {};
    categories.forEach((cat) => {
      const names = suppliers
        .filter((s) => (s.categories ?? []).includes(cat.id))
        .map((s) => s.business_name)
        .slice(0, 6);
      map[cat.id] = names;
    });
    return map;
  }, [categories, suppliers]);

  const q = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!q) return [];
    return suppliers.filter((s) => {
      const catNames = (s.categories ?? [])
        .map((cid) => categories.find((c) => c.id === cid)?.name?.toLowerCase() ?? "").join(" ");
      return s.business_name.toLowerCase().includes(q)
        || (s.short_description ?? "").toLowerCase().includes(q)
        || (s.service_areas ?? []).some((a) => a.toLowerCase().includes(q))
        || catNames.includes(q);
    }).slice(0, 20);
  }, [q, suppliers, categories]);

  const stageGroups = useMemo(() => {
    return STAGES.map((s) => {
      const cats = s.ids
        .map((id) => categories.find((c) => c.id === id))
        .filter(Boolean) as { id: string; name: string; icon: string }[];
      const totalSuppliers = cats.reduce((sum, c) => sum + (counts[c.id] ?? 0), 0);
      return { stage: s, cats, totalSuppliers };
    });
  }, [categories, counts]);

  const visibleStages = activeStage === "all" ? stageGroups : stageGroups.filter((g) => g.stage.id === activeStage);

  const toggleExpand = (id: string) =>
    setExpandedStages((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F7F8FA" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        <PremiumHeader
          title="בנו את הבית שלכם"
          subtitle="כל הקטגוריות במקום אחד"
        />

        {/* Sticky search */}
        <div
          className="sticky z-20 px-5 pt-2 pb-3"
          style={{
            top: "env(safe-area-inset-top)",
            background: "linear-gradient(180deg,#F7F8FA 60%, rgba(247,248,250,0.0))",
            backdropFilter: "saturate(180%) blur(8px)",
            WebkitBackdropFilter: "saturate(180%) blur(8px)",
          }}
        >
          <div className="relative">
            <Search className="h-[18px] w-[18px] absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280]" strokeWidth={2} />
            <input
              type="text" dir="rtl" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש קטגוריה, ספק או אזור"
              className="w-full h-12 pr-11 pl-10 rounded-[16px] bg-white border border-[#ECEEF2] text-[14px] font-medium text-[#0A1F3D] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#D4AF37] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-[#F4F6FA] flex items-center justify-center">
                <X className="h-4 w-4 text-[#6B7280]" />
              </button>
            )}
          </div>
        </div>

        {/* Search results */}
        {q && (
          <div className="px-5 mt-2 space-y-2">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
              {searchResults.length} תוצאות
            </p>
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-[16px] p-5 text-center text-[13px] text-[#6B7280] border border-[#ECEEF2]">
                לא נמצאו תוצאות ל"{search}"
              </div>
            ) : searchResults.map((s) => {
              const catNames = (s.categories ?? [])
                .map((cid) => categories.find((c) => c.id === cid)?.name)
                .filter(Boolean).slice(0, 2).join(" · ");
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

        {!q && (
          <>
            {/* === COMPACT MAIN-CATEGORY GRID (App Store / Wolt style) === */}
            <section className="px-5 mt-1">
              <div className="grid grid-cols-4 gap-2.5">
                {/* "All" tile */}
                <button
                  onClick={() => setActiveStage("all")}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-[18px] py-3 px-2 transition-all active:scale-[0.96] ${
                    activeStage === "all"
                      ? "bg-[#0A1F3D] text-white shadow-[0_6px_18px_-8px_rgba(10,31,61,0.45)]"
                      : "bg-white text-[#0A1F3D] border border-[#ECEEF2]"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-[12px] flex items-center justify-center text-[16px] font-extrabold ${
                    activeStage === "all" ? "bg-white/15" : "bg-[#F4F6FA]"
                  }`}>
                    <Flame className="h-[18px] w-[18px]" strokeWidth={2.4} />
                  </div>
                  <span className="text-[11.5px] font-bold leading-tight">הכל</span>
                </button>

                {STAGES.map((s) => {
                  const Icon = s.Icon;
                  const active = activeStage === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveStage(s.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-[18px] py-3 px-1.5 transition-all active:scale-[0.96] ${
                        active
                          ? "text-[#0A1F3D] shadow-[0_6px_18px_-8px_rgba(10,31,61,0.25)]"
                          : "bg-white text-[#0A1F3D] border border-[#ECEEF2]"
                      }`}
                      style={active ? { background: s.tint, border: `1px solid ${s.accent}` } : undefined}
                    >
                      <div
                        className="h-9 w-9 rounded-[12px] flex items-center justify-center"
                        style={{ background: active ? "rgba(255,255,255,0.8)" : s.tint }}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} style={{ color: s.accentStrong }} />
                      </div>
                      <span className="text-[11px] font-bold leading-tight text-center line-clamp-1">{s.shortTitle}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* === STAGE SECTIONS — CARDS GRID === */}
            <div className="px-5 mt-6 space-y-7">
              {visibleStages.map(({ stage, cats, totalSuppliers }) => {
                const Icon = stage.Icon;
                const expanded = !!expandedStages[stage.id];
                const visibleCats = expanded ? cats : cats.slice(0, INITIAL_VISIBLE);
                const hasMore = cats.length > INITIAL_VISIBLE;

                return (
                  <section key={stage.id}>
                    {/* Stage heading */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="h-10 w-10 rounded-[14px] flex items-center justify-center shrink-0"
                        style={{ background: stage.tint, boxShadow: `inset 0 0 0 1px ${stage.accent}` }}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2.3} style={{ color: stage.accentStrong }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold tracking-[0.08em] uppercase" style={{ color: stage.accentStrong }}>
                            שלב {stage.index}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-[#D1D5DB]" />
                          <span className="text-[10px] font-bold text-[#6B7280]">{totalSuppliers} ספקים</span>
                        </div>
                        <h3 className="text-[16px] font-extrabold text-[#0A1F3D] tracking-tight leading-tight mt-0.5">
                          {stage.title}
                        </h3>
                      </div>
                    </div>

                    {/* Category cards grid */}
                    {cats.length === 0 ? (
                      <div className="bg-white rounded-[18px] p-4 text-center text-[12px] text-[#6B7280] font-medium border border-[#ECEEF2]">
                        קטגוריות יתווספו בקרוב
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          {visibleCats.map((c) => {
                            const n = counts[c.id] ?? 0;
                            const chips = subcategoriesByCat[c.id] ?? [];
                            return (
                              <Link
                                key={c.id}
                                to={`/resident/categories/${c.id}`}
                                className="relative rounded-[20px] p-3.5 active:scale-[0.97] transition-transform overflow-hidden flex flex-col min-h-[148px]"
                                style={{
                                  background: `linear-gradient(180deg, ${stage.tint} 0%, #FFFFFF 70%)`,
                                  border: `1px solid ${stage.accent}`,
                                  boxShadow: "0 3px 14px -8px rgba(10,31,61,0.12)",
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="h-11 w-11 rounded-[14px] bg-white/85 backdrop-blur flex items-center justify-center text-[22px] shadow-[0_1px_4px_rgba(10,31,61,0.06)]">
                                    {c.icon}
                                  </div>
                                  {n > 0 && (
                                    <span
                                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                                      style={{ background: "#FFFFFF", color: stage.accentStrong, border: `1px solid ${stage.accent}` }}
                                    >
                                      {n}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2.5 text-[14px] font-extrabold text-[#0A1F3D] leading-tight tracking-tight">
                                  {c.name}
                                </p>
                                <p className="text-[11px] text-[#6B7280] mt-0.5 font-semibold">
                                  {n > 0 ? `${n} ספקים זמינים` : "בקרוב"}
                                </p>

                                {/* Subcategory chips */}
                                {chips.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1 overflow-hidden" style={{ maxHeight: 44 }}>
                                    {chips.slice(0, 3).map((name, i) => (
                                      <span
                                        key={i}
                                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/80 text-[#475569] border border-white truncate max-w-[88px]"
                                      >
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </Link>
                            );
                          })}
                        </div>

                        {hasMore && (
                          <button
                            onClick={() => toggleExpand(stage.id)}
                            className="w-full mt-3 h-10 rounded-full bg-white border border-[#ECEEF2] text-[12.5px] font-bold text-[#0A1F3D] active:scale-[0.98] transition-transform shadow-[0_2px_8px_-4px_rgba(10,31,61,0.08)]"
                          >
                            {expanded ? "הצג פחות" : `הצג עוד (${cats.length - INITIAL_VISIBLE})`}
                          </button>
                        )}
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      <BottomNav role="resident" />
    </div>
  );
}
