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
    Icon: Compass,    accent: "#007AFF", tint: "#E8F2FF", border: "#C9E1FF" },
  { id: "structure",   index: 2, title: "שלד ובנייה",        shortTitle: "בנייה",
    ids: ["contractor", "skeleton"],
    Icon: HardHat,    accent: "#FF6B35", tint: "#FFF0EB", border: "#FFD6C4" },
  { id: "systems",     index: 3, title: "מערכות הבית",       shortTitle: "מערכות",
    ids: ["electric", "plumbing", "ac", "smart-home"],
    Icon: Plug,       accent: "#00C7BE", tint: "#E8FAF9", border: "#B3EDE9" },
  { id: "openings",    index: 4, title: "פתחים ואבטחה",      shortTitle: "פתחים",
    ids: ["doors", "security-door", "windows"],
    Icon: DoorOpen,   accent: "#34C759", tint: "#EAF9EE", border: "#C3EBCD" },
  { id: "finishes",    index: 5, title: "עבודות גמר",         shortTitle: "גמר",
    ids: ["painting", "flooring", "cladding", "carpentry", "gypsum", "closets", "lighting"],
    Icon: PaintBucket,accent: "#AF52DE", tint: "#F5ECFB", border: "#E0CAF0" },
  { id: "kitchen-bath",index: 6, title: "מטבחים ואמבטיות",  shortTitle: "מטבח",
    ids: ["kitchen", "bath", "sanitary", "showers"],
    Icon: ChefHat,    accent: "#FF9500", tint: "#FFF5E6", border: "#FFE2B3" },
  { id: "outdoor",     index: 7, title: "חצר ופיתוח",         shortTitle: "חצר",
    ids: ["garden", "pergola", "cleaning"],
    Icon: Trees,      accent: "#8BC34A", tint: "#F1F8E8", border: "#D4E4B8" },
];

interface SupplierLite {
  id: string; business_name: string; short_description: string | null;
  logo_url: string | null; categories: string[]; service_areas: string[];
}

