import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  Home as HomeIcon,
  PaintRoller,
  Building2,
  Search,
  UserRound,
  Check,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { stageMeta, type ProjectType } from "@/lib/stageCatalog";

const STORAGE_KEY = "gb:projectType";

type UiProjectType = Extract<ProjectType, "new" | "reno" | "building">;

type ProjectTypeDef = {
  id: UiProjectType;
  title: string;
  icon: typeof HomeIcon;
  accent: "green" | "orange" | "blue";
  color: string;
  bgSelected: string;
  borderSelected: string;
};

const PROJECT_TYPES: ProjectTypeDef[] = [
  {
    id: "new",
    title: "בנייה חדשה",
    icon: HomeIcon,
    accent: "green",
    color: "#16845b",
    bgSelected: "linear-gradient(180deg,#EBF7EF,#FFFFFF)",
    borderSelected: "rgba(22,132,91,0.55)",
  },
  {
    id: "reno",
    title: "שיפוץ",
    icon: PaintRoller,
    accent: "orange",
    color: "#d88919",
    bgSelected: "linear-gradient(180deg,#FDF3E4,#FFFFFF)",
    borderSelected: "rgba(216,137,25,0.55)",
  },
  {
    id: "building",
    title: "בניין משותף\nועד בית",
    icon: Building2,
    accent: "blue",
    color: "#34558e",
    bgSelected: "linear-gradient(180deg,#EAF0FB,#FFFFFF)",
    borderSelected: "rgba(52,85,142,0.55)",
  },
];

/* -------------------- Sub components -------------------- */

