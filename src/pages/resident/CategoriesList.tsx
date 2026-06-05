import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronDown, Search, X, Flame, Compass, HardHat, Plug, DoorOpen,
  PaintBucket, ChefHat, Trees, ChevronLeft,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { PremiumHeader } from "@/components/layout/PremiumHeader";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

/* ---------- Stage definitions (7 stages, Apple/Wolt premium) ---------- */
type StageDef = {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  ids: string[];
  Icon: typeof Compass;
  /** soft pastel accent for tints/borders */
  accent: string;
  /** stronger color for icon/progress */
  accentStrong: string;
  /** very soft background tint */
  tint: string;
};

const STAGES: StageDef[] = [
  { id: "planning",   index: 1, title: "תכנון ועיצוב",      subtitle: "התחלת המסע — הגדרת החזון",
    ids: ["architect","interior-designer","consultant"],
    Icon: Compass,    accent: "#BFD7FF", accentStrong: "#2F6BFF", tint: "#EAF2FF" },
  { id: "structure",  index: 2, title: "שלד ובנייה",         subtitle: "יסודות, שלד וקירות",
    ids: ["contractor","skeleton"],
    Icon: HardHat,    accent: "#FFD4B0", accentStrong: "#E8742C", tint: "#FFF1E4" },
  { id: "systems",    index: 3, title: "מערכות הבית",        subtitle: "חשמל, מים ומיזוג",
    ids: ["electric","plumbing","ac","smart-home"],
    Icon: Plug,       accent: "#B5E8EF", accentStrong: "#0FB5C9", tint: "#E7F8FB" },
  { id: "openings",   index: 4, title: "פתחים ואבטחה",       subtitle: "דלתות, חלונות ואבטחה",
    ids: ["doors","security-door","windows"],
    Icon: DoorOpen,   accent: "#BFE9C6", accentStrong: "#2EA85A", tint: "#E8F7EC" },
  { id: "finishes",   index: 5, title: "עבודות גמר",          subtitle: "צבע, ריצוף, חיפוי ונגרות",
    ids: ["painting","flooring","cladding","carpentry","gypsum","closets","lighting"],
    Icon: PaintBucket,accent: "#D8C9F0", accentStrong: "#7A4FCF", tint: "#F2ECFB" },
  { id: "kitchen-bath",index: 6, title: "מטבחים ואמבטיות",   subtitle: "המרחבים הרטובים של הבית",
    ids: ["kitchen","bath","sanitary","showers"],
    Icon: ChefHat,    accent: "#E9D9BD", accentStrong: "#B07E2E", tint: "#F8F1E4" },
  { id: "outdoor",    index: 7, title: "חצר ופיתוח",          subtitle: "גינה, פרגולות וסיום",
    ids: ["garden","pergola","cleaning"],
    Icon: Trees,      accent: "#D2DEB5", accentStrong: "#6E8A2E", tint: "#F1F5E4" },
];

const QUICK_FILTERS = [
  { id: "all",     label: "הכל" },
  { id: "popular", label: "פופולרי" },
  { id: "nearby",  label: "באזורך" },
  { id: "new",     label: "חדש" },
  { id: "deals",   label: "מבצעים" },
];

/* ---------- Data ---------- */
interface SupplierLite {
  id: string; business_name: string; short_description: string | null;
  logo_url: string | null; categories: string[]; service_areas: string[];
  created_at?: string;
}

