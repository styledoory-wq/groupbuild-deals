import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, X, Compass, HardHat, Plug, DoorOpen, PaintBucket, ChefHat, Trees,
  ChevronLeft, LayoutGrid,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

/* ---------- 7 main stages ---------- */
type StageDef = {
  id: string;
  index: number;
  title: string;
  shortTitle: string;
  ids: string[];
  Icon: typeof Compass;
  accent: string;
  tint: string;
  border: string;
};

const STAGES: StageDef[] = [
  { id: "planning",    index: 1, title: "תכנון ועיצוב",     shortTitle: "תכנון",
    ids: ["architect", "interior-designer", "consultant"],
    Icon: Compass,    accent: "#2F6BFF", tint: "#EAF2FF", border: "#BFD7FF" },
  { id: "structure",   index: 2, title: "שלד ובנייה",        shortTitle: "בנייה",
    ids: ["contractor", "skeleton"],
    Icon: HardHat,    accent: "#E8742C", tint: "#FFF1E4", border: "#FFD4B0" },
  { id: "systems",     index: 3, title: "מערכות הבית",       shortTitle: "מערכות",
    ids: ["electric", "plumbing", "ac", "smart-home"],
    Icon: Plug,       accent: "#0FB5C9", tint: "#E7F8FB", border: "#B5E8EF" },
  { id: "openings",    index: 4, title: "פתחים ואבטחה",      shortTitle: "פתחים",
    ids: ["doors", "security-door", "windows"],
    Icon: DoorOpen,   accent: "#2EA85A", tint: "#E8F7EC", border: "#BFE9C6" },
  { id: "finishes",    index: 5, title: "עבודות גמר",         shortTitle: "גמר",
    ids: ["painting", "flooring", "cladding", "carpentry", "gypsum", "closets", "lighting"],
    Icon: PaintBucket,accent: "#7A4FCF", tint: "#F2ECFB", border: "#D8C9F0" },
  { id: "kitchen-bath",index: 6, title: "מטבחים ואמבטיות",  shortTitle: "מטבח",
    ids: ["kitchen", "bath", "sanitary", "showers"],
    Icon: ChefHat,    accent: "#B07E2E", tint: "#F8F1E4", border: "#E9D9BD" },
  { id: "outdoor",     index: 7, title: "חצר ופיתוח",         shortTitle: "חצר",
    ids: ["garden", "pergola", "cleaning"],
    Icon: Trees,      accent: "#6E8A2E", tint: "#F1F5E4", border: "#D2DEB5" },
];

interface SupplierLite {
  id: string; business_name: string; short_description: string | null;
  logo_url: string | null; categories: string[]; service_areas: string[];
}

const INITIAL_VISIBLE = 4; // cats shown per stage before "show more"

