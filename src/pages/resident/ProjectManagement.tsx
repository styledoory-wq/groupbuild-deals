import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import { useFeatureFlag } from "@/lib/featureFlags";
import {
  PROJECT_INFO_KEY as PM_INFO_KEY,
  SCHEDULE_KEY as PM_SCHEDULE_KEY,
  BUDGET_KEY as PM_BUDGET_KEY,
  BUDGET_TOTAL_KEY as PM_BUDGET_TOTAL_KEY,
  CURRENT_IDX_KEY as PM_CURRENT_IDX_KEY,
  TASKS_KEY as PM_TASKS_KEY,
  writeProjectProgress,
  notifyProjectChanged,
} from "@/lib/projectStore";

const URBANIST = "'Urbanist', system-ui, sans-serif";
const EPILOGUE = "'Epilogue', system-ui, sans-serif";
const BRAND = "#0E6B5A";
const BRAND_DARK = "#0A5447";

export type ProjectType =
  | "new_build"
  | "renovation"
  | "extension"
  | "mamad"
  | "committee"
  | "point_service";

type ProjectInfo = {
  name: string;
  subtitle: string;
  manager: string;
  targetDate: string; // YYYY-MM-DD
  groupSavings: number;
  projectType?: ProjectType;
  // Type-specific fields (only relevant ones are used per type)
  area?: number;          // מ"ר — new_build / renovation / extension / mamad
  rooms?: number;         // חדרים
  floors?: number;        // קומות — new_build / extension
  standard?: "basic" | "standard" | "luxury"; // רמת גמר
  scope?: string[];       // renovation scope: kitchen/bath/floor/electric...
  mamadType?: "new" | "upgrade"; // ממ״ד חדש / שדרוג קיים
  units?: number;         // ועד בית — יח״ד בבניין
  committeeService?: string; // סוג שירות משותף
  serviceCategory?: string;  // שירות נקודתי
  serviceDetails?: string;
};

type ScheduleItem = { start: string; end: string };
type BudgetItem = { id: string; label: string; planned: number; actual: number; catId?: string; category?: string; date?: string; note?: string };

const PROJECT_INFO_KEY = PM_INFO_KEY;
const SCHEDULE_KEY = PM_SCHEDULE_KEY;
const BUDGET_KEY = PM_BUDGET_KEY;
const BUDGET_TOTAL_KEY = PM_BUDGET_TOTAL_KEY;
const CURRENT_IDX_KEY = PM_CURRENT_IDX_KEY;
const TASKS_KEY = PM_TASKS_KEY;

const DEFAULT_INFO: ProjectInfo = {
  name: "",
  subtitle: "",
  manager: "",
  targetDate: "",
  groupSavings: 0,
};

const PROJECT_TYPES: { key: ProjectType; label: string; emoji: string; desc: string }[] = [
  { key: "new_build",     label: "בנייה חדשה",           emoji: "🏗️", desc: "וילה / בית פרטי מהיסוד" },
  { key: "renovation",    label: "שיפוץ",                emoji: "🔨", desc: "שיפוץ דירה / בית קיים" },
  { key: "extension",     label: "תוספת בנייה",          emoji: "➕", desc: "חדר, קומה או הרחבה" },
  { key: "mamad",         label: "ממ״ד",                 emoji: "🛡️", desc: "בנייה או שדרוג ממ״ד" },
  { key: "committee",     label: "ועד בית / בניין משותף", emoji: "🏢", desc: "רכישות ושירותים לבניין" },
  { key: "point_service", label: "שירות נקודתי",         emoji: "🧰", desc: "שירות/מוצר בודד" },
];

const RENOVATION_SCOPE_OPTS = [
  { id: "kitchen",  label: "מטבח" },
  { id: "bath",     label: "אמבטיה" },
  { id: "flooring", label: "ריצוף" },
  { id: "electric", label: "חשמל" },
  { id: "plumbing", label: "אינסטלציה" },
  { id: "paint",    label: "צבע" },
  { id: "windows",  label: "חלונות ודלתות" },
];

const STANDARD_OPTS: { id: NonNullable<ProjectInfo["standard"]>; label: string }[] = [
  { id: "basic", label: "בסיסי" },
  { id: "standard", label: "סטנדרטי" },
  { id: "luxury", label: "יוקרתי" },
];

const COMMITTEE_SERVICES = ["ניקיון", "גינון", "מעלית", "חשמל משותף", "צביעה", "אחר"];
const POINT_SERVICE_CATS = ["מיזוג", "דלתות", "ריצוף", "צבע", "אינסטלציה", "חשמל", "מטבח", "אחר"];

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