export default function CategoriesList() {
  const { categories } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStage = searchParams.get("stage") || "all";

  const cached = getCachedValue<SupplierLite[]>("categories:suppliers", 5 * 60_000);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>(() => cached ?? []);
  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState<string>(initialStage);

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
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F2F2F7" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        {/* Apple-style page header */}
        <div className="px-5 pt-4 pb-2">
          <h1 className="text-[28px] font-bold tracking-tight text-[#1C1C1E] leading-tight">
            בנו את הבית
          </h1>
          <p className="text-[15px] text-[#8E8E93] mt-1 font-medium">
            כל הקטגוריות במקום אחד
          </p>
        </div>

        {/* Sticky Apple search */}
        <div
          className="sticky z-20 px-5 pt-2 pb-3"
          style={{
            top: "env(safe-area-inset-top)",
            background: "linear-gradient(180deg,#F2F2F7 60%, rgba(242,242,247,0.0))",
            backdropFilter: "saturate(180%) blur(12px)",
            WebkitBackdropFilter: "saturate(180%) blur(12px)",
          }}
        >
          <div className="relative">
            <Search className="h-[18px] w-[18px] absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" strokeWidth={2} />
            <input
              type="text" dir="rtl" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש קטגוריה, ספק או אזור"
              className="w-full h-11 pr-10 pl-10 rounded-2xl bg-[#E5E5EA]/60 border-0 text-[15px] font-medium text-[#1C1C1E] placeholder:text-[#8E8E93] focus:outline-none focus:bg-[#D1D1D6]/40 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute left-2.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#E5E5EA] flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-[#8E8E93]" />
              </button>
            )}
          </div>
        </div>

        {/* Search results */}
        {q && (
          <div className="px-5 mt-2 space-y-2">
            <p className="text-[13px] font-semibold text-[#8E8E93] mb-1">
              {searchResults.length} תוצאות
            </p>
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-3xl p-5 text-center text-[15px] text-[#8E8E93] border border-[#E5E5EA]">
                לא נמצאו תוצאות ל"{search}"
              </div>
            ) : searchResults.map((s) => {
              const catNames = (s.categories ?? [])
                .map((cid) => categories.find((c) => c.id === cid)?.name)
                .filter(Boolean).slice(0, 2).join(" · ");
              return (
                <button key={s.id} onClick={() => navigate(`/suppliers/${s.id}`)}
                  className="w-full bg-white rounded-2xl p-3 border border-[#E5E5EA] flex items-center gap-3 text-right active:scale-[0.99] transition-transform">
                  <SupplierLogo name={s.business_name} logoUrl={s.logo_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] text-[#1C1C1E] truncate">{s.business_name}</p>
                    <p className="text-[13px] text-[#8E8E93] truncate">{catNames || "ספק"}</p>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-[#C7C7CC]" />
                </button>
              );
            })}
          </div>
        )}

        {!q && (
          <>
            {/* === APPLE-STYLE FILTER TILES === */}
            <section className="px-5 mt-2">
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                <FilterTile
                  label="הכל" Icon={LayoutGrid}
                  active={activeStage === "all"}
                  onClick={() => setActiveStage("all")}
                  accent="#1C1C1E" tint="#F2F2F7" border="#E5E5EA"
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

            {/* === STAGE SECTIONS — APPLE CARDS === */}
            <div className="px-5 mt-6 space-y-5">
              {visibleStages.map(({ stage, cats, totalSuppliers }) => (
                <StageSection
                  key={stage.id}
                  stage={stage}
                  cats={cats}
                  totalSuppliers={totalSuppliers}
                  counts={counts}
                  chipsByCat={chipsByCat}
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
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-2.5 px-1 transition-all duration-200 active:scale-[0.95]"
      style={
        active
          ? { background: accent, boxShadow: `0 4px 12px -4px ${accent}66` }
          : { background: "#FFFFFF", border: `1px solid ${border}` }
      }
    >
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center"
        style={{ background: active ? "rgba(255,255,255,0.2)" : tint }}
      >
        <Icon className="h-[16px] w-[16px]" strokeWidth={2.2} style={{ color: active ? "#FFFFFF" : accent }} />
      </div>
      <span
        className="text-[11px] font-semibold leading-tight text-center line-clamp-1"
        style={{ color: active ? "#FFFFFF" : "#1C1C1E" }}
      >
        {label}
      </span>
    </button>
  );
}

function StageSection({
  stage, cats, totalSuppliers, counts, chipsByCat,
}: {
  stage: StageDef;
  cats: { id: string; name: string; icon: string }[];
  totalSuppliers: number;
  counts: Record<string, number>;
  chipsByCat: Record<string, string[]>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollIdx, setScrollIdx] = useState(0);
  const cardWidth = 156 + 10;

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const offset = Math.abs(el.scrollLeft);
    setScrollIdx(Math.round(offset / cardWidth));
  };

  const dotCount = Math.min(cats.length, 6);
  const activeDot = Math.min(scrollIdx, dotCount - 1);

  return (
    <section className="bg-white rounded-3xl p-4 border border-[#E5E5EA] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {/* Stage heading */}
      <div className="mb-3 px-1 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[18px] font-bold text-[#1C1C1E] tracking-tight leading-tight">
            {stage.title}
          </h3>
          <p className="mt-0.5 text-[13px] font-medium" style={{ color: stage.accent }}>
            שלב {stage.index} · {totalSuppliers} ספקים פעילים
          </p>
        </div>
        <div
          className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center"
          style={{ background: stage.tint }}
        >
          <stage.Icon className="h-[20px] w-[20px]" strokeWidth={2.2} style={{ color: stage.accent }} />
        </div>
      </div>

      {cats.length === 0 ? (
        <div className="mx-1 bg-[#F2F2F7] rounded-2xl p-4 text-center text-[13px] text-[#8E8E93] font-medium">
          קטגוריות יתווספו בקרוב
        </div>
      ) : (
        <>
          <div className="relative">
            <div
              ref={scrollerRef}
              onScroll={onScroll}
              className="flex lg:grid lg:grid-cols-4 xl:grid-cols-5 gap-2.5 overflow-x-auto lg:overflow-visible px-1 pb-1 snap-x lg:snap-none no-scrollbar scroll-smooth"
              style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
            >
              {cats.map((c) => (
                <div key={c.id} className="snap-start shrink-0 w-[156px] lg:w-auto">
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
              style={{ background: "linear-gradient(270deg, #FFFFFF, transparent)" }}
            />
            <div
              className="pointer-events-none absolute top-0 bottom-1 left-0 w-9 flex items-center justify-start pl-1"
              style={{ background: "linear-gradient(90deg, #FFFFFF, transparent)" }}
            >
              {cats.length > 2 && (
                <div className="h-6 w-6 rounded-full bg-[#F2F2F7] flex items-center justify-center">
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
                    background: i === activeDot ? stage.accent : "#E5E5EA",
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
        <div className="h-10 w-10 rounded-[12px] flex items-center justify-center text-[20px] bg-[#F2F2F7]">
          <span>{icon}</span>
        </div>
        {dim ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F2F7] text-[#8E8E93]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF9500]" />
            בקרוב
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: stage.tint, color: stage.accent }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#34C759]" />
            {count} זמינים
          </span>
        )}
      </div>
      <p className="mt-2.5 text-[14px] font-semibold text-[#1C1C1E] leading-tight tracking-tight line-clamp-2">
        {name}
      </p>
    </>
  );

  const baseStyle: React.CSSProperties = {
    background: "#FFFFFF",
    border: "1px solid #E5E5EA",
    height: 120,
    opacity: dim ? 0.55 : 1,
  };

  if (dim) {
    return (
      <div className="relative rounded-2xl p-3.5 flex flex-col cursor-default" style={baseStyle}>
        {content}
      </div>
    );
  }

  return (
    <Link
      to={`/resident/categories/${id}`}
      className="relative rounded-2xl p-3.5 flex flex-col transition-all duration-200 ease-out active:scale-[1.02]"
      style={baseStyle}
    >
      {content}
    </Link>
  );
}
