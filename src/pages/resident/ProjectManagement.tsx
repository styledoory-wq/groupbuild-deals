import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Share2, Pencil, Calendar, Clock, User, Check, TrendingUp,
  Star, ChevronLeft, Sparkles, Zap, X, Plus, Trash2, RefreshCw,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

const URBANIST = "'Urbanist', system-ui, sans-serif";
const EPILOGUE = "'Epilogue', system-ui, sans-serif";
const BRAND = "#0E6B5A";
const BRAND_DARK = "#0A5447";

type ProjectInfo = {
  name: string;
  subtitle: string;
  manager: string;
  targetDate: string; // YYYY-MM-DD
  groupSavings: number;
};

type ScheduleItem = { start: string; end: string };
type BudgetItem = { id: string; label: string; planned: number; actual: number; catId?: string };

const PROJECT_INFO_KEY = "gb:pm:info";
const SCHEDULE_KEY = "gb:pm:schedule";
const BUDGET_KEY = "gb:pm:budget";
const CURRENT_IDX_KEY = "gb:pm:currentIdx";

const DEFAULT_INFO: ProjectInfo = {
  name: "",
  subtitle: "",
  manager: "",
  targetDate: "",
  groupSavings: 0,
};

function formatDateShort(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y.slice(2)}`;
}

type Stage = {
  key: string;
  num: number;
  title: string;
  short: string;
  emoji: string;
  catIds: string[];
  tasks: string[];
  recommendations: { title: string; subtitle: string; emoji: string }[];
};

const STAGES: Stage[] = [
  { key: "planning", num: 1, title: "תכנון והיתרים", short: "תכנון", emoji: "📐",
    catIds: ["architect", "interior-designer", "consultant"],
    tasks: ["מדידות ראשוניות", "תכנון אדריכלי", "הגשת היתר בנייה", "אישור ועדה מקומית"],
    recommendations: [
      { title: "אדריכל מומלץ", subtitle: "תכנון פנים ומבנה", emoji: "📐" },
      { title: "יועץ קונסטרוקציה", subtitle: "ליווי מקצועי", emoji: "📊" },
      { title: "ביטוח תכנון", subtitle: "כיסוי שלב התכנון", emoji: "🛡️" },
    ],
  },
  { key: "structure", num: 2, title: "שלד וביסוס", short: "שלד", emoji: "🏗️",
    catIds: ["contractor", "skeleton"],
    tasks: ["חפירות וביסוס", "יציקת רצפה", "שלד קומה א'", "שלד קומה ב'"],
    recommendations: [
      { title: "קבלן שלד מומלץ", subtitle: "שירות מעולה ומחיר הוגן", emoji: "🏗️" },
      { title: "ביטוח עבודות בנייה", subtitle: "השוואת מחירים משתלמת", emoji: "🛡️" },
      { title: "ספק בטון", subtitle: "אספקה מהירה לאתר", emoji: "🧱" },
    ],
  },
  { key: "envelope", num: 3, title: "מעטפת הבית", short: "מעטפת", emoji: "🧱",
    catIds: ["cladding", "windows"],
    tasks: ["איטום גגות", "התקנת חלונות", "חיפוי חיצוני", "סיוד חוץ"],
    recommendations: [
      { title: "חברת חיפוי", subtitle: "אבן וטיח חוץ", emoji: "🧱" },
      { title: "חלונות אלומיניום", subtitle: "בידוד תרמי משופר", emoji: "🪟" },
      { title: "איטום מקצועי", subtitle: "אחריות ל-10 שנים", emoji: "💧" },
    ],
  },
  { key: "systems", num: 4, title: "מערכות", short: "מערכות", emoji: "⚡",
    catIds: ["electric", "plumbing", "ac", "smart-home"],
    tasks: ["הכנת תשתיות חשמל", "תשתיות אינסטלציה", "התקנת צנרת מיזוג", "התקנת קופסאות ופנלים", "מערכת חכמה", "תאורה ראשונית", "בדיקות מערכת"],
    recommendations: [
      { title: "חשמלאי מוסמך", subtitle: "מערכות חכמות", emoji: "⚡" },
      { title: "מצלמות אבטחה", subtitle: "התקנה מקצועית", emoji: "📹" },
      { title: "מיזוג מרכזי", subtitle: "חיסכון אנרגיה", emoji: "❄️" },
    ],
  },
  { key: "finishes", num: 5, title: "גמרים", short: "גמרים", emoji: "🎨",
    catIds: ["painting", "flooring", "carpentry", "kitchen", "bath"],
    tasks: ["ריצוף וחיפוי", "צביעה פנימית", "מטבח ואמבטיה", "נגרות ודלתות"],
    recommendations: [
      { title: "צבעים מומלצים", subtitle: "מתאים לשלב הבא", emoji: "🎨" },
      { title: "ריצוף איכותי", subtitle: "אחריות יצרן", emoji: "🟫" },
      { title: "מטבח בהתאמה", subtitle: "תכנון אישי", emoji: "🍳" },
    ],
  },
  { key: "outdoor", num: 6, title: "פיתוח חוץ", short: "פיתוח", emoji: "🌳",
    catIds: ["garden", "pergola"],
    tasks: ["הכשרת חצר", "גינון", "התקנת פרגולה", "תאורת חוץ"],
    recommendations: [
      { title: "גנן מומלץ", subtitle: "תכנון נוף", emoji: "🌿" },
      { title: "פרגולה מעוצבת", subtitle: "התאמה אישית", emoji: "🪵" },
      { title: "תאורת גינה", subtitle: "חיסכון בחשמל", emoji: "💡" },
    ],
  },
  { key: "qa", num: 7, title: "בדק ואיכלוס", short: "בדק", emoji: "🔍",
    catIds: [],
    tasks: ["בדיקת קבלן", "תיקוני ליקויים", "ניקיון יסודי", "מסירה רשמית"],
    recommendations: [
      { title: "בדק בית", subtitle: "אינדקס ליקויים", emoji: "📋" },
      { title: "חברת ניקיון", subtitle: "ניקיון פוסט-בנייה", emoji: "🧽" },
      { title: "ביטוח דירה", subtitle: "השוואת מחירים", emoji: "🛡️" },
    ],
  },
  { key: "done", num: 8, title: "סיום", short: "סיום", emoji: "🎉",
    catIds: [],
    tasks: ["קבלת מפתח", "חיבור חברות תשתית", "מעבר דירה", "סיום פרויקט"],
    recommendations: [
      { title: "חברת הובלות", subtitle: "מומלצת בקבוצה", emoji: "📦" },
      { title: "מערכת סולארית", subtitle: "חיסכון לשנים", emoji: "☀️" },
      { title: "אזעקה ומצלמות", subtitle: "אבטחה לבית", emoji: "🔔" },
    ],
  },
];

// Default budget items derived from stage categories (used for auto-sync)
const BUDGET_TEMPLATE: Array<{ label: string; planned: number; catId: string }> = [
  { label: "תכנון אדריכלי וייעוץ", planned: 35000, catId: "architect" },
  { label: "קבלן שלד וביסוס", planned: 180000, catId: "contractor" },
  { label: "חלונות וחיפוי חוץ", planned: 60000, catId: "windows" },
  { label: "חשמל ותאורה", planned: 45000, catId: "electric" },
  { label: "אינסטלציה", planned: 32000, catId: "plumbing" },
  { label: "מיזוג אוויר", planned: 28000, catId: "ac" },
  { label: "ריצוף וחיפוי", planned: 55000, catId: "flooring" },
  { label: "מטבח", planned: 75000, catId: "kitchen" },
  { label: "צבע ונגרות", planned: 38000, catId: "painting" },
  { label: "פיתוח חוץ וגינון", planned: 42000, catId: "garden" },
];

interface SupplierLite {
  id: string; business_name: string; short_description: string | null;
  logo_url: string | null; categories: string[];
}

const uid = () => Math.random().toString(36).slice(2, 9);

export default function ProjectManagement() {
  const navigate = useNavigate();
  const { categories } = useApp();

  // Task completion local state
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("gb:pm:tasks") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem("gb:pm:tasks", JSON.stringify(completed)); } catch {}
  }, [completed]);

  const toggleTask = (key: string) => setCompleted((p) => ({ ...p, [key]: !p[key] }));

  // Auto-advance stage: derive first incomplete stage; allow manual override.
  const autoIdx = useMemo(() => {
    for (let i = 0; i < STAGES.length; i++) {
      const s = STAGES[i];
      if (s.tasks.length === 0) continue;
      const allDone = s.tasks.every((t) => completed[`${s.key}::${t}`]);
      if (!allDone) return i;
    }
    return STAGES.length - 1;
  }, [completed]);

  const [manualIdx, setManualIdx] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(CURRENT_IDX_KEY);
      return raw === null ? null : Number(raw);
    } catch { return null; }
  });
  // Clear manual override if user navigates back to the auto stage
  useEffect(() => {
    if (manualIdx === autoIdx) {
      setManualIdx(null);
      try { localStorage.removeItem(CURRENT_IDX_KEY); } catch {}
    }
  }, [manualIdx, autoIdx]);

  const currentIdx = manualIdx ?? autoIdx;
  const current = STAGES[currentIdx];

  const setStage = (i: number) => {
    setManualIdx(i);
    try { localStorage.setItem(CURRENT_IDX_KEY, String(i)); } catch {}
  };

  // Suppliers
  const cached = getCachedValue<SupplierLite[]>("categories:suppliers", 5 * 60_000);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>(() => cached ?? []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await cachedQuery<SupplierLite[]>("categories:suppliers", async () => {
        const { data } = await supabase
          .from("suppliers")
          .select("id,business_name,short_description,logo_url,categories")
          .eq("is_active", true).eq("is_deleted", false)
          .in("approval_status", ["approved", "active"])
          .order("business_name");
        return (data as SupplierLite[]) ?? [];
      }, 5 * 60_000);
      if (!cancelled) setSuppliers(data);
    })();
    return () => { cancelled = true; };
  }, []);

  const stageSuppliers = useMemo(() => {
    if (!current.catIds.length) return [];
    return suppliers
      .filter((s) => (s.categories ?? []).some((c) => current.catIds.includes(c)))
      .slice(0, 4);
  }, [suppliers, current]);

  const stageTaskKeys = current.tasks.map((t) => `${current.key}::${t}`);
  const doneTasks = stageTaskKeys.filter((k) => completed[k]).length;

  // Overall progress
  const overallDone = STAGES.reduce(
    (sum, s) => sum + s.tasks.filter((t) => completed[`${s.key}::${t}`]).length, 0
  );
  const overallTotal = STAGES.reduce((sum, s) => sum + s.tasks.length, 0);
  const overallPct = Math.round((overallDone / overallTotal) * 100);
  const stagesDone = STAGES.filter((s) =>
    s.tasks.length > 0 && s.tasks.every((t) => completed[`${s.key}::${t}`])
  ).length;

  // Editable project info (name / subtitle / manager / targetDate / groupSavings)
  const [info, setInfo] = useState<ProjectInfo>(() => {
    try {
      const raw = localStorage.getItem(PROJECT_INFO_KEY);
      if (raw) return { ...DEFAULT_INFO, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_INFO;
  });
  useEffect(() => {
    try { localStorage.setItem(PROJECT_INFO_KEY, JSON.stringify(info)); } catch {}
  }, [info]);

  // Schedule per stage
  const [schedule, setSchedule] = useState<Record<string, ScheduleItem>>(() => {
    try {
      const raw = localStorage.getItem(SCHEDULE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });
  useEffect(() => {
    try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule)); } catch {}
  }, [schedule]);

  // Budget items
  const [budget, setBudget] = useState<BudgetItem[]>(() => {
    try {
      const raw = localStorage.getItem(BUDGET_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  useEffect(() => {
    try { localStorage.setItem(BUDGET_KEY, JSON.stringify(budget)); } catch {}
  }, [budget]);

  const budgetTotal = budget.reduce((s, b) => s + (b.planned || 0), 0);
  const budgetUsed = budget.reduce((s, b) => s + (b.actual || 0), 0);
  const groupSavings = info.groupSavings;
  const overPct = budgetUsed > budgetTotal && budgetTotal > 0
    ? Math.round(((budgetUsed - budgetTotal) / budgetTotal) * 100) : 0;
  const statuses = ["הוזמן", "בתהליך", "הוזמן", "להזמין"];

  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full"
      style={{ background: "#FBF8F3", fontFamily: EPILOGUE, color: "#2D2D2D" }}
    >
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] px-5 pt-[calc(env(safe-area-inset-top)+18px)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 120px)" }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center active:scale-95"
            aria-label="חזרה"
          >
            <ArrowLeft className="h-4 w-4 text-gray-700" />
          </button>
          <h1 className="text-[17px] font-extrabold text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
            ניהול הפרויקט
          </h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate("/resident/budget-planner")}
              className="flex items-center gap-1 text-[11px] font-bold text-[#1A1A1A] bg-white border border-gray-200 px-2.5 py-1.5 rounded-full active:scale-95"
            >
              תכנון תקציב
            </button>
            <button className="flex items-center gap-1 text-[11px] font-bold text-[#0E6B5A] bg-[#0E6B5A]/10 px-2.5 py-1.5 rounded-full active:scale-95">
              <Share2 className="h-3.5 w-3.5" />
              שיתוף
            </button>
          </div>
        </div>

        {/* Project card / empty state */}
        {!info.name && !info.manager && !info.targetDate ? (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_24px_-12px_rgba(14,107,90,0.18)] text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-[36px]" style={{ background: "linear-gradient(135deg,#0E6B5A 0%,#3aa089 100%)" }}>
              🏡
            </div>
            <h2 className="text-[16px] font-extrabold text-[#1A1A1A] mt-4" style={{ fontFamily: URBANIST }}>
              פרטי הפרויקט
            </h2>
            <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">
              הזינו את שם הפרויקט, שם מנהל הפרויקט ותאריך צפי סיום כדי לנהל את הבנייה בצורה מסודרת
            </p>
            <button
              onClick={() => setEditInfoOpen(true)}
              className="mt-5 w-full py-3 rounded-2xl text-white text-[14px] font-bold active:scale-[0.98] transition-transform"
              style={{ background: BRAND, fontFamily: URBANIST }}
            >
              מילוי פרטי פרויקט
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-[0_8px_24px_-12px_rgba(14,107,90,0.18)] relative">
            <button
              onClick={() => setEditInfoOpen(true)}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-[#0E6B5A]/10 flex items-center justify-center active:scale-95"
              aria-label="עריכת פרטי פרויקט"
            >
              <Pencil className="h-3.5 w-3.5 text-[#0E6B5A]" />
            </button>
            <div className="flex items-start gap-3">
              <div
                className="w-20 h-20 rounded-2xl shrink-0 bg-cover bg-center"
                style={{ backgroundImage: "linear-gradient(135deg,#0E6B5A 0%,#3aa089 100%)" }}
              >
                <div className="w-full h-full flex items-center justify-center text-[36px]">🏡</div>
              </div>
              <div className="flex-1 min-w-0 pl-8">
                <h2 className="text-[16px] font-extrabold text-[#1A1A1A] break-words" style={{ fontFamily: URBANIST }}>
                  {info.name || <span className="text-gray-400 font-medium">שם הפרוייקט</span>}
                </h2>
                <p className="text-[12px] text-gray-500 mt-0.5 break-words">{info.subtitle || "הוסיפו תיאור קצר"}</p>

                {/* Progress ring */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative w-14 h-14">
                    <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="3.5" />
                      <circle
                        cx="18" cy="18" r="15.5" fill="none"
                        stroke={BRAND} strokeWidth="3.5" strokeLinecap="round"
                        strokeDasharray={`${(overallPct / 100) * 97.4} 97.4`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[13px] font-extrabold text-[#1A1A1A] tabular-nums" style={{ fontFamily: URBANIST }}>
                        {overallPct}%
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-500 leading-tight">
                    התקדמות<br />כוללת
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <InfoChip icon={<User className="h-3.5 w-3.5" />} label="מנהל" value={info.manager || "—"} />
              <InfoChip icon={<Calendar className="h-3.5 w-3.5" />} label="יעד" value={info.targetDate ? formatDateShort(info.targetDate) : "—"} />
              <InfoChip icon={<Clock className="h-3.5 w-3.5" />} label="עדכון" value="היום" />
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="mt-6 mb-2 flex items-center justify-between">
          <h3 className="text-[14px] font-extrabold text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
            שלבי הפרויקט
          </h3>
          <span className="text-[11px] font-bold text-gray-400 tabular-nums">
            {stagesDone}/{STAGES.length}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 min-w-max relative">
            {STAGES.map((s, i) => {
              const isCurrent = i === currentIdx;
              const isDone = i < autoIdx;
              return (
                <button
                  key={s.key}
                  onClick={() => setStage(i)}
                  className="flex flex-col items-center gap-1 px-2 py-1 shrink-0"
                >
                  <div
                    className={`flex items-center justify-center rounded-full font-extrabold transition-all ${
                      isCurrent ? "w-10 h-10 text-[14px] ring-4 ring-[#0E6B5A]/15" : "w-8 h-8 text-[12px]"
                    } ${isDone ? "text-white" : isCurrent ? "text-white" : "text-gray-400 bg-gray-100"}`}
                    style={{
                      background: isDone || isCurrent ? BRAND : undefined,
                      fontFamily: URBANIST,
                    }}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : s.num}
                  </div>
                  <div className={`text-[10.5px] font-bold whitespace-nowrap ${isCurrent ? "text-[#0E6B5A]" : "text-gray-500"}`}>
                    {s.short}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress banner */}
        <div className="mt-3 bg-[#F0F9F6] border border-[#0E6B5A]/15 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[18px]" aria-hidden>🎉</span>
            <div className="leading-tight">
              <div className="text-[12.5px] font-extrabold text-[#0A5447]" style={{ fontFamily: URBANIST }}>
                {stagesDone} מתוך {STAGES.length} שלבים הושלמו
              </div>
              <div className="text-[10.5px] text-gray-500">הפרויקט מתקדם כמתוכנן</div>
            </div>
          </div>
          <button
            onClick={() => setScheduleOpen(true)}
            className="text-[11px] font-bold text-[#0E6B5A] bg-white border border-[#0E6B5A]/20 px-2.5 py-1.5 rounded-full whitespace-nowrap active:scale-95"
          >
            📅 לוח זמנים
          </button>
        </div>

        {/* Current stage section */}
        <div className="mt-6 bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[20px]" aria-hidden>{current.emoji}</span>
              <div>
                <div className="text-[15px] font-extrabold text-[#1A1A1A] leading-tight" style={{ fontFamily: URBANIST }}>
                  השלב הנוכחי: {current.title}
                </div>
                <div className="text-[11px] text-gray-500">
                  {doneTasks} מתוך {current.tasks.length} משימות הושלמו
                </div>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-[#FAFAF7] rounded-2xl p-3 mb-3">
            <div className="text-[12px] font-extrabold text-gray-700 mb-2" style={{ fontFamily: URBANIST }}>
              משימות בשלב זה
            </div>
            <ul className="space-y-1.5">
              {current.tasks.map((t) => {
                const key = `${current.key}::${t}`;
                const done = !!completed[key];
                return (
                  <li key={t}>
                    <button
                      onClick={() => toggleTask(key)}
                      className="w-full flex items-center justify-between gap-2 py-2 px-2 rounded-lg hover:bg-white text-right active:scale-[0.99] transition-all"
                    >
                      <span className={`text-[13px] font-medium ${done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                        {t}
                      </span>
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          done ? "text-white" : "border-2 border-gray-300 bg-white"
                        }`}
                        style={done ? { background: BRAND } : undefined}
                      >
                        {done && <Check className="h-3 w-3" strokeWidth={3.5} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Suppliers in this stage */}
          {stageSuppliers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[12px] font-extrabold text-gray-700" style={{ fontFamily: URBANIST }}>
                  ספקים בשלב זה
                </div>
                <button
                  onClick={() => navigate(`/resident/categories/${current.catIds[0]}`)}
                  className="text-[11px] font-bold text-[#0E6B5A] flex items-center gap-0.5 active:scale-95"
                >
                  לכל הספקים <ChevronLeft className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2">
                {stageSuppliers.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/suppliers/${s.id}`)}
                    className="w-full flex items-center gap-3 p-2.5 bg-[#FAFAF7] rounded-xl text-right active:scale-[0.99] transition-transform"
                  >
                    <SupplierLogo name={s.business_name} logoUrl={s.logo_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-[#1A1A1A] truncate" style={{ fontFamily: URBANIST }}>
                        {s.business_name}
                      </div>
                      <div className="flex items-center gap-1 text-[10.5px] text-gray-500">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="tabular-nums">{(4.6 + (i % 3) * 0.1).toFixed(1)}</span>
                        <span>·</span>
                        <span className="truncate">{s.short_description || "ספק מומלץ"}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        statuses[i] === "הוזמן" ? "bg-green-100 text-green-700"
                        : statuses[i] === "בתהליך" ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {statuses[i] || "להזמין"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="mt-6 mb-3 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-[14px] font-extrabold text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
            מומלץ לבצע עכשיו
          </h3>
        </div>
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
          {current.recommendations.map((r) => (
            <div
              key={r.title}
              className="shrink-0 w-[160px] bg-white rounded-2xl p-3 border border-gray-100 shadow-sm"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px] mb-2"
                style={{ background: "#F0F9F6" }}
              >
                <span aria-hidden>{r.emoji}</span>
              </div>
              <div className="text-[12.5px] font-extrabold text-[#1A1A1A] leading-tight" style={{ fontFamily: URBANIST }}>
                {r.title}
              </div>
              <div className="text-[10.5px] text-gray-500 mt-0.5 leading-tight">
                {r.subtitle}
              </div>
              <button className="mt-2 text-[10.5px] font-bold text-[#0E6B5A] flex items-center gap-0.5">
                לצפייה <ChevronLeft className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky budget card */}
      <button
        onClick={() => setBudgetOpen(true)}
        className="fixed left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-[var(--app-max-w)] rounded-2xl p-3.5 shadow-2xl shadow-black/30 text-white text-right active:scale-[0.99] transition-transform"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 10px)",
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[12.5px] font-extrabold" style={{ fontFamily: URBANIST }}>
              בניית תקציב
            </span>
            <Pencil className="h-3 w-3 text-white/70" />
          </div>
          <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-full">
            {overPct === 0 ? "בתקציב" : `${overPct}% חריגה`}
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="leading-tight">
            <div className="text-[18px] font-extrabold tabular-nums" style={{ fontFamily: URBANIST }}>
              ₪{budgetUsed.toLocaleString()}
            </div>
            <div className="text-[10.5px] text-white/70 tabular-nums">
              מתוך ₪{budgetTotal.toLocaleString()} נוצל
            </div>
          </div>
          <div className="text-left leading-tight">
            <div className="flex items-center gap-1 text-[10.5px] text-white/70 justify-end">
              <Zap className="h-3 w-3" />
              חיסכון קבוצתי
            </div>
            <div className="text-[14px] font-extrabold text-[#FFD66B] tabular-nums" style={{ fontFamily: URBANIST }}>
              ₪{groupSavings.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full"
            style={{ width: budgetTotal > 0 ? `${Math.min(100, Math.round((budgetUsed / budgetTotal) * 100))}%` : "0%" }}
          />
        </div>
      </button>

      {editInfoOpen && (
        <EditInfoModal
          info={info}
          onClose={() => setEditInfoOpen(false)}
          onSave={(next) => { setInfo(next); setEditInfoOpen(false); }}
        />
      )}

      {scheduleOpen && (
        <ScheduleModal
          schedule={schedule}
          onClose={() => setScheduleOpen(false)}
          onSave={(next) => { setSchedule(next); setScheduleOpen(false); }}
        />
      )}

      {budgetOpen && (
        <BudgetModal
          budget={budget}
          groupSavings={info.groupSavings}
          onClose={() => setBudgetOpen(false)}
          onSave={(items, savings) => {
            setBudget(items);
            setInfo((p) => ({ ...p, groupSavings: savings }));
            setBudgetOpen(false);
          }}
        />
      )}

      <BottomNav role="resident" />
    </div>
  );
}

function InfoChip({
  icon, label, value, onClick,
}: { icon: React.ReactNode; label: string; value: string; onClick?: () => void }) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`bg-[#F0F9F6] rounded-xl px-2 py-2 text-center w-full ${onClick ? "active:scale-[0.97] transition-transform" : ""}`}
    >
      <div className="flex items-center justify-center gap-1 text-[#0E6B5A] mb-0.5">
        {icon}
        <span className="text-[10px] font-bold">{label}</span>
      </div>
      <div className="text-[11.5px] font-extrabold text-[#1A1A1A] truncate" style={{ fontFamily: URBANIST }}>
        {value}
      </div>
    </Comp>
  );
}