export default function CategoriesList() {
  const { categories } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStage = searchParams.get("stage") || "all";

  const cached = getCachedValue<SupplierLite[]>("categories:suppliers", 5 * 60_000);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>(() => cached ?? []);
  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState<string>(initialStage);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  // top supplier names per category — used as subcategory chips
  const chipsByCat = useMemo(() => {
    const map: Record<string, string[]> = {};
    suppliers.forEach((s) => {
      (s.categories ?? []).forEach((cid) => {
        if (!map[cid]) map[cid] = [];
        if (map[cid].length < 4) map[cid].push(s.business_name);
      });
    });
    return map;
  }, [suppliers]);

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

  const visibleStages = activeStage === "all"
    ? stageGroups
    : stageGroups.filter((g) => g.stage.id === activeStage);

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#E8ECF0" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        <PageHeader size="large" title="בנו את הבית שלכם" subtitle="כל הקטגוריות במקום אחד" />

        {/* Sticky search */}
        <div
          className="sticky z-20 px-5 pt-2 pb-3"
          style={{
            top: "env(safe-area-inset-top)",
            background: "linear-gradient(180deg,#E8ECF0 60%, rgba(247,248,250,0.0))",
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
            {/* === COMPACT 2-ROW MAIN-CATEGORY GRID === */}
            <section className="px-5 mt-1">
              <h2 className="text-[12px] font-extrabold text-[#0A1F3D] tracking-tight mb-2.5">
                כל התחומים
              </h2>

              <div className="grid grid-cols-4 gap-2">
                <FilterTile
                  label="הכל" Icon={LayoutGrid}
                  active={activeStage === "all"}
                  onClick={() => setActiveStage("all")}
                  accent="#0A1F3D" tint="#F4F6FA" border="#ECEEF2"
                />
                {STAGES.map((s) => (
                  <FilterTile
                    key={s.id} label={s.shortTitle} Icon={s.Icon}
                    active={activeStage === s.id}
                    onClick={() => setActiveStage(s.id)}
                    accent={s.accent} tint={s.tint} border={s.border}
                  />
                ))}
              </div>
            </section>

            {/* === STAGE TIMELINE SECTIONS === */}
            <div className="px-3 mt-5 space-y-4">
              {visibleStages.map(({ stage, cats, totalSuppliers }, idx) => (
                <StageSection
                  key={stage.id}
                  stage={stage}
                  cats={cats}
                  totalSuppliers={totalSuppliers}
                  counts={counts}
                  chipsByCat={chipsByCat}
                  nudge={idx === 0}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav role="resident" />
    </div>
  );
}

/* ---------- Sub-components ---------- */

function FilterTile({
  label, Icon, active, onClick, accent, tint, border,
}: {
  label: string;
  Icon: typeof Compass;
  active: boolean;
  onClick: () => void;
  accent: string;
  tint: string;
  border: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-[16px] py-2.5 px-1 transition-all active:scale-[0.96]"
      style={
        active
          ? { background: accent, border: `1px solid ${accent}`, boxShadow: `0 6px 16px -8px ${accent}99` }
          : { background: "#FFFFFF", border: `1px solid ${border}` }
      }
    >
      <div
        className="h-8 w-8 rounded-[10px] flex items-center justify-center"
        style={{ background: active ? "rgba(255,255,255,0.22)" : tint }}
      >
        <Icon className="h-[16px] w-[16px]" strokeWidth={2.3} style={{ color: active ? "#FFFFFF" : accent }} />
      </div>
      <span
        className="text-[11px] font-extrabold leading-tight text-center line-clamp-1"
        style={{ color: active ? "#FFFFFF" : "#0A1F3D" }}
      >
        {label}
      </span>
    </button>
  );
}

function StageSection({
  stage, cats, totalSuppliers, counts, chipsByCat, nudge,
}: {
  stage: StageDef;
  cats: { id: string; name: string; icon: string }[];
  totalSuppliers: number;
  counts: Record<string, number>;
  chipsByCat: Record<string, string[]>;
  nudge: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollIdx, setScrollIdx] = useState(0);
  const cardWidth = 160 + 10; // w + gap

  useEffect(() => {
    if (!nudge || !scrollerRef.current) return;
    const el = scrollerRef.current;
    const t1 = setTimeout(() => el.scrollBy({ left: -40, behavior: "smooth" }), 450);
    const t2 = setTimeout(() => el.scrollBy({ left: 40, behavior: "smooth" }), 950);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [nudge]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    // RTL: scrollLeft is negative or positive depending on browser; use absolute
    const offset = Math.abs(el.scrollLeft);
    setScrollIdx(Math.round(offset / cardWidth));
  };

  const dotCount = Math.min(cats.length, 6);
  const activeDot = Math.min(scrollIdx, dotCount - 1);

  return (
    <section
      className="rounded-[22px] px-2 py-4"
      style={{
        background: `linear-gradient(180deg, ${stage.tint} 0%, ${stage.tint}cc 100%)`,
      }}
    >
      {/* Stage heading */}
      <div className="mb-3 px-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[19px] font-extrabold text-[#0A1F3D] tracking-tight leading-tight">
            {stage.title}
          </h3>
          <p className="mt-1 text-[11.5px] font-bold" style={{ color: stage.accent }}>
            שלב {stage.index} · {totalSuppliers} ספקים פעילים
          </p>
        </div>
        <div
          className="h-10 w-10 shrink-0 rounded-[12px] flex items-center justify-center bg-white shadow-[0_4px_12px_-4px_rgba(10,31,61,0.18)]"
        >
          <stage.Icon className="h-[19px] w-[19px]" strokeWidth={2.3} style={{ color: stage.accent }} />
        </div>
      </div>

      {cats.length === 0 ? (
        <div className="mx-3 bg-white/70 rounded-[16px] p-4 text-center text-[12px] text-[#6B7280] font-medium border border-white">
          קטגוריות יתווספו בקרוב
        </div>
      ) : (
        <>
          <div className="relative">
            <div
              ref={scrollerRef}
              onScroll={onScroll}
              className="flex gap-2.5 overflow-x-auto px-3 pb-1 pt-1 snap-x no-scrollbar scroll-smooth"
              style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
            >
              {cats.map((c) => (
                <div key={c.id} className="snap-start shrink-0 w-[160px]">
                  <CategoryCard
                    id={c.id}
                    name={c.name}
                    icon={c.icon}
                    count={counts[c.id] ?? 0}
                    chips={chipsByCat[c.id] ?? []}
                    stage={stage}
                  />
                </div>
              ))}
              <div className="shrink-0 w-1" />
            </div>
            {/* Edge fades */}
            <div
              className="pointer-events-none absolute top-0 bottom-1 right-0 w-5"
              style={{ background: `linear-gradient(270deg, ${stage.tint}, ${stage.tint}00)` }}
            />
            <div
              className="pointer-events-none absolute top-0 bottom-1 left-0 w-9 flex items-center justify-start pl-1"
              style={{ background: `linear-gradient(90deg, ${stage.tint}, ${stage.tint}00)` }}
            >
              {cats.length > 2 && (
                <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center shadow-[0_3px_8px_rgba(10,31,61,0.18)] animate-pulse">
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: stage.accent }} />
                </div>
              )}
            </div>
          </div>

          {/* Scroll dots indicator */}
          {cats.length > 2 && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {Array.from({ length: dotCount }).map((_, i) => (
                <span
                  key={i}
                  className="rounded-full transition-all duration-200"
                  style={{
                    height: 5,
                    width: i === activeDot ? 14 : 5,
                    background: i === activeDot ? stage.accent : `${stage.accent}40`,
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CategoryCard({
  id, name, icon, count, chips, stage,
}: {
  id: string;
  name: string;
  icon: string;
  count: number;
  chips: string[];
  stage: StageDef;
}) {
  const dim = count === 0;

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-[12px] flex items-center justify-center text-[20px] bg-white shadow-[0_3px_8px_-2px_rgba(10,31,61,0.10)]">
          <span>{icon}</span>
        </div>
        {dim ? (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-white/90 text-[#9CA3AF] shadow-[0_1px_3px_rgba(10,31,61,0.06)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
            בקרוב
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white shadow-[0_1px_3px_rgba(10,31,61,0.08)]"
            style={{ color: stage.accent }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            {count} זמינים
          </span>
        )}
      </div>

      <p className="mt-2.5 text-[13.5px] font-extrabold text-[#0A1F3D] leading-tight tracking-tight line-clamp-2">
        {name}
      </p>
    </>
  );

  const baseStyle: React.CSSProperties = {
    background: "#FFFFFF",
    boxShadow: dim
      ? "0 2px 6px -2px rgba(10,31,61,0.06)"
      : "0 8px 20px -10px rgba(10,31,61,0.18), 0 2px 4px -2px rgba(10,31,61,0.05)",
    height: 124,
    opacity: dim ? 0.62 : 1,
  };

  if (dim) {
    return (
      <div className="relative rounded-[20px] p-3.5 flex flex-col cursor-default" style={baseStyle}>
        {content}
      </div>
    );
  }

  return (
    <Link
      to={`/resident/categories/${id}`}
      className="relative rounded-[20px] p-3.5 flex flex-col transition-all duration-200 ease-out active:scale-[1.02] active:shadow-[0_14px_28px_-10px_rgba(10,31,61,0.28)]"
      style={baseStyle}
    >
      {content}
    </Link>
  );
}
