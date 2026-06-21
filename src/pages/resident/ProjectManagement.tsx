import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Share2, Pencil, Calendar, Clock, User, Check, TrendingUp,
  Star, ChevronLeft, Sparkles, Zap, X,
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
  budgetTotal: number;
  budgetUsed: number;
  groupSavings: number;
};

const PROJECT_INFO_KEY = "gb:pm:info";
const DEFAULT_INFO: ProjectInfo = {
  name: "בית פרטי · נתניה",
  subtitle: 'שטח בנוי: 180 מ"ר · 2 קומות',
  manager: "יוסי בניה",
  targetDate: "2025-10-15",
  budgetTotal: 680000,
  budgetUsed: 248500,
  groupSavings: 32400,
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

const CURRENT_STAGE_IDX = 3; // "מערכות" (4th)

interface SupplierLite {
  id: string; business_name: string; short_description: string | null;
  logo_url: string | null; categories: string[];
}

export default function ProjectManagement() {
  const navigate = useNavigate();
  const { categories } = useApp();
  const [currentIdx, setCurrentIdx] = useState(CURRENT_STAGE_IDX);
  const current = STAGES[currentIdx];

  // Task completion local state
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("gb:pm:tasks") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem("gb:pm:tasks", JSON.stringify(completed)); } catch {}
  }, [completed]);

  const toggleTask = (key: string) => setCompleted((p) => ({ ...p, [key]: !p[key] }));

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

  // Editable project info
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

  const [editOpen, setEditOpen] = useState(false);

  // Budget
  const budgetTotal = info.budgetTotal;
  const budgetUsed = info.budgetUsed;
  const groupSavings = info.groupSavings;
  const overPct = budgetUsed > budgetTotal ? Math.round(((budgetUsed - budgetTotal) / budgetTotal) * 100) : 0;
  const statuses = ["הוזמן", "בתהליך", "הוזמן", "להזמין"];

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
          <button className="flex items-center gap-1 text-[11px] font-bold text-[#0E6B5A] bg-[#0E6B5A]/10 px-2.5 py-1.5 rounded-full active:scale-95">
            <Share2 className="h-3.5 w-3.5" />
            שיתוף
          </button>
        </div>

        {/* Project card */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-[0_8px_24px_-12px_rgba(14,107,90,0.18)]">
          <div className="flex items-start gap-3">
            <div
              className="w-20 h-20 rounded-2xl shrink-0 bg-cover bg-center"
              style={{ backgroundImage: "linear-gradient(135deg,#0E6B5A 0%,#3aa089 100%)" }}
            >
              <div className="w-full h-full flex items-center justify-center text-[36px]">🏡</div>
            </div>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 w-full text-right active:scale-[0.99]"
              >
                <h2 className="text-[16px] font-extrabold text-[#1A1A1A] truncate" style={{ fontFamily: URBANIST }}>
                  {info.name}
                </h2>
                <Pencil className="h-3.5 w-3.5 text-[#0E6B5A] shrink-0" />
              </button>
              <p className="text-[12px] text-gray-500 mt-0.5">{info.subtitle}</p>

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
            <InfoChip icon={<User className="h-3.5 w-3.5" />} label="מנהל" value="יוסי בניה" />
            <InfoChip icon={<Calendar className="h-3.5 w-3.5" />} label="יעד" value="15.10.25" />
            <InfoChip icon={<Clock className="h-3.5 w-3.5" />} label="עדכון" value="היום" />
          </div>
        </div>

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
              const isDone = i < currentIdx;
              return (
                <button
                  key={s.key}
                  onClick={() => setCurrentIdx(i)}
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
                  {i < STAGES.length - 1 && (
                    <div className="absolute top-4 h-0.5 bg-gray-200" style={{ display: "none" }} />
                  )}
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
          <button className="text-[11px] font-bold text-[#0E6B5A] bg-white border border-[#0E6B5A]/20 px-2.5 py-1.5 rounded-full whitespace-nowrap active:scale-95">
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
            <button className="text-[11px] font-bold text-[#0E6B5A] bg-[#0E6B5A]/10 px-2.5 py-1.5 rounded-full active:scale-95 whitespace-nowrap">
              עריכת שלב
            </button>
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
      <div
        className="fixed left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-[var(--app-max-w)] rounded-2xl p-3.5 shadow-2xl shadow-black/30 text-white"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 10px)",
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[12.5px] font-extrabold" style={{ fontFamily: URBANIST }}>
              מעקב תקציב
            </span>
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
            style={{ width: `${Math.round((budgetUsed / budgetTotal) * 100)}%` }}
          />
        </div>
      </div>

      <BottomNav role="resident" />
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#F0F9F6] rounded-xl px-2 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[#0E6B5A] mb-0.5">
        {icon}
        <span className="text-[10px] font-bold">{label}</span>
      </div>
      <div className="text-[11.5px] font-extrabold text-[#1A1A1A] truncate" style={{ fontFamily: URBANIST }}>
        {value}
      </div>
    </div>
  );
}