/* ===================== Edit Info Modal ===================== */

function EditInfoModal({
  info, onClose, onSave,
}: { info: ProjectInfo; onClose: () => void; onSave: (info: ProjectInfo) => void }) {
  const [form, setForm] = useState({
    name: info.name,
    subtitle: info.subtitle,
    manager: info.manager,
    targetDate: info.targetDate,
  });
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const handleSave = () => {
    onSave({
      ...info,
      name: form.name.trim() || info.name,
      subtitle: form.subtitle.trim(),
      manager: form.manager.trim(),
      targetDate: form.targetDate,
    });
  };

  return (
    <ModalShell title="עריכת פרטי הפרויקט" onClose={onClose}>
      <div className="space-y-3">
        <Field label="שם הפרויקט">
          <TextInput value={form.name} onChange={(v) => set("name", v)} />
        </Field>
        <Field label="תיאור (שטח / קומות)">
          <TextInput value={form.subtitle} onChange={(v) => set("subtitle", v)} />
        </Field>
        <Field label="מנהל הפרויקט">
          <TextInput value={form.manager} onChange={(v) => set("manager", v)} />
        </Field>
        <Field label="תאריך יעד">
          <input
            type="date"
            value={form.targetDate}
            onChange={(e) => set("targetDate", e.target.value)}
            className="w-full bg-[#FAFAF7] rounded-xl px-3 py-2.5 text-[14px] outline-none border border-gray-200 focus:border-[#0E6B5A]"
          />
        </Field>
      </div>
      <ModalActions onCancel={onClose} onSave={handleSave} />
    </ModalShell>
  );
}