const NEW_BUILD_STAGES: Stage[] = [
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

const RENOVATION_STAGES: Stage[] = [
  { key: "reno-plan", num: 1, title: "תכנון ואפיון", short: "תכנון", emoji: "📐",
    catIds: ["interior-designer", "architect"],
    tasks: ["הגדרת היקף השיפוץ", "תכנון פנים", "הכנת כתב כמויות", "בחירת ספקים"],
    recommendations: [
      { title: "מעצב פנים", subtitle: "תכנון חכם לחלל", emoji: "🎨" },
      { title: "יועץ תאורה", subtitle: "אווירה ותפקוד", emoji: "💡" },
      { title: "מנהל שיפוץ", subtitle: "ליווי צמוד", emoji: "📋" },
    ],
  },
  { key: "reno-demo", num: 2, title: "פירוקים והכנות", short: "פירוקים", emoji: "🔨",
    catIds: ["contractor"],
    tasks: ["פינוי תכולה", "פירוק ריצוף וקירות", "פינוי פסולת", "הכנת השטח"],
    recommendations: [
      { title: "פינוי פסולת", subtitle: "מכולה + פינוי", emoji: "🚛" },
      { title: "אחסון תכולה", subtitle: "פתרון זמני", emoji: "📦" },
      { title: "הגנה על רהיטים", subtitle: "כיסויים ויריעות", emoji: "🛡️" },
    ],
  },
  { key: "reno-systems", num: 3, title: "מערכות ותשתיות", short: "מערכות", emoji: "⚡",
    catIds: ["electric", "plumbing", "ac"],
    tasks: ["החלפת חשמל", "החלפת אינסטלציה", "התקנת מיזוג", "בדיקות תקינות"],
    recommendations: [
      { title: "חשמלאי מוסמך", subtitle: "החלפת לוח וקווים", emoji: "⚡" },
      { title: "אינסטלטור מומחה", subtitle: "צנרת חדשה", emoji: "🔧" },
      { title: "מיזוג מיני-מרכזי", subtitle: "התקנה מקצועית", emoji: "❄️" },
    ],
  },
  { key: "reno-kitchen-bath", num: 4, title: "מטבח ואמבטיה", short: "מטבח", emoji: "🚿",
    catIds: ["kitchen", "bath"],
    tasks: ["התקנת מטבח", "חיפוי אמבטיה", "התקנת כלים סניטריים", "חיבור מים וחשמל"],
    recommendations: [
      { title: "יצרן מטבחים", subtitle: "התאמה אישית", emoji: "🍳" },
      { title: "כלים סניטריים", subtitle: "מבחר איכותי", emoji: "🚿" },
      { title: "אריחים ופסיפס", subtitle: "עיצוב יוקרתי", emoji: "🟦" },
    ],
  },
  { key: "reno-floor-paint", num: 5, title: "ריצוף וצבע", short: "גמרים", emoji: "🎨",
    catIds: ["flooring", "painting", "carpentry"],
    tasks: ["ריצוף וחיפוי", "צביעה וגבס", "התקנת דלתות פנים", "נגרות פנים"],
    recommendations: [
      { title: "צבעים איכותיים", subtitle: "גימור מושלם", emoji: "🎨" },
      { title: "ריצוף פורצלן", subtitle: "עמידות ויופי", emoji: "🟫" },
      { title: "נגר פנים", subtitle: "ארונות בהתאמה", emoji: "🪵" },
    ],
  },
  { key: "reno-handoff", num: 6, title: "סיום ומסירה", short: "מסירה", emoji: "✨",
    catIds: [],
    tasks: ["ניקיון פוסט-שיפוץ", "בדיקת ליקויים", "תיקונים אחרונים", "החזרת תכולה"],
    recommendations: [
      { title: "ניקיון יסודי", subtitle: "פוסט-שיפוץ", emoji: "🧽" },
      { title: "בדק ליקויים", subtitle: "דו״ח מקצועי", emoji: "📋" },
      { title: "הובלה פנימית", subtitle: "החזרת רהיטים", emoji: "📦" },
    ],
  },
];

const EXTENSION_STAGES: Stage[] = [
  { key: "ext-plan", num: 1, title: "תכנון והיתרים", short: "תכנון", emoji: "📐",
    catIds: ["architect", "consultant"],
    tasks: ["תכנון תוספת", "בדיקת התכנות", "הגשת היתר", "אישור שכנים"],
    recommendations: [
      { title: "אדריכל תוספות", subtitle: "התמחות בהרחבות", emoji: "📐" },
      { title: "יועץ קרקע", subtitle: "בדיקות מקדימות", emoji: "🌍" },
      { title: "עורך דין מקרקעין", subtitle: "אישור שכנים", emoji: "⚖️" },
    ],
  },
  { key: "ext-structure", num: 2, title: "שלד וחיזוקים", short: "שלד", emoji: "🏗️",
    catIds: ["contractor", "skeleton"],
    tasks: ["חיזוק שלד קיים", "יציקת יסודות תוספת", "בניית שלד חדש", "חיבור למבנה"],
    recommendations: [
      { title: "קבלן שלד מנוסה", subtitle: "עבודות תוספת", emoji: "🏗️" },
      { title: "חיזוק קונסטרוקטיבי", subtitle: "עבודות ברזל", emoji: "🔩" },
      { title: "ביטוח עבודות", subtitle: "כיסוי מלא", emoji: "🛡️" },
    ],
  },
  { key: "ext-envelope", num: 3, title: "מעטפת ואיטום", short: "מעטפת", emoji: "🧱",
    catIds: ["cladding", "windows"],
    tasks: ["איטום גג ותפרים", "התקנת חלונות", "חיפוי חיצוני", "התאמה לחזית"],
    recommendations: [
      { title: "איטום מקצועי", subtitle: "תפרי חיבור", emoji: "💧" },
      { title: "חלונות מבודדים", subtitle: "בידוד תרמי", emoji: "🪟" },
      { title: "חיפוי תואם", subtitle: "התאמה למבנה קיים", emoji: "🧱" },
    ],
  },
  { key: "ext-systems", num: 4, title: "מערכות וגמרים", short: "גמרים", emoji: "🎨",
    catIds: ["electric", "plumbing", "flooring", "painting"],
    tasks: ["הרחבת חשמל", "הרחבת אינסטלציה", "ריצוף וצבע", "התאמה לחלל הקיים"],
    recommendations: [
      { title: "חשמלאי", subtitle: "הרחבת לוח", emoji: "⚡" },
      { title: "ריצוף מותאם", subtitle: "המשכיות עיצובית", emoji: "🟫" },
      { title: "צבע וגמרים", subtitle: "התאמה למבנה", emoji: "🎨" },
    ],
  },
  { key: "ext-handoff", num: 5, title: "מסירה ואיכלוס", short: "מסירה", emoji: "🎉",
    catIds: [],
    tasks: ["בדיקת ליקויים", "ניקיון סופי", "קבלת טופס 4", "איכלוס"],
    recommendations: [
      { title: "בדק בית", subtitle: "אינדקס ליקויים", emoji: "📋" },
      { title: "ניקיון פוסט-בנייה", subtitle: "מקצועי", emoji: "🧽" },
      { title: "ריהוט תוספת", subtitle: "התאמה אישית", emoji: "🛋️" },
    ],
  },
];

const MAMAD_STAGES: Stage[] = [
  { key: "mamad-plan", num: 1, title: "תכנון ואישורים", short: "תכנון", emoji: "📐",
    catIds: ["architect", "consultant"],
    tasks: ["תכנון לפי תקן פיקוד העורף", "הגשת בקשה להיתר", "אישור מהנדס", "אישור פיקוד העורף"],
    recommendations: [
      { title: "מהנדס מומחה ממ״ד", subtitle: "תקני פיקוד העורף", emoji: "🛡️" },
      { title: "אדריכל ממ״ד", subtitle: "שילוב בדירה", emoji: "📐" },
      { title: "יועץ בטיחות", subtitle: "אישורים ותקנים", emoji: "✅" },
    ],
  },
  { key: "mamad-structure", num: 2, title: "בנייה ויציקה", short: "יציקה", emoji: "🏗️",
    catIds: ["contractor", "skeleton"],
    tasks: ["חפירה וביסוס", "יציקת רצפה מזוינת", "יציקת קירות בטון", "יציקת תקרה"],
    recommendations: [
      { title: "קבלן ממ״ד מוסמך", subtitle: "ניסיון מוכח", emoji: "🏗️" },
      { title: "ברזל בנייה", subtitle: "אספקה לאתר", emoji: "🔩" },
      { title: "בטון מזוין", subtitle: "משאבות בטון", emoji: "🧱" },
    ],
  },
  { key: "mamad-door", num: 3, title: "דלת וחלון ממ״ד", short: "דלת", emoji: "🚪",
    catIds: ["windows"],
    tasks: ["התקנת דלת ממ״ד תקנית", "התקנת חלון אטום", "מערכת סינון אוויר", "בדיקת אטימות"],
    recommendations: [
      { title: "יבואן דלתות ממ״ד", subtitle: "תקן ישראלי", emoji: "🚪" },
      { title: "חלון ממ״ד", subtitle: "אטום ומזוין", emoji: "🪟" },
      { title: "מערכת סינון", subtitle: "NBC filter", emoji: "🌬️" },
    ],
  },
  { key: "mamad-finish", num: 4, title: "גמרים ואישור", short: "אישור", emoji: "✅",
    catIds: ["electric", "painting", "flooring"],
    tasks: ["חשמל ותאורה", "ריצוף וצבע", "בדיקת פיקוד העורף", "קבלת אישור סופי"],
    recommendations: [
      { title: "חשמלאי מוסמך", subtitle: "תקן ממ״ד", emoji: "⚡" },
      { title: "ריצוף וצבע", subtitle: "גימור פנים", emoji: "🎨" },
      { title: "בדיקת קבלה", subtitle: "אישור רשמי", emoji: "📋" },
    ],
  },
];

const COMMITTEE_STAGES: Stage[] = [
  { key: "com-needs", num: 1, title: "אפיון צרכים", short: "אפיון", emoji: "📋",
    catIds: [],
    tasks: ["איסוף פניות דיירים", "קביעת סדרי עדיפויות", "אישור אסיפת דיירים", "הגדרת תקציב"],
    recommendations: [
      { title: "יועץ ועד בית", subtitle: "ליווי מקצועי", emoji: "🏢" },
      { title: "עורך דין ועדים", subtitle: "החלטות חוקיות", emoji: "⚖️" },
      { title: "מערכת ניהול", subtitle: "דיגיטלית לוועד", emoji: "📱" },
    ],
  },
  { key: "com-quotes", num: 2, title: "בקשת הצעות", short: "הצעות", emoji: "💼",
    catIds: [],
    tasks: ["פנייה לספקים", "השוואת הצעות", "בדיקת המלצות", "הצגה לדיירים"],
    recommendations: [
      { title: "השוואת מחירים", subtitle: "רכישה קבוצתית", emoji: "💰" },
      { title: "בדיקת ספקים", subtitle: "ביקורות ואמינות", emoji: "⭐" },
      { title: "מכרז דיגיטלי", subtitle: "פלטפורמה שקופה", emoji: "📊" },
    ],
  },
  { key: "com-select", num: 3, title: "בחירת ספק וחוזה", short: "חוזה", emoji: "✍️",
    catIds: [],
    tasks: ["הצבעת דיירים", "משא ומתן על תנאים", "חתימה על הסכם", "גיבוש לוח זמנים"],
    recommendations: [
      { title: "הסכם משפטי", subtitle: "בדיקת עו״ד", emoji: "📄" },
      { title: "ביטוח עבודות", subtitle: "כיסוי לרכוש המשותף", emoji: "🛡️" },
      { title: "גובה תשלומים", subtitle: "מערכת גבייה", emoji: "💳" },
    ],
  },
  { key: "com-exec", num: 4, title: "ביצוע ופיקוח", short: "ביצוע", emoji: "🔧",
    catIds: [],
    tasks: ["התחלת עבודות", "פיקוח שוטף", "עדכון דיירים", "אישור אבני דרך"],
    recommendations: [
      { title: "מפקח בנייה", subtitle: "פיקוח שוטף", emoji: "👷" },
      { title: "עדכוני דיירים", subtitle: "וואטסאפ ועד", emoji: "📱" },
      { title: "תיעוד עבודות", subtitle: "תמונות ודוחות", emoji: "📸" },
    ],
  },
  { key: "com-handoff", num: 5, title: "מסירה וסיכום", short: "סיכום", emoji: "✅",
    catIds: [],
    tasks: ["בדיקת עבודות", "אישור סיום", "תשלום סופי", "הפצת דו״ח לדיירים"],
    recommendations: [
      { title: "בדק סופי", subtitle: "בדיקת ליקויים", emoji: "📋" },
      { title: "אחריות ספק", subtitle: "מסמך אחריות", emoji: "🛡️" },
      { title: "דו״ח סיכום", subtitle: "שקיפות מלאה", emoji: "📊" },
    ],
  },
];

const POINT_SERVICE_STAGES: Stage[] = [
  { key: "ps-request", num: 1, title: "הגדרת השירות", short: "הגדרה", emoji: "📝",
    catIds: [],
    tasks: ["פירוט הצורך", "בחירת קטגוריה", "הגדרת לוח זמנים", "קביעת תקציב"],
    recommendations: [
      { title: "יועץ מקצועי", subtitle: "התאמת השירות", emoji: "💡" },
      { title: "בדיקת דחיפות", subtitle: "שירותי חירום", emoji: "⏰" },
      { title: "מחירון שוק", subtitle: "טווח מחירים", emoji: "💰" },
    ],
  },
  { key: "ps-quotes", num: 2, title: "הצעות מחיר", short: "הצעות", emoji: "💼",
    catIds: [],
    tasks: ["פנייה ל-3 ספקים", "השוואת הצעות", "בדיקת ביקורות", "בחירת ספק"],
    recommendations: [
      { title: "השוואת ספקים", subtitle: "מחיר וזמינות", emoji: "📊" },
      { title: "ביקורות אמת", subtitle: "לקוחות אחרונים", emoji: "⭐" },
      { title: "אחריות בכתב", subtitle: "הגנה משפטית", emoji: "📄" },
    ],
  },
  { key: "ps-exec", num: 3, title: "ביצוע השירות", short: "ביצוע", emoji: "🔧",
    catIds: [],
    tasks: ["תיאום מועד", "ביצוע העבודה", "בדיקה בזמן אמת", "אישור השלמה"],
    recommendations: [
      { title: "תיעוד לפני/אחרי", subtitle: "תמונות ובידקה", emoji: "📸" },
      { title: "בדיקת איכות", subtitle: "לפני התשלום", emoji: "✅" },
      { title: "אחריות שירות", subtitle: "מסמך רשמי", emoji: "🛡️" },
    ],
  },
  { key: "ps-done", num: 4, title: "תשלום וסיום", short: "סיום", emoji: "✅",
    catIds: [],
    tasks: ["קבלת חשבונית", "ביצוע תשלום", "כתיבת ביקורת", "שמירת מסמכים"],
    recommendations: [
      { title: "תשלום מאובטח", subtitle: "אמצעי דיגיטלי", emoji: "💳" },
      { title: "ביקורת ללקוחות", subtitle: "עזרה לקהילה", emoji: "⭐" },
      { title: "ארכיון דיגיטלי", subtitle: "שמירת חשבוניות", emoji: "📁" },
    ],
  },
];

const STAGES_BY_TYPE: Record<ProjectType, Stage[]> = {
  new_build: NEW_BUILD_STAGES,
  renovation: RENOVATION_STAGES,
  extension: EXTENSION_STAGES,
  mamad: MAMAD_STAGES,
  committee: COMMITTEE_STAGES,
  point_service: POINT_SERVICE_STAGES,
};

const getStagesFor = (t: ProjectType | undefined): Stage[] =>
  STAGES_BY_TYPE[t ?? "new_build"] ?? NEW_BUILD_STAGES;

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

  // Editable project info — read first so stages can depend on projectType
  const [info, setInfo] = useState<ProjectInfo>(() => {
    try {
      const raw = localStorage.getItem(PROJECT_INFO_KEY);
      if (raw) return { ...DEFAULT_INFO, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_INFO;
  });
  useEffect(() => {
    try { localStorage.setItem(PROJECT_INFO_KEY, JSON.stringify(info)); } catch {}
    notifyProjectChanged();
  }, [info]);

  // Dynamic stages based on project type
  const stages = useMemo(() => getStagesFor(info.projectType), [info.projectType]);

  // Task completion local state
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(TASKS_KEY) || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem(TASKS_KEY, JSON.stringify(completed)); } catch {}
    notifyProjectChanged();
  }, [completed]);

  const toggleTask = (key: string) => setCompleted((p) => ({ ...p, [key]: !p[key] }));

  // Auto-advance stage: derive first incomplete stage; allow manual override.
  const autoIdx = useMemo(() => {
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      if (s.tasks.length === 0) continue;
      const allDone = s.tasks.every((t) => completed[`${s.key}::${t}`]);
      if (!allDone) return i;
    }
    return stages.length - 1;
  }, [completed, stages]);

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
  // Clamp manual index if project type changed and it's now out of range
  useEffect(() => {
    if (manualIdx !== null && manualIdx >= stages.length) {
      setManualIdx(null);
      try { localStorage.removeItem(CURRENT_IDX_KEY); } catch {}
    }
  }, [stages.length, manualIdx]);

  const rawIdx = manualIdx ?? autoIdx;
  const currentIdx = Math.min(Math.max(0, rawIdx), stages.length - 1);
  const current = stages[currentIdx];

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
  const overallDone = stages.reduce(
    (sum, s) => sum + s.tasks.filter((t) => completed[`${s.key}::${t}`]).length, 0
  );
  const overallTotal = stages.reduce((sum, s) => sum + s.tasks.length, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;
  const stagesDone = stages.filter((s) =>
    s.tasks.length > 0 && s.tasks.every((t) => completed[`${s.key}::${t}`])
  ).length;

  // Persist a compact progress snapshot so other screens (dashboard) stay in sync.
  useEffect(() => {
    writeProjectProgress({
      tasksDone: overallDone,
      tasksTotal: overallTotal,
      stageIdx: currentIdx,
      stagesCount: stages.length,
      currentStageTitle: current?.title ?? "",
      updatedAt: Date.now(),
    });
  }, [overallDone, overallTotal, currentIdx, stages.length, current?.title]);


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
    notifyProjectChanged();
  }, [budget]);

  // Total budget (single top-level number set by the resident)
  const [budgetTotal, setBudgetTotal] = useState<number>(() => {
    try { return Number(localStorage.getItem(BUDGET_TOTAL_KEY) || 0); } catch { return 0; }
  });
  useEffect(() => {
    try { localStorage.setItem(BUDGET_TOTAL_KEY, String(budgetTotal || 0)); } catch {}
    notifyProjectChanged();
  }, [budgetTotal]);

  const budgetUsed = budget.reduce((s, b) => s + (b.actual || 0), 0);
  const groupSavings = info.groupSavings;
  const overPct = budgetUsed > budgetTotal && budgetTotal > 0
    ? Math.round(((budgetUsed - budgetTotal) / budgetTotal) * 100) : 0;
  const statuses = ["הוזמן", "בתהליך", "הוזמן", "להזמין"];

  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);

  // Feature flag — AI cost estimate is admin-controlled and hidden by default.
  const aiEstimateEnabled = useFeatureFlag("aiCostEstimate");

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full"
      style={{ background: "#FBF8F3", fontFamily: EPILOGUE, color: "#2D2D2D" }}
    >
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] px-5 pt-[calc(env(safe-area-inset-top)+18px)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
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

        {/* Budget management — persistent primary action */}
        <button
          onClick={() => setBudgetOpen(true)}
          className="mt-4 w-full bg-white rounded-3xl p-4 border border-gray-100 shadow-[0_8px_24px_-12px_rgba(14,107,90,0.18)] text-right active:scale-[0.99] transition-transform flex items-center gap-3"
        >
          <div
            className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-white"
            style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}
            aria-hidden
          >
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[14.5px] font-extrabold text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
                💰 ניהול תקציב
              </h3>
              <span className="text-[9.5px] font-bold text-[#0E6B5A] bg-[#0E6B5A]/10 px-1.5 py-0.5 rounded-full">
                {overPct === 0 ? "בתקציב" : `${overPct}% חריגה`}
              </span>
            </div>
            <p className="text-[11.5px] text-gray-500 mt-1 leading-snug tabular-nums">
              ₪{budgetUsed.toLocaleString()} מתוך ₪{budgetTotal.toLocaleString()}
              {groupSavings > 0 && <> · חיסכון ₪{groupSavings.toLocaleString()}</>}
            </p>
          </div>
          <ChevronLeft className="h-4 w-4 text-gray-400 shrink-0" />
        </button>

        {/* AI Cost Estimation — hidden by default, admin-controlled feature flag */}
        {aiEstimateEnabled && (
          <button
            onClick={() =>
              navigate("/resident/budget-planner", {
                state: {
                  fromProject: true,
                  projectType: info.projectType,
                  area: info.area,
                  rooms: info.rooms,
                  floors: info.floors,
                  standard: info.standard,
                  scope: info.scope,
                  mamadType: info.mamadType,
                  units: info.units,
                  committeeService: info.committeeService,
                  serviceCategory: info.serviceCategory,
                  serviceDetails: info.serviceDetails,
                  projectName: info.name,
                },
              })
            }
            className="mt-3 w-full bg-white rounded-3xl p-4 border border-gray-100 shadow-[0_8px_24px_-12px_rgba(14,107,90,0.18)] text-right active:scale-[0.99] transition-transform flex items-center gap-3"
          >
            <div
              className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-[28px]"
              style={{ background: "linear-gradient(135deg,#EEF4FF 0%,#F5F3FF 100%)" }}
              aria-hidden
            >
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[14.5px] font-extrabold text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
                  אומדן עלות AI
                </h3>
                <span className="text-[9.5px] font-bold text-[#0E6B5A] bg-[#0E6B5A]/10 px-1.5 py-0.5 rounded-full">
                  {info.projectType ? "מותאם אישית" : "שלב תכנון"}
                </span>
              </div>
              <p className="text-[11.5px] text-gray-500 mt-1 leading-snug">
                {info.projectType
                  ? "אומדן חכם לפי סוג הפרויקט והנתונים שהזנת בפרטי הפרויקט."
                  : "מלא/י תחילה את פרטי הפרויקט לקבלת אומדן מדויק ואישי."}
              </p>
            </div>
            <ChevronLeft className="h-4 w-4 text-gray-400 shrink-0" />
          </button>
        )}

        {/* Timeline */}
        <div className="mt-6 mb-2 flex items-center justify-between">
          <h3 className="text-[14px] font-extrabold text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
            שלבי הפרויקט
          </h3>
          <span className="text-[11px] font-bold text-gray-400 tabular-nums">
            {stagesDone}/{stages.length}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 min-w-max relative">
            {stages.map((s, i) => {
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
                {stagesDone} מתוך {stages.length} שלבים הושלמו
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

      {/* Sticky budget card removed — budget is now an inline action button above */}

      {editInfoOpen && (
        <EditInfoModal
          info={info}
          onClose={() => setEditInfoOpen(false)}
          onSave={(next) => { setInfo(next); setEditInfoOpen(false); }}
          onReset={() => {
            try {
              localStorage.removeItem(PROJECT_INFO_KEY);
              localStorage.removeItem(SCHEDULE_KEY);
              localStorage.removeItem(BUDGET_KEY);
              localStorage.removeItem(CURRENT_IDX_KEY);
              localStorage.removeItem(TASKS_KEY);
              localStorage.removeItem("gb:pm:progress");
            } catch {}
            setInfo(DEFAULT_INFO);
            setSchedule({});
            setBudget([]);
            setCompleted({});
            setManualIdx(null);
            setEditInfoOpen(false);
          }}
        />
      )}


      {scheduleOpen && (
        <ScheduleModal
          schedule={schedule}
          stages={stages}
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
  info, onClose, onSave, onReset,
}: { info: ProjectInfo; onClose: () => void; onSave: (info: ProjectInfo) => void; onReset: () => void }) {
  const [form, setForm] = useState<ProjectInfo>({ ...info });
  const [step, setStep] = useState<1 | 2>(info.projectType ? 2 : 1);
  const [confirmReset, setConfirmReset] = useState(false);


  const set = <K extends keyof ProjectInfo>(k: K, v: ProjectInfo[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleScope = (id: string) => {
    const arr = form.scope ?? [];
    set("scope", arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  const pickType = (t: ProjectType) => {
    set("projectType", t);
    setStep(2);
  };

  const handleSave = () => {
    onSave({
      ...form,
      name: (form.name || "").trim() || info.name,
      subtitle: (form.subtitle || "").trim(),
      manager: (form.manager || "").trim(),
    });
  };

  const t = form.projectType;
  const needsArea = t === "new_build" || t === "renovation" || t === "extension" || t === "mamad";
  const needsRooms = t === "new_build" || t === "renovation" || t === "extension";
  const needsFloors = t === "new_build" || t === "extension";
  const needsStandard = t === "new_build" || t === "renovation" || t === "extension";
  const needsScope = t === "renovation";
  const needsMamadType = t === "mamad";
  const needsUnits = t === "committee";
  const needsCommitteeService = t === "committee";
  const needsPointService = t === "point_service";

  const title = step === 1 ? "בחירת סוג הפרויקט" : "פרטי הפרויקט";

  return (
    <ModalShell title={title} onClose={onClose}>
      {step === 1 ? (
        <div className="space-y-2">
          <p className="text-[12.5px] text-gray-500 leading-snug mb-2">
            בחר/י את סוג הפרויקט כדי שנציג רק את השדות הרלוונטיים ואומדן ה-AI יהיה מדויק לתחום שלך.
          </p>
          {PROJECT_TYPES.map((pt) => {
            const sel = form.projectType === pt.key;
            return (
              <button
                key={pt.key}
                onClick={() => pickType(pt.key)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-right active:scale-[0.99] transition"
                style={{
                  background: sel ? "#F0F9F6" : "#FFFFFF",
                  borderColor: sel ? BRAND : "#E5E7EB",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] shrink-0"
                  style={{ background: sel ? "#FFFFFF" : "#FAFAF7" }}
                  aria-hidden
                >
                  {pt.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-extrabold text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
                    {pt.label}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{pt.desc}</div>
                </div>
                {sel && (
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: BRAND }}>
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Selected type header + change */}
          <div className="flex items-center justify-between bg-[#F0F9F6] border border-[#0E6B5A]/15 rounded-2xl p-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[18px]" aria-hidden>
                {PROJECT_TYPES.find((p) => p.key === t)?.emoji}
              </span>
              <div className="text-[13px] font-extrabold text-[#0A5447] truncate" style={{ fontFamily: URBANIST }}>
                {PROJECT_TYPES.find((p) => p.key === t)?.label}
              </div>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-[11px] font-bold text-[#0E6B5A] bg-white border border-[#0E6B5A]/20 px-2.5 py-1 rounded-full active:scale-95"
            >
              שינוי
            </button>
          </div>

          {/* Common fields */}
          <Field label="שם הפרויקט">
            <TextInput value={form.name} onChange={(v) => set("name", v)} />
          </Field>
          <Field label="תיאור קצר (רשות)">
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

          {/* Type-specific fields */}
          {needsArea && (
            <Field label={t === "mamad" ? 'גודל ממ״ד (מ״ר)' : 'שטח (מ״ר)'}>
              <input
                type="number" inputMode="numeric" min={1}
                value={form.area ?? ""}
                onChange={(e) => set("area", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-[#FAFAF7] rounded-xl px-3 py-2.5 text-[14px] tabular-nums outline-none border border-gray-200 focus:border-[#0E6B5A] text-right"
              />
            </Field>
          )}

          {needsRooms && (
            <Field label="מספר חדרים">
              <input
                type="number" inputMode="numeric" min={1}
                value={form.rooms ?? ""}
                onChange={(e) => set("rooms", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-[#FAFAF7] rounded-xl px-3 py-2.5 text-[14px] tabular-nums outline-none border border-gray-200 focus:border-[#0E6B5A] text-right"
              />
            </Field>
          )}

          {needsFloors && (
            <Field label="מספר קומות">
              <input
                type="number" inputMode="numeric" min={1}
                value={form.floors ?? ""}
                onChange={(e) => set("floors", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-[#FAFAF7] rounded-xl px-3 py-2.5 text-[14px] tabular-nums outline-none border border-gray-200 focus:border-[#0E6B5A] text-right"
              />
            </Field>
          )}

          {needsStandard && (
            <Field label="רמת גמר">
              <div className="grid grid-cols-3 gap-2">
                {STANDARD_OPTS.map((o) => {
                  const sel = form.standard === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => set("standard", o.id)}
                      className="py-2 rounded-xl text-[12.5px] font-bold border-2 transition"
                      style={{
                        background: sel ? "#F0F9F6" : "#FFFFFF",
                        borderColor: sel ? BRAND : "#E5E7EB",
                        color: sel ? BRAND_DARK : "#374151",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {needsScope && (
            <Field label="היקף השיפוץ (ניתן לבחור כמה)">
              <div className="flex flex-wrap gap-2">
                {RENOVATION_SCOPE_OPTS.map((o) => {
                  const sel = (form.scope ?? []).includes(o.id);
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggleScope(o.id)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-bold border transition"
                      style={{
                        background: sel ? BRAND : "#FFFFFF",
                        borderColor: sel ? BRAND : "#E5E7EB",
                        color: sel ? "#FFFFFF" : "#374151",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {needsMamadType && (
            <Field label="סוג העבודה">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "new" as const, label: 'בניית ממ״ד חדש' },
                  { id: "upgrade" as const, label: "שדרוג קיים" },
                ].map((o) => {
                  const sel = form.mamadType === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => set("mamadType", o.id)}
                      className="py-2 rounded-xl text-[12.5px] font-bold border-2 transition"
                      style={{
                        background: sel ? "#F0F9F6" : "#FFFFFF",
                        borderColor: sel ? BRAND : "#E5E7EB",
                        color: sel ? BRAND_DARK : "#374151",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {needsUnits && (
            <Field label="מס׳ יחידות דיור בבניין">
              <input
                type="number" inputMode="numeric" min={1}
                value={form.units ?? ""}
                onChange={(e) => set("units", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-[#FAFAF7] rounded-xl px-3 py-2.5 text-[14px] tabular-nums outline-none border border-gray-200 focus:border-[#0E6B5A] text-right"
              />
            </Field>
          )}

          {needsCommitteeService && (
            <Field label="סוג השירות המבוקש">
              <select
                value={form.committeeService ?? ""}
                onChange={(e) => set("committeeService", e.target.value || undefined)}
                className="w-full bg-[#FAFAF7] rounded-xl px-3 py-2.5 text-[14px] outline-none border border-gray-200 focus:border-[#0E6B5A]"
              >
                <option value="">בחר/י…</option>
                {COMMITTEE_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          )}

          {needsPointService && (
            <>
              <Field label="קטגוריית שירות">
                <select
                  value={form.serviceCategory ?? ""}
                  onChange={(e) => set("serviceCategory", e.target.value || undefined)}
                  className="w-full bg-[#FAFAF7] rounded-xl px-3 py-2.5 text-[14px] outline-none border border-gray-200 focus:border-[#0E6B5A]"
                >
                  <option value="">בחר/י…</option>
                  {POINT_SERVICE_CATS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="פירוט קצר">
                <TextInput value={form.serviceDetails ?? ""} onChange={(v) => set("serviceDetails", v)} />
              </Field>
            </>
          )}
        </div>
      )}
      {step === 2 && (
        <>
          <ModalActions onCancel={onClose} onSave={handleSave} />
          <button
            onClick={() => setConfirmReset(true)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-bold text-red-600 bg-red-50 border border-red-100 active:scale-[0.98]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            🔄 איפוס פרויקט
          </button>
        </>
      )}

      {confirmReset && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-y-auto"
          dir="rtl"
          style={{
            fontFamily: EPILOGUE,
            paddingTop: "max(16px, env(safe-area-inset-top))",
            paddingBottom: "calc(max(16px, env(safe-area-inset-bottom)) + 16px)",
            paddingLeft: 16,
            paddingRight: 16,
          }}
          onClick={() => setConfirmReset(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-white rounded-3xl p-5 shadow-2xl my-auto max-h-full overflow-y-auto"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[22px]" aria-hidden>🔄</span>
              <h4 className="text-[15px] font-extrabold text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
                איפוס פרויקט
              </h4>
            </div>
            <p className="text-[12.5px] text-gray-600 leading-relaxed">
              האם אתה בטוח שברצונך לאפס את נתוני הפרויקט? פעולה זו תאפס את פרטי הפרויקט, אומדן ה-AI, שלבי הפרויקט ונתוני ניהול התקציב.
            </p>
            <div className="flex gap-2 mt-4 sticky bottom-0 bg-white pt-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2.5 rounded-2xl text-[13.5px] font-bold text-gray-700 bg-gray-100 active:scale-[0.98]"
              >
                ביטול
              </button>
              <button
                onClick={() => { setConfirmReset(false); onReset(); }}
                className="flex-1 py-2.5 rounded-2xl text-[13.5px] font-extrabold text-white bg-red-600 active:scale-[0.98]"
                style={{ fontFamily: URBANIST }}
              >
                אפס פרויקט
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </ModalShell>
  );
}


/* ===================== Schedule Modal ===================== */

function ScheduleModal({
  schedule, stages, onClose, onSave,
}: {
  schedule: Record<string, ScheduleItem>;
  stages: Stage[];
  onClose: () => void;
  onSave: (s: Record<string, ScheduleItem>) => void;
}) {
  const [form, setForm] = useState<Record<string, ScheduleItem>>(() => {
    const next: Record<string, ScheduleItem> = {};
    stages.forEach((s) => {
      next[s.key] = schedule[s.key] || { start: "", end: "" };
    });
    return next;
  });

  const set = (key: string, field: keyof ScheduleItem, v: string) =>
    setForm((p) => ({ ...p, [key]: { ...p[key], [field]: v } }));

  return (
    <ModalShell title="לוח זמנים — שלבי הפרויקט" onClose={onClose}>
      <div className="space-y-3">
        {stages.map((s) => (
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
      const completed = JSON.parse(localStorage.getItem(TASKS_KEY) || "{}");
      const completedCats = new Set<string>();
      Object.values(STAGES_BY_TYPE).flat().forEach((s) => {
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
