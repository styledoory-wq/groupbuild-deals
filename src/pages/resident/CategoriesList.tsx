import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { CategorySquareCard } from "@/components/categories/CategorySquareCard";
import { supabase } from "@/integrations/supabase/client";
import { stageMeta, STAGE_ORDER, type ProjectType } from "@/lib/stageCatalog";
import { iconForCategory, iconForStage } from "@/lib/categoryIcons";
import { illustrationForProjectType } from "@/lib/stageIllustrations";
import { Seo } from "@/components/seo/Seo";
import finishesImg from "@/assets/stages/stage-finishes.jpg";

const BRAND = "#0E6B5A";

const STORAGE_KEY = "gb:projectType";

type UiProjectType = Extract<ProjectType, "new" | "reno" | "building">;

type ProjectTypeDef = {
  id: UiProjectType;
  title: string;
  subtitle: string;
  img: string;
  color: string;
  Icon: typeof HomeIcon;
};

const PROJECT_TYPES: ProjectTypeDef[] = [
  {
    id: "new",
    title: "בנייה חדשה",
    subtitle: "הכל לבניית בית חדש",
    img: illustrationForProjectType("new"),
    color: "#0E6B5A",
    Icon: HomeIcon,
  },
  {
    id: "reno",
    title: "שיפוץ",
    subtitle: "שדרוג ושיפוץ הבית",
    img: illustrationForProjectType("reno"),
    color: "#0E6B5A",
    Icon: PaintRoller,
  },
  {
    id: "building",
    title: "בניין משותף",
    subtitle: "ועד בית ותחזוקה",
    img: illustrationForProjectType("building"),
    color: "#0E6B5A",
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
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex flex-col items-center gap-2.5 flex-1 min-w-0 active:scale-[0.97] transition-transform"
    >
      <span className="relative block w-[104px] h-[104px] mx-auto">
        <span
          className="absolute inset-0 rounded-full overflow-hidden bg-[#E8EEE9]"
          style={{
            boxShadow: selected
              ? `0 0 0 3px ${BRAND}, 0 14px 28px -16px ${BRAND}88`
              : "0 8px 20px -12px rgba(16,24,40,0.16)",
          }}
        >
          <img
            src={def.img}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-center"
          />
        </span>
        {selected && (
          <span
            className="absolute top-0.5 right-0.5 z-10 grid place-items-center rounded-full text-white"
            style={{
              width: 24,
              height: 24,
              background: BRAND,
              boxShadow: `0 4px 12px ${BRAND}55`,
            }}
          >
            <Check size={13} strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="text-center px-0.5">
        <span
          className="block text-[13.5px] font-extrabold leading-tight"
          style={{ color: selected ? BRAND : "#1A1A1A" }}
        >
          {def.title}
        </span>
        <span className="block text-[10.5px] text-[#6B7280] leading-tight mt-0.5 line-clamp-2">
          {def.subtitle}
        </span>
      </span>
    </button>
  );
}

function CategorySearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label
      className="flex items-center gap-3 h-[52px] px-5 rounded-full bg-white text-[#667085]"
      style={{ boxShadow: "0 10px 24px -14px rgba(16,24,40,0.18)" }}
    >
      <Search size={20} strokeWidth={1.9} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="חפש שירות, ספק או מוצר..."
        aria-label="חיפוש"
        dir="rtl"
        className="w-full bg-transparent border-0 outline-none text-right text-[14px] text-[#172033] placeholder:text-[#8b93a1]"
      />
    </label>
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
        className="min-h-screen min-h-[100dvh] w-full bg-[#F7F8F6]"
        style={{
          fontFamily: "'Heebo', 'Inter', system-ui, sans-serif",
          color: "#172033",
        }}
      >
        <div
          className="mx-auto w-full max-w-[var(--app-max-w)] px-4 pt-[calc(env(safe-area-inset-top)+14px)]"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)",
          }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3">
            {user ? (
              <>
                <button
                  aria-label="פרופיל"
                  onClick={() => navigate("/resident/profile")}
                  className="grid place-items-center w-[40px] h-[40px] rounded-full bg-white border border-[#ECEEF2] shadow-sm active:scale-95 transition-transform"
                >
                  <UserRound size={20} strokeWidth={2} className="text-[#172033]" />
                </button>
                <button
                  aria-label="התראות"
                  onClick={() => navigate("/resident/notifications")}
                  className="relative grid place-items-center w-[40px] h-[40px] rounded-full bg-white border border-[#ECEEF2] shadow-sm active:scale-95 transition-transform"
                >
                  <Bell size={20} strokeWidth={1.9} className="text-[#172033]" />
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                    3
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/")}
                  className="font-extrabold text-[#0E6B5A] text-[15px] tracking-tight"
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
                  className="text-[#0E6B5A] font-semibold text-[12.5px] border border-[#0E6B5A]/25 px-4 py-1.5 rounded-full hover:bg-[#0E6B5A]/5 transition-colors"
                >
                  התחברות
                </button>
              </>
            )}
          </div>

          {/* Search with soft hero bleed */}
          <div className="mb-5 -mx-1">
            <CategorySearch value={query} onChange={setQuery} />
          </div>

          {/* Circular project types */}
          {!query.trim() && (
            <div className="flex items-start justify-between gap-2 mb-7 px-1">
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[16px] font-extrabold text-[#1A1A1A] m-0">
                  תוצאות חיפוש{catalogHits.length ? ` (${catalogHits.length})` : ""}
                </h2>
              </div>
              {searching ? (
                <div className="space-y-2.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[64px] rounded-2xl bg-white border border-[#ECEEF2] animate-pulse"
                    />
                  ))}
                </div>
              ) : catalogHits.length === 0 ? (
                <div className="min-h-[160px] grid place-items-center text-center gap-2 text-[#7b8490]">
                  <Search size={28} />
                  <strong className="text-[#26313c]">לא נמצאו תוצאות</strong>
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
                        className="flex items-center gap-3 bg-white rounded-[18px] p-3 active:scale-[0.99] transition-transform"
                        style={{ boxShadow: "0 6px 18px -10px rgba(16,24,40,0.12)" }}
                      >
                        <span
                          className="h-11 w-11 rounded-full grid place-items-center shrink-0"
                          style={{ background: "rgba(14,107,90,0.08)", color: BRAND }}
                        >
                          <HitIcon size={22} strokeWidth={1.7} />
                        </span>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="font-bold text-[14px] text-[#1F2937] truncate">{h.name}</p>
                          {h.path && (
                            <p className="text-[11px] text-[#6B7280] truncate mt-0.5" dir="rtl">
                              {h.path}
                            </p>
                          )}
                          <p className="text-[11px] text-[#0E6B5A] font-semibold mt-0.5">
                            {h.supplier_count > 0 ? `${h.supplier_count} ספקים` : "בקרוב"}
                          </p>
                        </div>
                        <ChevronLeft className="h-4 w-4 text-[#6B7280] shrink-0" strokeWidth={2.2} />
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[16px] font-extrabold text-[#1A1A1A] m-0">
                  קטגוריות מובילות
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const first = filtered[0];
                    if (first) openStage(first.key);
                  }}
                  className="text-[12.5px] font-bold text-[#0E6B5A] inline-flex items-center gap-0.5"
                >
                  הצג הכל
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[1/1.05] rounded-[22px] bg-white animate-pulse"
                      style={{ boxShadow: "0 6px 18px -8px rgba(16,24,40,0.10)" }}
                    />
                  ))}
                </div>
              ) : errorMsg ? (
                <div className="min-h-[160px] grid place-items-center text-center gap-2 text-[#7b8490]">
                  <strong className="text-[#26313c]">{errorMsg}</strong>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-[12px] font-bold text-[#0E6B5A] underline"
                  >
                    רענן
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="min-h-[160px] grid place-items-center text-center gap-2 text-[#7b8490]">
                  <Search size={28} />
                  <strong className="text-[#26313c]">בקרוב נוסיף שלבים למסלול זה</strong>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
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

          {/* Promo banner — lifestyle + trust */}
          {!query && !loading && !errorMsg && filtered.length > 0 && (
            <aside
              className="mt-6 rounded-[22px] overflow-hidden flex items-stretch bg-white border border-[#EEF1EF]"
              style={{ boxShadow: "0 10px 24px -16px rgba(16,24,40,0.16)" }}
            >
              <div className="flex-1 min-w-0 p-4 flex items-start gap-2.5 text-right">
                <span
                  className="grid place-items-center w-9 h-9 rounded-full shrink-0 mt-0.5"
                  style={{ background: "rgba(14,107,90,0.10)", color: BRAND }}
                >
                  <ShieldCheck size={18} strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <strong className="block text-[14px] text-[#0E6B5A] mb-0.5 leading-snug">
                    ספקים מאומתים
                  </strong>
                  <span className="block text-[12px] text-[#52605a] leading-snug">
                    שקט נפשי לכל שלב בפרויקט
                  </span>
                </div>
              </div>
              <div className="w-[112px] shrink-0">
                <img
                  src={finishesImg}
                  alt=""
                  className="h-full w-full object-cover object-center min-h-[92px]"
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