/* ===================== Schedule Modal ===================== */

function ScheduleModal({
  schedule, onClose, onSave,
}: {
  schedule: Record<string, ScheduleItem>;
  onClose: () => void;
  onSave: (s: Record<string, ScheduleItem>) => void;
}) {
  const [form, setForm] = useState<Record<string, ScheduleItem>>(() => {
    const next: Record<string, ScheduleItem> = {};
    STAGES.forEach((s) => {
      next[s.key] = schedule[s.key] || { start: "", end: "" };
    });
    return next;
  });
  const set = (key: string, field: keyof ScheduleItem, v: string) =>
    setForm((p) => ({ ...p, [key]: { ...p[key], [field]: v } }));

  return (
    <ModalShell title="לוח זמנים — שלבי הפרויקט" onClose={onClose}>
      <div className="space-y-3">
        {STAGES.map((s) => (
          <div key={s.key} className="bg-[#FAFAF7] rounded-2xl p-3 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[16px]" aria-hidden>{s.emoji}</span>
              <div className="text-[13px] font-extrabold text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
                {s.num}. {s.title}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="התחלה">
                <input
                  type="date"
                  value={form[s.key].start}
                  onChange={(e) => set(s.key, "start", e.target.value)}
                  className="w-full bg-white rounded-xl px-2.5 py-2 text-[13px] outline-none border border-gray-200 focus:border-[#0E6B5A]"
                />
              </Field>
              <Field label="סיום">
                <input
                  type="date"
                  value={form[s.key].end}
                  onChange={(e) => set(s.key, "end", e.target.value)}
                  className="w-full bg-white rounded-xl px-2.5 py-2 text-[13px] outline-none border border-gray-200 focus:border-[#0E6B5A]"
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <ModalActions onCancel={onClose} onSave={() => onSave(form)} />
    </ModalShell>
  );
}

/* ===================== Budget Modal ===================== */

function BudgetModal({
  budget, groupSavings, onClose, onSave,
}: {
  budget: BudgetItem[];
  groupSavings: number;
  onClose: () => void;
  onSave: (items: BudgetItem[], savings: number) => void;
}) {
  const [items, setItems] = useState<BudgetItem[]>(budget);
  const [savings, setSavings] = useState<string>(String(groupSavings ?? ""));
  const onlyDigits = (v: string) => v.replace(/[^\d]/g, "");

  const update = (id: string, patch: Partial<BudgetItem>) =>
    setItems((p) => p.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => setItems((p) => p.filter((it) => it.id !== id));
  const add = () =>
    setItems((p) => [...p, { id: uid(), label: "", planned: 0, actual: 0 }]);

  // Auto-sync from resident task completions (mark related budget items as fully spent)
  const syncFromSelections = () => {
    try {
      const completed = JSON.parse(localStorage.getItem("gb:pm:tasks") || "{}");
      const completedCats = new Set<string>();
      STAGES.forEach((s) => {
        const allDone = s.tasks.length > 0 && s.tasks.every((t) => completed[`${s.key}::${t}`]);
        if (allDone) s.catIds.forEach((c) => completedCats.add(c));
      });
      setItems((p) =>
        p.map((it) =>
          it.catId && completedCats.has(it.catId) && (!it.actual || it.actual === 0)
            ? { ...it, actual: it.planned }
            : it
        )
      );
    } catch {}
  };

  const totalPlanned = items.reduce((s, b) => s + (b.planned || 0), 0);
  const totalActual = items.reduce((s, b) => s + (b.actual || 0), 0);

  const handleSave = () => {
    const clean = items
      .filter((it) => it.label.trim() || it.planned > 0 || it.actual > 0)
      .map((it) => ({
        ...it,
        label: it.label.trim() || "ללא שם",
        planned: Math.max(0, Math.round(it.planned || 0)),
        actual: Math.max(0, Math.round(it.actual || 0)),
      }));
    onSave(clean, Math.max(0, parseInt(savings, 10) || 0));
  };

  return (
    <ModalShell title="בניית תקציב" onClose={onClose}>
      <div className="bg-[#F0F9F6] rounded-2xl p-3 border border-[#0E6B5A]/15 mb-3">
        <div className="flex items-center justify-between text-[12px]">
          <div className="text-gray-600">
            סה״כ מתוכנן: <span className="font-extrabold tabular-nums text-[#0A5447]">₪{totalPlanned.toLocaleString()}</span>
          </div>
          <div className="text-gray-600">
            נוצל: <span className="font-extrabold tabular-nums text-[#0A5447]">₪{totalActual.toLocaleString()}</span>
          </div>
        </div>
        <button
          onClick={syncFromSelections}
          className="mt-2 w-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#0E6B5A] bg-white border border-[#0E6B5A]/20 rounded-xl py-2 active:scale-[0.98]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          סנכרון אוטומטי לפי בחירות הדייר
        </button>
      </div>

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="bg-[#FAFAF7] rounded-2xl p-3 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <input
                value={it.label}
                onChange={(e) => update(it.id, { label: e.target.value })}
                placeholder="שם סעיף"
                className="flex-1 bg-white rounded-xl px-2.5 py-2 text-[13px] font-bold outline-none border border-gray-200 focus:border-[#0E6B5A]"
              />
              <button
                onClick={() => remove(it.id)}
                className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center active:scale-95"
                aria-label="מחיקה"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="מתוכנן (₪)">
                <input
                  type="text" inputMode="numeric" dir="ltr"
                  value={it.planned ? String(it.planned) : ""}
                  onChange={(e) => update(it.id, { planned: parseInt(onlyDigits(e.target.value), 10) || 0 })}
                  className="w-full bg-white rounded-xl px-2.5 py-2 text-[13px] tabular-nums outline-none border border-gray-200 focus:border-[#0E6B5A] text-right"
                />
              </Field>
              <Field label="נוצל (₪)">
                <input
                  type="text" inputMode="numeric" dir="ltr"
                  value={it.actual ? String(it.actual) : ""}
                  onChange={(e) => update(it.id, { actual: parseInt(onlyDigits(e.target.value), 10) || 0 })}
                  className="w-full bg-white rounded-xl px-2.5 py-2 text-[13px] tabular-nums outline-none border border-gray-200 focus:border-[#0E6B5A] text-right"
                />
              </Field>
            </div>
          </div>
        ))}
        <button
          onClick={add}
          className="w-full flex items-center justify-center gap-1.5 text-[13px] font-bold text-[#0E6B5A] bg-white border-2 border-dashed border-[#0E6B5A]/30 rounded-2xl py-3 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          הוספת סעיף
        </button>

        <Field label="חיסכון קבוצתי (₪)">
          <input
            type="text" inputMode="numeric" dir="ltr"
            value={savings}
            onChange={(e) => setSavings(onlyDigits(e.target.value))}
            className="w-full bg-[#FAFAF7] rounded-xl px-3 py-2.5 text-[14px] tabular-nums outline-none border border-gray-200 focus:border-[#0E6B5A] text-right"
          />
        </Field>
      </div>

      <ModalActions onCancel={onClose} onSave={handleSave} />
    </ModalShell>
  );
}

/* ===================== Shared bits ===================== */

function ModalShell({
  title, children, onClose,
}: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
      style={{ fontFamily: EPILOGUE }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[80dvh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 pb-3 shrink-0">
          <h3 className="text-[16px] font-extrabold text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-95"
            aria-label="סגירה"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto min-h-0 px-5"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 120px)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="flex gap-2 mt-5">
      <button
        onClick={onCancel}
        className="flex-1 py-3 rounded-2xl text-[14px] font-bold text-gray-700 bg-gray-100 active:scale-[0.98]"
      >
        ביטול
      </button>
      <button
        onClick={onSave}
        className="flex-1 py-3 rounded-2xl text-[14px] font-extrabold text-white active:scale-[0.98]"
        style={{ background: BRAND, fontFamily: URBANIST }}
      >
        שמירה
      </button>
    </div>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#FAFAF7] rounded-xl px-3 py-2.5 text-[14px] outline-none border border-gray-200 focus:border-[#0E6B5A]"
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-bold text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