function ProjectTypeCard({
  def,
  selected,
  onSelect,
}: {
  def: ProjectTypeDef;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = def.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="relative flex flex-col items-center justify-center gap-3 rounded-[20px] px-2 py-4 min-h-[132px] transition-all active:scale-[0.98]"
      style={{
        background: selected ? def.bgSelected : "rgba(255,255,255,0.85)",
        border: `1px solid ${selected ? def.borderSelected : "rgba(224,228,225,0.85)"}`,
        boxShadow: selected
          ? `0 10px 26px ${def.color}22`
          : "0 6px 18px rgba(31,40,35,0.06)",
        color: def.color,
      }}
    >
      {selected && (
        <span
          className="absolute top-2 right-2 grid place-items-center rounded-full text-white"
          style={{
            width: 22,
            height: 22,
            background: def.color,
            boxShadow: `0 4px 10px ${def.color}44`,
          }}
        >
          <Check size={13} strokeWidth={3} />
        </span>
      )}
      <Icon size={36} strokeWidth={1.7} />
      <span className="flex flex-col items-center font-extrabold text-[13.5px] leading-tight text-[#1f2937]">
        {def.title.split("\n").map((line) => (
          <span key={line}>{line}</span>
        ))}
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
    <label className="flex items-center gap-3 h-[52px] px-4 rounded-[18px] bg-white/90 border border-[rgba(225,229,226,0.9)] shadow-sm text-[#667085]">
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

function StageCard({
  index,
  title,
  emoji,
  serviceCount,
  onClick,
  accentColor,
}: {
  index: number;
  title: string;
  emoji: string;
  serviceCount: number;
  onClick: () => void;
  accentColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl bg-white/95 border border-[rgba(226,230,227,0.9)] shadow-sm px-3 py-3 active:scale-[0.99] transition-transform text-right"
    >
      <div
        className="grid place-items-center w-11 h-11 rounded-xl text-[22px] shrink-0"
        style={{ background: `${accentColor}14` }}
      >
        <span aria-hidden>{emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-[10.5px] font-extrabold tracking-wide"
            style={{ color: accentColor }}
          >
            שלב {String(index).padStart(2, "0")}
          </span>
        </div>
        <strong className="block text-[14.5px] font-extrabold text-[#1e2530] leading-tight">
          {title}
        </strong>
        <span className="block text-[11.5px] text-[#7b8490] mt-0.5">
          {serviceCount} שירותים
        </span>
      </div>
      <ChevronLeft size={18} className="text-[#b0b7bd] shrink-0" strokeWidth={2.2} />
    </button>
  );
}

/* -------------------- Main -------------------- */

type StageItem = { key: string; title: string; emoji: string; serviceCount: number };

export default function CategoriesList() {
  const navigate = useNavigate();

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

  // Persist selection
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, selectedProject);
    } catch {
      /* noop */
    }
  }, [selectedProject]);

  // Stages per project type (grouped from category_project_stages)
  const [stagesByType, setStagesByType] = useState<Record<string, StageItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        }
      );
      const out: Record<string, StageItem[]> = {};
      Object.entries(acc).forEach(([t, byStage]) => {
        out[t] = Object.entries(byStage)
          .sort((a, b) => a[1].minOrder - b[1].minOrder)
          .map(([key, v]) => {
            const m = stageMeta(t as ProjectType, key);
            return { key, title: m.title, emoji: m.emoji, serviceCount: v.count };
          });
      });
      setStagesByType(out);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentDef =
    PROJECT_TYPES.find((p) => p.id === selectedProject) ?? PROJECT_TYPES[0];

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
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full"
      style={{
        background:
          "radial-gradient(circle at 15% 0%, rgba(238,203,153,0.18), transparent 35%)," +
          "radial-gradient(circle at 90% 25%, rgba(167,204,185,0.16), transparent 36%)," +
          "#f3f5f2",
        fontFamily: "'Heebo', 'Inter', system-ui, sans-serif",
        color: "#172033",
      }}
    >
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] px-4 pt-[calc(env(safe-area-inset-top)+14px)]"
        style={{
          paddingBottom:
            "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)",
        }}
      >
        {/* Top bar: bell + avatar */}
        <div className="flex items-center justify-between mb-4">
          <button
            aria-label="פרופיל"
            onClick={() => navigate("/resident/profile")}
            className="grid place-items-center w-[40px] h-[40px] rounded-full bg-white/85 border border-white/70 shadow-sm active:scale-95 transition-transform"
          >
            <UserRound size={20} strokeWidth={2} className="text-[#172033]" />
          </button>
          <button
            aria-label="התראות"
            onClick={() => navigate("/resident/notifications")}
            className="relative grid place-items-center w-[40px] h-[40px] rounded-full bg-white/85 border border-white/70 shadow-sm active:scale-95 transition-transform"
          >
            <Bell size={20} strokeWidth={1.9} className="text-[#172033]" />
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
              3
            </span>
          </button>
        </div>

        {/* Hero copy */}
        <div className="text-center mb-4 px-2">
          <h1 className="text-[26px] font-extrabold text-[#1A1A1A] leading-tight">
            מה הפרויקט שלך?
          </h1>
          <p className="text-[13.5px] text-gray-500 leading-relaxed mt-1.5">
            בחר את סוג הפרויקט כדי למצוא
            <br />
            את השירותים המתאימים לך
          </p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <CategorySearch value={query} onChange={setQuery} />
        </div>

        {/* Project types (single row of 3) */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {PROJECT_TYPES.map((def) => (
            <ProjectTypeCard
              key={def.id}
              def={def}
              selected={def.id === selectedProject}
              onSelect={() => handleProjectChange(def.id)}
            />
          ))}
        </div>

        {/* Categories section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: currentDef.color }}
              />
              <h2 className="text-[15.5px] font-extrabold text-[#1A1A1A] m-0">
                קטגוריות ב{currentDef.title.split("\n")[0]}
              </h2>
            </div>
            {hasMore && (
              <button
                type="button"
                aria-label={expanded ? "הצג פחות" : "הצג עוד"}
                onClick={() => setExpanded((v) => !v)}
                className="grid place-items-center w-9 h-9 rounded-full bg-white/90 border border-white/70 shadow-sm text-[#172033]"
              >
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[104px] rounded-[16px] bg-white/70 border border-white/60 animate-pulse"
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
              <strong className="text-[#26313c]">לא נמצאו שירותים</strong>
              <span className="text-[12.5px]">
                {query ? "נסה מונח חיפוש אחר" : "בקרוב נוסיף שירותים בקטגוריה זו"}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {visible.map((c) => (
                <CategoryCard
                  key={c.id}
                  name={c.name}
                  emoji={c.emoji}
                  onClick={() => openCategory(c.id)}
                  accentColor={currentDef.color}
                />
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="relative flex flex-col items-center justify-center gap-2 rounded-[16px] min-h-[104px] bg-white/90 border border-[rgba(226,230,227,0.9)] shadow-sm active:scale-[0.98] transition-transform"
                  style={{ color: currentDef.color }}
                >
                  {expanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  <strong className="text-[12.5px] font-extrabold text-[#1e2530]">
                    {expanded ? "הצג פחות" : "הצג עוד"}
                  </strong>
                </button>
              )}
            </div>
          )}
        </section>

        {/* Promo (only collapsed & no query) */}
        {!expanded && !query && !loading && !errorMsg && filtered.length > 0 && (
          <aside
            className="mt-6 rounded-[22px] p-4 border flex items-center gap-3 overflow-hidden"
            style={{
              background:
                "linear-gradient(90deg, rgba(239,249,243,0.96), rgba(250,247,239,0.92))",
              borderColor: "rgba(221,234,226,0.95)",
            }}
          >
            <div
              className="grid place-items-center w-[38px] h-[38px] rounded-[14px] font-black shrink-0"
              style={{ color: "#16845b", border: "2px solid #16845b" }}
            >
              ✓
            </div>
            <div className="flex-1 min-w-0 text-right">
              <strong className="block text-[14px] text-[#147652] mb-1">
                כל שירות מצטרפים – המחיר יורד
              </strong>
              <span className="block text-[12px] text-[#52605a] leading-snug">
                הצטרף לקבוצת רכישה וחסוך אלפי שקלים
              </span>
            </div>
          </aside>
        )}
      </div>

      <BottomNav role="resident" />
    </div>
  );
}