export default function CategoriesList() {
  const { categories } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStage = searchParams.get("stage") || "";

  const cached = getCachedValue<SupplierLite[]>("categories:suppliers", 5 * 60_000);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>(() => cached ?? []);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    STAGES.forEach((s) => { base[s.id] = true; }); // start expanded — premium feel
    if (initialStage) base[initialStage] = true;
    return base;
  });

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

  /* counts per category */
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    suppliers.forEach((s) => (s.categories ?? []).forEach((c) => { map[c] = (map[c] ?? 0) + 1; }));
    return map;
  }, [suppliers]);

  /* popular (top by supplier count) */
  const popular = useMemo(() => {
    return [...categories]
      .map((c) => ({ c, n: counts[c.id] ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
  }, [categories, counts]);

  /* search */
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

  /* grouped stages with their categories + stats */
  const stageGroups = useMemo(() => {
    return STAGES.map((s) => {
      const cats = s.ids
        .map((id) => categories.find((c) => c.id === id))
        .filter(Boolean) as { id: string; name: string; icon: string }[];
      const withSuppliers = cats.filter((c) => (counts[c.id] ?? 0) > 0).length;
      const totalSuppliers = cats.reduce((sum, c) => sum + (counts[c.id] ?? 0), 0);
      const progress = cats.length ? Math.round((withSuppliers / cats.length) * 100) : 0;
      return { stage: s, cats, withSuppliers, totalSuppliers, progress };
    });
  }, [categories, counts]);

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F7F8FA" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        <PremiumHeader
          title="בנו את הבית שלכם"
          subtitle="שלב אחר שלב — מהתכנון ועד למפתח"
        />

        {/* Sticky search + quick filters */}
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

          <div className="mt-3 -mx-5 px-5 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 w-max">
              {QUICK_FILTERS.map((f) => {
                const active = quickFilter === f.id;
                return (
                  <button key={f.id} onClick={() => setQuickFilter(f.id)}
                    className={`h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${
                      active
                        ? "bg-[#0A1F3D] text-white shadow-[0_4px_12px_-4px_rgba(10,31,61,0.4)]"
                        : "bg-white text-[#0A1F3D] border border-[#ECEEF2]"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
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
            {/* Popular near you */}
            {popular.length > 0 && (
              <section className="mt-3">
                <div className="px-5 flex items-center justify-between mb-3">
                  <h2 className="text-[16px] font-extrabold text-[#0A1F3D] tracking-tight flex items-center gap-1.5">
                    <Flame className="h-[18px] w-[18px] text-[#E8742C]" strokeWidth={2.4} />
                    פופולרי באזורך
                  </h2>
                </div>
                <div className="overflow-x-auto no-scrollbar -mx-1 px-4">
                  <div className="flex gap-2.5 w-max pb-1">
                    {popular.map(({ c, n }) => (
                      <Link key={c.id} to={`/resident/categories/${c.id}`}
                        className="w-[140px] shrink-0 bg-white rounded-[18px] p-3.5 border border-[#ECEEF2] active:scale-[0.98] transition-transform shadow-[0_2px_10px_-6px_rgba(10,31,61,0.08)]">
                        <div className="h-11 w-11 rounded-[14px] bg-[#F4F6FA] flex items-center justify-center text-[22px] mb-2.5">
                          {c.icon}
                        </div>
                        <p className="text-[13.5px] font-bold text-[#0A1F3D] leading-tight truncate">{c.name}</p>
                        <p className="text-[11px] text-[#6B7280] mt-1 font-semibold">{n} ספקים</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Journey intro */}
            <div className="px-5 mt-6 mb-3">
              <h2 className="text-[17px] font-extrabold text-[#0A1F3D] tracking-tight">מסע הבנייה שלכם</h2>
              <p className="text-[12.5px] text-[#6B7280] mt-1 font-medium">7 שלבים מסודרים — לחצו על שלב כדי לפתוח</p>
            </div>

            {/* Stage sections */}
            <div className="px-5 space-y-3">
              {stageGroups.map(({ stage, cats, withSuppliers, totalSuppliers, progress }) => {
                const open = !!expanded[stage.id];
                const Icon = stage.Icon;
                return (
                  <section key={stage.id}
                    className="rounded-[22px] overflow-hidden border border-[#ECEEF2] bg-white shadow-[0_2px_14px_-8px_rgba(10,31,61,0.08)]">
                    {/* Header */}
                    <button
                      onClick={() => toggle(stage.id)}
                      className="w-full p-4 flex items-center gap-3 text-right active:bg-[#FAFBFC] transition-colors"
                    >
                      <div
                        className="h-14 w-14 rounded-[18px] flex items-center justify-center shrink-0"
                        style={{ background: stage.tint, boxShadow: `inset 0 0 0 1px ${stage.accent}` }}
                      >
                        <Icon className="h-6 w-6" strokeWidth={2.2} style={{ color: stage.accentStrong }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] font-extrabold tracking-[0.08em] uppercase"
                                style={{ color: stage.accentStrong }}>
                            שלב {stage.index}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-[#D1D5DB]" />
                          <span className="text-[10.5px] font-bold text-[#6B7280]">
                            {totalSuppliers} ספקים
                          </span>
                        </div>
                        <h3 className="text-[16px] font-extrabold text-[#0A1F3D] tracking-tight leading-tight mt-0.5">
                          {stage.title}
                        </h3>
                        <p className="text-[12px] text-[#6B7280] mt-0.5 font-medium truncate">{stage.subtitle}</p>

                        {/* Progress */}
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#F0F2F5] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${progress}%`, background: stage.accentStrong }}
                            />
                          </div>
                          <span className="text-[10.5px] font-bold tabular-nums" style={{ color: stage.accentStrong }}>
                            {withSuppliers}/{cats.length}
                          </span>
                        </div>
                      </div>
                      <ChevronDown
                        className="h-5 w-5 text-[#9CA3AF] shrink-0 transition-transform duration-300"
                        style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
                        strokeWidth={2.2}
                      />
                    </button>

                    {/* Expandable content */}
                    {open && cats.length > 0 && (
                      <div className="px-3 pb-3 grid grid-cols-2 gap-2.5">
                        {cats.map((c) => {
                          const n = counts[c.id] ?? 0;
                          return (
                            <Link key={c.id} to={`/resident/categories/${c.id}`}
                              className="relative rounded-[16px] p-3 active:scale-[0.97] transition-transform overflow-hidden"
                              style={{
                                background: `linear-gradient(180deg, ${stage.tint} 0%, #FFFFFF 100%)`,
                                border: `1px solid ${stage.accent}`,
                                boxShadow: "0 2px 10px -6px rgba(10,31,61,0.10)",
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div
                                  className="h-10 w-10 rounded-[12px] bg-white/80 backdrop-blur flex items-center justify-center text-[20px] shadow-[0_1px_4px_rgba(10,31,61,0.05)]"
                                >
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
                              <p className="mt-2.5 text-[13.5px] font-extrabold text-[#0A1F3D] leading-tight tracking-tight">
                                {c.name}
                              </p>
                              <p className="text-[11px] text-[#6B7280] mt-0.5 font-semibold">
                                {n > 0 ? `${n} ספקים זמינים` : "בקרוב"}
                              </p>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {open && cats.length === 0 && (
                      <div className="px-4 pb-4 -mt-1 text-[12px] text-[#6B7280] font-medium">
                        קטגוריות בשלב זה יתווספו בקרוב
                      </div>
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
