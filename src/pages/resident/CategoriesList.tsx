import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "@/store/AppStore";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefreshIndicator";
import {
  Bell,
  Building2,
  Check,
  ChevronLeft,
  Home as HomeIcon,
  PaintRoller,
  Search,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { CategorySquareCard } from "@/components/categories/CategorySquareCard";
import { supabase } from "@/integrations/supabase/client";
import { stageMeta, STAGE_ORDER, type ProjectType } from "@/lib/stageCatalog";
import { iconForCategory, iconForStage } from "@/lib/categoryIcons";
import { Seo } from "@/components/seo/Seo";
import finishesImg from "@/assets/stages/stage-finishes.jpg";
import heroAtmosphereImg from "@/assets/project-renovation.jpg";
import projectNewBuildImg from "@/assets/project-new-build.jpg";
import projectRenoImg from "@/assets/project-renovation.jpg";
import projectBuildingImg from "@/assets/project-building.jpg";

const BRAND = "#0E6B5A";

const STORAGE_KEY = "gb:projectType";

type UiProjectType = Extract<ProjectType, "new" | "reno" | "building">;

type ProjectTypeDef = {
  id: UiProjectType;
  title: string;
  subtitle: string;
  img: string;
  Icon: LucideIcon;
};

const PROJECT_TYPES: ProjectTypeDef[] = [
  {
    id: "new",
    title: "בנייה חדשה",
    subtitle: "הכל לבניית בית חדש",
    img: projectNewBuildImg,
    Icon: HomeIcon,
  },
  {
    id: "reno",
    title: "שיפוץ",
    subtitle: "שדרוג ושיפוץ הבית",
    img: projectRenoImg,
    Icon: PaintRoller,
  },
  {
    id: "building",
    title: "בניין משותף",
    subtitle: "ועד בית ותחזוקה",
    img: projectBuildingImg,
    Icon: Building2,
  },
];

/* -------------------- Sub components -------------------- */

function ProjectTypeCircle({
  def,
  selected,
  onSelect,
}: {
  def: ProjectTypeDef;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = def.Icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex flex-col items-center gap-3 flex-1 min-w-0 active:scale-[0.97] transition-transform"
    >
      {/* Extra bottom space so the overlapping icon bubble isn't clipped */}
      <span className="relative mx-auto mb-3 block h-[104px] w-[104px]">
        <span
          className="absolute inset-0 overflow-hidden rounded-full bg-slate-100"
          style={{
            boxShadow: selected
              ? `0 0 0 3px ${BRAND}, 0 16px 32px -18px ${BRAND}99`
              : "0 10px 24px -14px rgba(15,23,42,0.18)",
          }}
        >
          <img
            src={def.img}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-center"
          />
        </span>

        {/* Active V — top-right corner of the circle */}
        {selected && (
          <span
            className="absolute right-0 top-0 z-20 grid place-items-center rounded-full text-white"
            style={{
              width: 26,
              height: 26,
              background: BRAND,
              boxShadow: `0 4px 12px ${BRAND}66`,
              transform: "translate(12%, -12%)",
            }}
          >
            <Check size={14} strokeWidth={3} fill="none" />
          </span>
        )}

        {/* Icon bubble overlapping the bottom edge of the photo circle */}
        <span
          className="absolute left-1/2 z-20 grid place-items-center rounded-full border border-gray-100 bg-white"
          style={{
            width: 34,
            height: 34,
            bottom: 0,
            transform: "translate(-50%, 45%)",
            color: BRAND,
            boxShadow: "0 4px 12px rgba(15,23,42,0.14)",
          }}
        >
          <Icon size={16} strokeWidth={2} fill="none" style={{ color: BRAND, stroke: BRAND }} />
        </span>
      </span>

      <span className="px-0.5 text-center">
        <span
          className="block text-[13.5px] font-extrabold leading-tight"
          style={{ color: selected ? BRAND : "#0F172A" }}
        >
          {def.title}
        </span>
        <span className="mt-0.5 block text-[10.5px] leading-tight text-slate-500 line-clamp-2">
          {def.subtitle}
        </span>
      </span>
    </button>
  );
}

function CategoryHeroSearch({
  value,
  onChange,
  topBar,
}: {
  value: string;
  onChange: (v: string) => void;
  topBar: ReactNode;
}) {
  return (
    <div className="relative -mx-4 mb-6 overflow-hidden">
      {/* Atmospheric blurred photo */}
      <img
        src={heroAtmosphereImg}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover object-center blur-[2px]"
      />
      {/* Brand green → soft gray overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(14,107,90,0.88) 0%, rgba(14,107,90,0.55) 38%, rgba(247,248,246,0.82) 72%, rgba(248,250,252,0.96) 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-slate-50" />

      <div className="relative px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-7">
        {topBar}
        <label
          className="mt-3 flex h-[54px] items-center gap-3 rounded-full bg-white px-5 text-slate-400"
          style={{ boxShadow: "0 14px 32px -16px rgba(15,23,42,0.28)" }}
        >
          <Search size={20} strokeWidth={1.9} className="shrink-0 text-slate-400" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="חפש שירות, ספק או מוצר..."
            aria-label="חיפוש"
            dir="rtl"
            className="w-full border-0 bg-transparent text-right text-[14px] text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>
    </div>
  );
}

/* -------------------- Main -------------------- */

type StageItem = { key: string; title: string; emoji: string; serviceCount: number };
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

export default function CategoriesList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();

  const [selectedProject, setSelectedProject] = useState<UiProjectType>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "new" || v === "reno" || v === "building") return v;
    } catch {
      /* noop */
    }
    return "new";
  });
  const [query, setQuery] = useState("");
  const [catalogHits, setCatalogHits] = useState<CatalogHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, selectedProject);
    } catch {
      /* noop */
    }
  }, [selectedProject]);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setCatalogHits([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_catalog", { _q: term });
      if (cancelled) return;
      setCatalogHits((data ?? []) as CatalogHit[]);
      setSearching(false);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const [stagesByType, setStagesByType] = useState<Record<string, StageItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const ptr = usePullToRefresh(async () => {
    setRefreshTick((n) => n + 1);
    await new Promise((r) => setTimeout(r, 400));
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from("category_project_stages")
        .select("project_type,stage_key,category_id,display_order")
        .order("display_order", { ascending: true });
      if (cancelled) return;
      if (error) {
        setErrorMsg("שגיאה בטעינת הקטגוריות. נסה שוב.");
        setLoading(false);
        return;
      }
      const acc: Record<string, Record<string, { count: number; minOrder: number }>> = {};
      (data ?? []).forEach(
        (r: { project_type: string; stage_key: string; display_order: number }) => {
          const t = r.project_type;
          const s = r.stage_key;
          if (!acc[t]) acc[t] = {};
          if (!acc[t][s]) acc[t][s] = { count: 0, minOrder: r.display_order };
          acc[t][s].count += 1;
          if (r.display_order < acc[t][s].minOrder) acc[t][s].minOrder = r.display_order;
        },
      );
      const out: Record<string, StageItem[]> = {};
      (Object.keys(STAGE_ORDER) as ProjectType[]).forEach((t) => {
        const counts = acc[t] ?? {};
        out[t] = STAGE_ORDER[t].map((key) => {
          const m = stageMeta(t, key);
          return { key, title: m.title, emoji: m.emoji, serviceCount: counts[key]?.count ?? 0 };
        });
      });
      setStagesByType(out);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const stages = stagesByType[selectedProject] ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stages;
    return stages.filter((s) => s.title.toLowerCase().includes(q));
  }, [stages, query]);

  const handleProjectChange = (id: UiProjectType) => {
    setSelectedProject(id);
  };

  const openStage = (stageKey: string) => {
    navigate(`/resident/categories/stages?type=${selectedProject}&stage=${stageKey}`);
  };

  const topBar = (
    <div className="mb-1 flex items-center justify-between">
      {user ? (
        <>
          <button
            aria-label="פרופיל"
            onClick={() => navigate("/resident/profile")}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/70 bg-white/90 shadow-sm active:scale-95 transition-transform"
          >
            <UserRound size={20} strokeWidth={2} className="text-slate-800" />
          </button>
          <button
            aria-label="התראות"
            onClick={() => navigate("/resident/notifications")}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-white/70 bg-white/90 shadow-sm active:scale-95 transition-transform"
          >
            <Bell size={20} strokeWidth={1.9} className="text-slate-800" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              3
            </span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => navigate("/")}
            className="text-[15px] font-extrabold tracking-tight text-white drop-shadow-sm"
            aria-label="דף הבית"
          >
            GroupBuild
          </button>
          <button
            onClick={() =>
              navigate(
                `/auth/resident?mode=signin&returnUrl=${encodeURIComponent(location.pathname + location.search)}`,
              )
            }
            className="rounded-full border border-white/50 bg-white/90 px-4 py-1.5 text-[12.5px] font-semibold text-[#0E6B5A] shadow-sm transition-colors hover:bg-white"
          >
            התחברות
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      <PullToRefreshIndicator {...ptr} />
      <Seo
        title="קטגוריות שירות לבית חדש — ספקים ובעלי מקצוע | GroupBuild"
        description="מצאו ספקים מומלצים לפי תחום ושלב בפרויקט: תכנון, שלד, מערכות, גמרים, חוץ ופיתוח. ללא הרשמה."
        path="/categories"
      />
      <div
        dir="rtl"
        className="min-h-screen min-h-[100dvh] w-full bg-slate-50"
        style={{
          fontFamily: "'Heebo', 'Inter', system-ui, sans-serif",
          color: "#0F172A",
        }}
      >
        <div
          className="mx-auto w-full max-w-[var(--app-max-w)] px-4"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)",
          }}
        >
          <CategoryHeroSearch value={query} onChange={setQuery} topBar={topBar} />

          {/* Circular project types */}
          {!query.trim() && (
            <div className="mb-8 flex items-start justify-between gap-2 px-0.5">
              {PROJECT_TYPES.map((def) => (
                <ProjectTypeCircle
                  key={def.id}
                  def={def}
                  selected={def.id === selectedProject}
                  onSelect={() => handleProjectChange(def.id)}
                />
              ))}
            </div>
          )}

          {/* Search results OR stage squares */}
          {query.trim() ? (
            <section>
              <div className="mb-3.5 flex items-center justify-between">
                <h2 className="m-0 text-[17px] font-extrabold text-slate-900">
                  תוצאות חיפוש{catalogHits.length ? ` (${catalogHits.length})` : ""}
                </h2>
              </div>
              {searching ? (
                <div className="space-y-2.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm"
                    />
                  ))}
                </div>
              ) : catalogHits.length === 0 ? (
                <div className="grid min-h-[160px] place-items-center gap-2 text-center text-slate-400">
                  <Search size={28} />
                  <strong className="text-slate-800">לא נמצאו תוצאות</strong>
                  <span className="text-[12.5px]">נסה מונח חיפוש אחר</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {catalogHits.map((h) => {
                    const HitIcon = iconForCategory(h.id, h.name);
                    return (
                      <Link
                        key={h.id}
                        to={`/resident/categories/${h.id}`}
                        className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm active:scale-[0.99] transition-transform"
                      >
                        <span
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                          style={{ background: "rgba(14,107,90,0.08)", color: BRAND }}
                        >
                          <HitIcon size={22} strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0 flex-1 text-right">
                          <p className="truncate text-[14px] font-bold text-slate-800">{h.name}</p>
                          {h.path && (
                            <p className="mt-0.5 truncate text-[11px] text-slate-500" dir="rtl">
                              {h.path}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                            {h.supplier_count > 0 ? `${h.supplier_count} ספקים` : "בקרוב"}
                          </p>
                        </div>
                        <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.2} />
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section>
              <div className="mb-3.5 flex items-center justify-between">
                <h2 className="m-0 text-[17px] font-extrabold text-slate-900">קטגוריות מובילות</h2>
                <button
                  type="button"
                  onClick={() => {
                    const first = filtered[0];
                    if (first) openStage(first.key);
                  }}
                  className="inline-flex items-center gap-0.5 text-[12.5px] font-bold"
                  style={{ color: BRAND }}
                >
                  הצג הכל
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-3 gap-3.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[1/1.08] animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm"
                    />
                  ))}
                </div>
              ) : errorMsg ? (
                <div className="grid min-h-[160px] place-items-center gap-2 text-center text-slate-400">
                  <strong className="text-slate-800">{errorMsg}</strong>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-[12px] font-bold underline"
                    style={{ color: BRAND }}
                  >
                    רענן
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="grid min-h-[160px] place-items-center gap-2 text-center text-slate-400">
                  <Search size={28} />
                  <strong className="text-slate-800">בקרוב נוסיף שלבים למסלול זה</strong>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3.5">
                  {filtered.map((s) => (
                    <CategorySquareCard
                      key={s.key}
                      title={s.title}
                      Icon={iconForStage(s.key)}
                      count={s.serviceCount}
                      onClick={() => openStage(s.key)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Trust banner */}
          {!query && !loading && !errorMsg && filtered.length > 0 && (
            <aside className="mt-7 flex items-stretch overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex min-w-0 flex-1 items-start gap-2.5 p-4 text-right">
                <span
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full"
                  style={{ background: "rgba(14,107,90,0.10)", color: BRAND }}
                >
                  <ShieldCheck size={18} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <strong className="mb-0.5 block text-[14px] leading-snug" style={{ color: BRAND }}>
                    ספקים מאומתים
                  </strong>
                  <span className="block text-[12px] leading-snug text-slate-500">
                    שקט נפשי לכל שלב בפרויקט
                  </span>
                </div>
              </div>
              <div className="w-[112px] shrink-0">
                <img
                  src={finishesImg}
                  alt=""
                  className="h-full min-h-[92px] w-full object-cover object-center"
                />
              </div>
            </aside>
          )}
        </div>

        <BottomNav role="resident" />
      </div>
    </>
  );
}
