import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, X, Compass, HardHat, Plug, DoorOpen, PaintBucket, ChefHat, Trees, Sun,
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
  badgeSolid: string; // e.g. "bg-blue-600"
  ring: string;       // e.g. "ring-blue-500"
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
    ids: ["architect", "interior-designer", "consultant", "turnkey-contractor", "construction-supervisor"], Icon: Compass,
    colors: { chipBg:"bg-blue-100", chipText:"text-blue-700", chipBorder:"border-blue-200",
      bar:"bg-blue-500", tagBg:"bg-blue-50", tagText:"text-blue-600",
      cardBorder:"border-blue-100", iconBg:"bg-blue-50", iconText:"text-blue-600", iconHover:"group-hover:bg-blue-100",
      badgeSolid:"bg-blue-600", ring:"ring-blue-500" } },
  { id: "structure", index: 2, title: "שלד ובנייה", shortTitle: "שלד",
    ids: ["contractor", "skeleton", "gypsum"], Icon: HardHat,
    colors: { chipBg:"bg-orange-100", chipText:"text-orange-700", chipBorder:"border-orange-200",
      bar:"bg-orange-500", tagBg:"bg-orange-50", tagText:"text-orange-600",
      cardBorder:"border-orange-100", iconBg:"bg-orange-50", iconText:"text-orange-600", iconHover:"group-hover:bg-orange-100",
      badgeSolid:"bg-orange-600", ring:"ring-orange-500" } },
  { id: "systems", index: 3, title: "מערכות הבית", shortTitle: "מערכות",
    ids: ["electric", "plumbing", "ac", "smart-home"], Icon: Plug,
    colors: { chipBg:"bg-teal-100", chipText:"text-teal-700", chipBorder:"border-teal-200",
      bar:"bg-teal-500", tagBg:"bg-teal-50", tagText:"text-teal-600",
      cardBorder:"border-teal-100", iconBg:"bg-teal-50", iconText:"text-teal-600", iconHover:"group-hover:bg-teal-100",
      badgeSolid:"bg-teal-600", ring:"ring-teal-500" } },
  { id: "openings", index: 4, title: "פתחים ואבטחה", shortTitle: "פתחים",
    ids: ["doors", "security-door", "windows"], Icon: DoorOpen,
    colors: { chipBg:"bg-green-100", chipText:"text-green-700", chipBorder:"border-green-200",
      bar:"bg-green-500", tagBg:"bg-green-50", tagText:"text-green-600",
      cardBorder:"border-green-100", iconBg:"bg-green-50", iconText:"text-green-600", iconHover:"group-hover:bg-green-100",
      badgeSolid:"bg-green-600", ring:"ring-green-500" } },
  { id: "finishes", index: 5, title: "עבודות גמר", shortTitle: "גמר",
    ids: ["painting", "flooring", "cladding", "carpentry", "closets", "lighting"], Icon: PaintBucket,
    colors: { chipBg:"bg-purple-100", chipText:"text-purple-700", chipBorder:"border-purple-200",
      bar:"bg-purple-500", tagBg:"bg-purple-50", tagText:"text-purple-600",
      cardBorder:"border-purple-100", iconBg:"bg-purple-50", iconText:"text-purple-600", iconHover:"group-hover:bg-purple-100",
      badgeSolid:"bg-purple-600", ring:"ring-purple-500" } },
  { id: "kitchen-bath", index: 6, title: "מטבחים ואמבטיות", shortTitle: "מטבח",
    ids: ["kitchen", "bath", "sanitary", "showers"], Icon: ChefHat,
    colors: { chipBg:"bg-amber-100", chipText:"text-amber-700", chipBorder:"border-amber-200",
      bar:"bg-amber-500", tagBg:"bg-amber-50", tagText:"text-amber-600",
      cardBorder:"border-amber-100", iconBg:"bg-amber-50", iconText:"text-amber-600", iconHover:"group-hover:bg-amber-100",
      badgeSolid:"bg-amber-600", ring:"ring-amber-500" } },
  { id: "outdoor", index: 7, title: "חצר ופיתוח", shortTitle: "חצר",
    ids: ["garden", "pergola", "cleaning"], Icon: Trees,
    colors: { chipBg:"bg-lime-100", chipText:"text-lime-700", chipBorder:"border-lime-200",
      bar:"bg-lime-500", tagBg:"bg-lime-50", tagText:"text-lime-600",
      cardBorder:"border-lime-100", iconBg:"bg-lime-50", iconText:"text-lime-600", iconHover:"group-hover:bg-lime-100",
      badgeSolid:"bg-lime-600", ring:"ring-lime-500" } },
  { id: "solar", index: 8, title: "סולארי וחשמל ירוק", shortTitle: "סולארי",
    ids: ["c_1778448823740"], Icon: Sun,
    colors: { chipBg:"bg-yellow-100", chipText:"text-yellow-700", chipBorder:"border-yellow-200",
      bar:"bg-yellow-500", tagBg:"bg-yellow-50", tagText:"text-yellow-600",
      cardBorder:"border-yellow-100", iconBg:"bg-yellow-50", iconText:"text-yellow-600", iconHover:"group-hover:bg-yellow-100",
      badgeSolid:"bg-yellow-600", ring:"ring-yellow-500" } },
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

        {/* Stage sections — sticky headers + elevated row cards */}
        {!q && (
          <div className="space-y-7">
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

      {/* Floating summary pill */}
      {!q && suppliers.length > 0 && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-30 w-[88%] max-w-[var(--app-max-w)] bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-2xl shadow-black/30 border border-white/10 flex items-center justify-between"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 12px)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[15px] font-extrabold tabular-nums" style={{ fontFamily: URBANIST }}>
              {STAGES.length}
            </div>
            <div className="leading-tight">
              <div className="text-[12px] font-bold" style={{ fontFamily: URBANIST }}>
                {suppliers.length} ספקים ב-{STAGES.length} שלבים
              </div>
              <div className="text-[10.5px] text-slate-400 font-medium">
                מתכנון ועד מסירת מפתח
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/resident/search")}
            className="bg-white text-slate-900 px-3 py-1.5 rounded-xl text-[11.5px] font-extrabold active:scale-95 transition-transform"
            style={{ fontFamily: URBANIST }}
          >
            חיפוש מהיר
          </button>
        </div>
      )}


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
  const c = stage.colors;
  const idx = String(stage.index).padStart(2, "0");

  return (
    <section>
      {/* Sticky stage header */}
      <div
        className="sticky z-10 -mx-5 px-5 py-2.5 bg-[#FBF8F3]/85 backdrop-blur-md border-b border-gray-200/60"
        style={{ top: "calc(env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`flex items-center justify-center w-7 h-7 rounded-lg ${c.badgeSolid} text-white text-[11px] font-extrabold shadow-sm`}
            style={{ fontFamily: URBANIST }}
          >
            {idx}
          </span>
          <h2
            className="text-[15px] font-extrabold text-slate-800 tracking-tight"
            style={{ fontFamily: URBANIST }}
          >
            {stage.title}
          </h2>
          <span className="mr-auto text-[10.5px] font-bold text-gray-400 tabular-nums">
            {totalSuppliers} ספקים
          </span>
        </div>
      </div>

      {/* Rows */}
      {cats.length === 0 ? (
        <div className="mt-3 bg-white/70 rounded-2xl border border-dashed border-gray-200 px-4 py-4 text-center text-[12px] text-gray-500 font-medium">
          קטגוריות יתווספו בקרוב
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {cats.map((cat) => (
            <CategoryRow
              key={cat.id}
              id={cat.id}
              name={cat.name}
              icon={cat.icon}
              count={counts[cat.id] ?? 0}
              colors={c}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryRow({
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
    <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm shadow-black/[0.03]">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-11 h-11 flex items-center justify-center rounded-xl ${colors.iconBg} ${colors.iconText} text-[20px] shrink-0 ring-1 ring-inset ring-black/[0.04]`}
        >
          <span aria-hidden>{icon}</span>
        </div>
        <div className="min-w-0">
          <div
            className="text-[14px] font-bold text-slate-900 truncate leading-tight"
            style={{ fontFamily: URBANIST }}
          >
            {name}
          </div>
          <div className="text-[11px] text-gray-400 font-medium mt-0.5">
            {dim ? "יתווספו ספקים בקרוב" : `${count} ספקים זמינים`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {!dim && (
          <span className={`px-2 py-0.5 rounded-full ${colors.tagBg} ${colors.tagText} text-[10.5px] font-bold tabular-nums`}>
            {count}
          </span>
        )}
        <ChevronLeft className="h-4 w-4 text-gray-300" />
      </div>
    </div>
  );

  if (dim) {
    return <div className="opacity-55">{body}</div>;
  }

  return (
    <Link
      to={`/resident/categories/${id}`}
      className="block active:scale-[0.985] transition-transform"
    >
      {body}
    </Link>
  );
}


