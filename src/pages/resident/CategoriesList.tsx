import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, X, Compass, HardHat, Plug, DoorOpen, PaintBucket, ChefHat, Trees,
  ChevronLeft,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

const URBANIST = "'Urbanist', system-ui, sans-serif";
const EPILOGUE = "'Epilogue', system-ui, sans-serif";


/* ---------- Stages with per-stage color tokens ---------- */
type StageColors = {
  chipBg: string; chipText: string; chipBorder: string;
  bar: string; tagBg: string; tagText: string;
  cardBorder: string; iconBg: string; iconText: string;
  iconHover: string;
};

type StageDef = {
  id: string;
  index: number;
  title: string;
  shortTitle: string;
  ids: string[];
  Icon: typeof Compass;
  colors: StageColors;
};

const STAGES: StageDef[] = [
  { id: "planning", index: 1, title: "תכנון ואדריכלות", shortTitle: "תכנון",
    ids: ["architect", "interior-designer", "consultant"], Icon: Compass,
    colors: { chipBg:"bg-blue-100", chipText:"text-blue-700", chipBorder:"border-blue-200",
      bar:"bg-blue-500", tagBg:"bg-blue-50", tagText:"text-blue-600",
      cardBorder:"border-blue-100", iconBg:"bg-blue-50", iconText:"text-blue-600", iconHover:"group-hover:bg-blue-100" } },
  { id: "structure", index: 2, title: "שלד ובנייה", shortTitle: "שלד",
    ids: ["contractor", "skeleton"], Icon: HardHat,
    colors: { chipBg:"bg-orange-100", chipText:"text-orange-700", chipBorder:"border-orange-200",
      bar:"bg-orange-500", tagBg:"bg-orange-50", tagText:"text-orange-600",
      cardBorder:"border-orange-100", iconBg:"bg-orange-50", iconText:"text-orange-600", iconHover:"group-hover:bg-orange-100" } },
  { id: "systems", index: 3, title: "מערכות הבית", shortTitle: "מערכות",
    ids: ["electric", "plumbing", "ac", "smart-home"], Icon: Plug,
    colors: { chipBg:"bg-teal-100", chipText:"text-teal-700", chipBorder:"border-teal-200",
      bar:"bg-teal-500", tagBg:"bg-teal-50", tagText:"text-teal-600",
      cardBorder:"border-teal-100", iconBg:"bg-teal-50", iconText:"text-teal-600", iconHover:"group-hover:bg-teal-100" } },
  { id: "openings", index: 4, title: "פתחים ואבטחה", shortTitle: "פתחים",
    ids: ["doors", "security-door", "windows"], Icon: DoorOpen,
    colors: { chipBg:"bg-green-100", chipText:"text-green-700", chipBorder:"border-green-200",
      bar:"bg-green-500", tagBg:"bg-green-50", tagText:"text-green-600",
      cardBorder:"border-green-100", iconBg:"bg-green-50", iconText:"text-green-600", iconHover:"group-hover:bg-green-100" } },
  { id: "finishes", index: 5, title: "עבודות גמר", shortTitle: "גמר",
    ids: ["painting", "flooring", "cladding", "carpentry", "gypsum", "closets", "lighting"], Icon: PaintBucket,
    colors: { chipBg:"bg-purple-100", chipText:"text-purple-700", chipBorder:"border-purple-200",
      bar:"bg-purple-500", tagBg:"bg-purple-50", tagText:"text-purple-600",
      cardBorder:"border-purple-100", iconBg:"bg-purple-50", iconText:"text-purple-600", iconHover:"group-hover:bg-purple-100" } },
  { id: "kitchen-bath", index: 6, title: "מטבחים ואמבטיות", shortTitle: "מטבח",
    ids: ["kitchen", "bath", "sanitary", "showers"], Icon: ChefHat,
    colors: { chipBg:"bg-amber-100", chipText:"text-amber-700", chipBorder:"border-amber-200",
      bar:"bg-amber-500", tagBg:"bg-amber-50", tagText:"text-amber-600",
      cardBorder:"border-amber-100", iconBg:"bg-amber-50", iconText:"text-amber-600", iconHover:"group-hover:bg-amber-100" } },
  { id: "outdoor", index: 7, title: "חצר ופיתוח", shortTitle: "חצר",
    ids: ["garden", "pergola", "cleaning"], Icon: Trees,
    colors: { chipBg:"bg-lime-100", chipText:"text-lime-700", chipBorder:"border-lime-200",
      bar:"bg-lime-500", tagBg:"bg-lime-50", tagText:"text-lime-600",
      cardBorder:"border-lime-100", iconBg:"bg-lime-50", iconText:"text-lime-600", iconHover:"group-hover:bg-lime-100" } },
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
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full"
      style={{ background: "#FBF8F3", fontFamily: EPILOGUE, color: "#2D2D2D" }}
    >
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] px-5 pt-[calc(env(safe-area-inset-top)+24px)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        {/* Title */}
        <h1
          className="text-[30px] font-extrabold tracking-tight mb-4 text-[#1A1A1A] leading-tight"
          style={{ fontFamily: URBANIST }}
        >
          קטגוריות
        </h1>

        {/* Search */}
        <div className="relative flex items-center mb-5">
          <input
            type="text" dir="rtl" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש איש מקצוע..."
            className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pr-11 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm shadow-black/5"
          />
          <Search className="absolute right-4 h-5 w-5 text-gray-400" strokeWidth={2.5} />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute left-3 h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center"
              aria-label="נקה"
            >
              <X className="h-3.5 w-3.5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-nowrap overflow-x-auto gap-2 no-scrollbar pb-2 -mx-5 px-5 mb-6">
          <FilterChip
            label="הכל" active={activeStage === "all"}
            onClick={() => setActiveStage("all")}
            activeClass="bg-[#1A1A1A] text-white border-transparent"
            idleClass="bg-white border border-gray-200 text-gray-700"
          />
          {STAGES.map((s) => (
            <FilterChip
              key={s.id} label={s.shortTitle}
              active={activeStage === s.id}
              onClick={() => setActiveStage(s.id)}
              activeClass={`${s.colors.chipBg.replace("100","500")} text-white border-transparent shadow-sm`}
              idleClass={`${s.colors.chipBg} ${s.colors.chipText} border ${s.colors.chipBorder}`}
            />
          ))}
        </div>


        {/* Search results */}
        {q && (
          <div className="space-y-2 mb-6">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              {searchResults.length} תוצאות
            </p>
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 text-center text-[13px] text-gray-500 border border-gray-100">
                לא נמצאו תוצאות ל"{search}"
              </div>
            ) : searchResults.map((s) => {
              const catNames = (s.categories ?? [])
                .map((cid) => categories.find((c) => c.id === cid)?.name)
                .filter(Boolean).slice(0, 2).join(" · ");
              return (
                <button key={s.id} onClick={() => navigate(`/suppliers/${s.id}`)}
                  className="w-full bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center gap-3 text-right active:scale-[0.99] transition-transform">
                  <SupplierLogo name={s.business_name} logoUrl={s.logo_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-[#1A1A1A] truncate" style={{ fontFamily: URBANIST }}>
                      {s.business_name}
                    </p>
                    <p className="text-[12px] text-gray-500 truncate">{catNames || "ספק"}</p>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-gray-400" />
                </button>
              );
            })}
          </div>
        )}

        {/* Stage sections — each in its own row with horizontal scroll */}
        {!q && (
          <div className="space-y-8">
            {visibleStages.map(({ stage, cats, totalSuppliers }) => (
              <StageSection
                key={stage.id}
                stage={stage}
                cats={cats}
                totalSuppliers={totalSuppliers}
                counts={counts}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav role="resident" />
    </div>
  );
}

/* ---------- Sub-components ---------- */

function FilterChip({
  label, active, onClick, activeClass, idleClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass: string;
  idleClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-semibold transition-all active:scale-95 ${active ? activeClass : idleClass}`}
    >
      {label}
    </button>
  );
}


function StageSection({
  stage, cats, totalSuppliers, counts,
}: {
  stage: StageDef;
  cats: { id: string; name: string; icon: string }[];
  totalSuppliers: number;
  counts: Record<string, number>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 8);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [cats.length]);

  // Subtle nudge on first mount to hint scroll affordance
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !canScroll) return;
    const t1 = setTimeout(() => el.scrollBy({ left: -30, behavior: "smooth" }), 600);
    const t2 = setTimeout(() => el.scrollBy({ left: 30, behavior: "smooth" }), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [canScroll]);

  const c = stage.colors;

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-6 ${c.bar} rounded-full shrink-0`} />
          <h2
            className="text-[19px] font-bold text-[#1A1A1A] truncate"
            style={{ fontFamily: URBANIST }}
          >
            {stage.title}
          </h2>
        </div>
        <span className={`text-[11px] font-bold ${c.tagText} ${c.tagBg} px-2 py-1 rounded-md whitespace-nowrap`}>
          שלב {stage.index} · {totalSuppliers}
        </span>
      </div>

      {cats.length === 0 ? (
        <div className="bg-white/70 rounded-2xl p-4 text-center text-[12px] text-gray-500 font-medium border border-gray-100">
          קטגוריות יתווספו בקרוב
        </div>
      ) : (
        <div className="relative -mx-5">
          <div
            ref={scrollerRef}
            className="flex gap-3 overflow-x-auto no-scrollbar snap-x scroll-smooth px-5 pb-1"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {cats.map((cat) => (
              <CategoryCard
                key={cat.id}
                id={cat.id}
                name={cat.name}
                icon={cat.icon}
                count={counts[cat.id] ?? 0}
                colors={c}
              />
            ))}
            <div className="shrink-0 w-1" aria-hidden />
          </div>

          {/* Scroll affordance — peek + fade */}
          {canScroll && (
            <>
              <div
                className="pointer-events-none absolute top-0 bottom-1 left-0 w-10"
                style={{ background: "linear-gradient(90deg, #FBF8F3, rgba(251,248,243,0))" }}
              />
              <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white shadow-md flex items-center justify-center animate-pulse">
                <ChevronLeft className={`h-4 w-4 ${c.tagText}`} strokeWidth={2.5} />
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function CategoryCard({
  id, name, icon, count, colors,
}: {
  id: string;
  name: string;
  icon: string;
  count: number;
  colors: StageColors;
}) {
  const dim = count === 0;

  const body = (
    <>
      <div
        className={`w-14 h-14 ${colors.iconBg} ${!dim ? colors.iconHover : ""} rounded-2xl flex items-center justify-center mb-3 ${colors.iconText} text-[26px] transition-colors`}
      >
        <span aria-hidden>{icon}</span>
      </div>
      <span
        className="font-bold text-[13px] text-[#1A1A1A] block leading-tight line-clamp-2 min-h-[2.2em]"
        style={{ fontFamily: URBANIST }}
      >
        {name}
      </span>
      <span className={`text-[11px] font-semibold mt-1 ${dim ? "text-gray-400" : colors.tagText}`}>
        {dim ? "בקרוב" : `${count} ספקים`}
      </span>
    </>
  );

  const baseClass = `snap-start shrink-0 w-[140px] bg-white p-4 rounded-2xl border ${colors.cardBorder} shadow-sm flex flex-col items-center text-center group transition-transform`;

  if (dim) {
    return (
      <div className={`${baseClass} opacity-60 cursor-default`}>
        {body}
      </div>
    );
  }

  return (
    <Link
      to={`/resident/categories/${id}`}
      className={`${baseClass} active:scale-95 hover:shadow-md`}
    >
      {body}
    </Link>
  );
}
