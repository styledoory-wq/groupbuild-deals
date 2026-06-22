import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, ChevronRight, ChevronLeft, Sparkles, Users, Tag, ScanLine,
  CheckSquare, Briefcase, HelpCircle, type LucideIcon,
} from "lucide-react";

const GREEN = "#0E6B5A";

type Role = "resident" | "supplier";

type Slide = {
  icon: LucideIcon;
  title: string;
  body: string;
  accent?: string;
};

type TourStep = {
  selector: string;
  title: string;
  body: string;
};

const RESIDENT_SLIDES: Slide[] = [
  {
    icon: Sparkles,
    title: "ברוכים הבאים ל-GroupBuild",
    body: "האפליקציה מחברת בין דיירים שמשפצים או בונים לבין ספקים מובילים, ומאפשרת להצטרף לרכישות קבוצתיות כדי לחסוך עשרות אחוזים.",
  },
  {
    icon: Users,
    title: "כוח של קבוצה",
    body: "ככל שיותר דיירים מצטרפים לאותה הצעה — המחיר יורד. אתם רואים בזמן אמת כמה אנשים כבר הצטרפו ומה המחיר הנוכחי שלכם.",
  },
  {
    icon: Tag,
    title: "עסקאות מותאמות אליכם",
    body: "אנחנו מציגים לכם רק עסקאות שרלוונטיות לאזור שלכם, לשלב שבו אתם נמצאים בפרויקט, ולתחומים שמעניינים אתכם.",
  },
  {
    icon: CheckSquare,
    title: "הצטרפות פשוטה",
    body: "בוחרים הצעה, מצטרפים ומשלמים דמי רצינות. כשהקבוצה מגיעה ליעד — מקבלים שובר מימוש לסריקה אצל הספק.",
  },
];

const SUPPLIER_SLIDES: Slide[] = [
  {
    icon: Briefcase,
    title: "ברוכים הבאים, ספקים",
    body: "GroupBuild מביאה אליכם לקוחות מאומתים ומשפצים פעילים מהאזור שלכם — בלי לרדוף אחרי לידים קרים.",
  },
  {
    icon: Tag,
    title: "מנהלים הצעות בקלות",
    body: "צרו הצעות עם מחיר מדורג לפי כמות משתתפים. ככל שיותר דיירים מצטרפים — המחיר ירד אוטומטית והעסקה תיסגר.",
  },
  {
    icon: Users,
    title: "לידים אמיתיים, CRM פשוט",
    body: "כל ליד שמגיע כולל שם, טלפון וההצעה שעניינה אותו. חיוג, וואטסאפ והערות פנימיות במסך אחד.",
  },
  {
    icon: ScanLine,
    title: "סריקה תמיד בהישג יד",
    body: "כפתור הסריקה הצף נמצא בכל מסך. סורקים QR של הלקוח, מאשרים מימוש — וההכנסה נרשמת אוטומטית.",
  },
];

const RESIDENT_TOUR: TourStep[] = [
  { selector: '[data-tour="nav-resident"]', title: "בית", body: "מסך הבית שלכם — סיכום הפרויקט, עסקאות מומלצות ופעילות בקהילה." },
  { selector: '[data-tour="nav-deals"]', title: "עסקאות", body: "כל הרכישות הקבוצתיות הפתוחות. סננו לפי קטגוריה, אזור או שלב בפרויקט." },
  { selector: '[data-tour="nav-categories"]', title: "קטגוריות", body: "דפדפו לפי סוג שירות: עיצוב, חשמל, מטבחים, גמרים ועוד." },
  { selector: '[data-tour="nav-search"]', title: "חיפוש", body: "חפשו ספק, מוצר או עסקה ספציפית — תוצאות מיידיות." },
  { selector: '[data-tour="nav-profile"]', title: "פרופיל", body: "השוברים שלכם, המסמכים, הפיקדונות וההגדרות האישיות." },
];

const SUPPLIER_TOUR: TourStep[] = [
  { selector: '[data-tour="nav-supplier"]', title: "בית", body: "מרכז פעולות — לידים חדשים, הצעה מובילה ופעילות אחרונה במבט אחד." },
  { selector: '[data-tour="nav-leads"]', title: "לידים", body: "ה-CRM שלכם. כל ליד עם שם, טלפון, חיוג מהיר, וואטסאפ והערות פנימיות." },
  { selector: '[data-tour="nav-offers"]', title: "הצעות", body: "ניהול ההצעות — יצירה, עריכה, הפעלה והשהיה. מחיר מדורג לפי כמות מצטרפים." },
  { selector: '[data-tour="nav-revenue"]', title: "הכנסות", body: "כל ההכנסות והמימושים במקום אחד, כולל גרף חודשי והיסטוריית עסקאות." },
  { selector: '[data-tour="nav-account"]', title: "חשבון", body: "פרטי העסק, מנוי, התראות, תמיכה ויציאה." },
  { selector: '[data-tour="fab-scan"]', title: "סריקת QR", body: "הכפתור הצף הזה מלווה אתכם בכל מסך — סורקים שובר לקוח ומאשרים מימוש בלחיצה." },
];

const storageKey = (role: Role) => `gb_onboarded_${role}_v1`;

export function shouldShowOnboarding(role: Role) {
  try { return !localStorage.getItem(storageKey(role)); } catch { return false; }
}

export function markOnboarded(role: Role) {
  try { localStorage.setItem(storageKey(role), "1"); } catch { /* ignore */ }
}

export function resetOnboarding(role: Role) {
  try { localStorage.removeItem(storageKey(role)); } catch { /* ignore */ }
}

type Phase = "intro" | "tour" | "done";

export function OnboardingFlow({
  role,
  open,
  onClose,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
}) {
  const slides = role === "resident" ? RESIDENT_SLIDES : SUPPLIER_SLIDES;
  const tour = role === "resident" ? RESIDENT_TOUR : SUPPLIER_TOUR;
  const [phase, setPhase] = useState<Phase>("intro");
  const [slideIdx, setSlideIdx] = useState(0);
  const [tourIdx, setTourIdx] = useState(0);

  useEffect(() => {
    if (open) { setPhase("intro"); setSlideIdx(0); setTourIdx(0); }
  }, [open]);

  if (!open) return null;

  const finish = () => {
    markOnboarded(role);
    onClose();
  };

  if (phase === "intro") {
    const slide = slides[slideIdx];
    const Icon = slide.icon;
    const isLast = slideIdx === slides.length - 1;
    return createPortal(
      <div
        dir="rtl"
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={finish}
      >
        <div
          className="w-full sm:max-w-[420px] bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <span className="text-[12px] font-semibold text-[#6B7280]">
              {slideIdx + 1} / {slides.length}
            </span>
            <button
              onClick={finish}
              aria-label="סגור"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F3F4F6] text-[#6B7280]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Hero icon */}
          <div className="px-6 pt-2 pb-4 flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: `${GREEN}14` }}
            >
              <Icon size={38} strokeWidth={1.8} className="text-[#0E6B5A]" />
            </div>
            <h2 className="text-[22px] font-extrabold text-[#0F172A] leading-tight mb-2">
              {slide.title}
            </h2>
            <p className="text-[15px] leading-[1.55] text-[#4B5563] max-w-[340px]">
              {slide.body}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 pb-4">
            {slides.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: i === slideIdx ? 22 : 6,
                  background: i === slideIdx ? GREEN : "#E5E7EB",
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 flex items-center gap-2">
            <button
              onClick={finish}
              className="text-[14px] font-semibold text-[#6B7280] px-3 py-3"
            >
              דלג
            </button>
            <div className="flex-1" />
            {slideIdx > 0 && (
              <button
                onClick={() => setSlideIdx((i) => i - 1)}
                className="h-11 w-11 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#374151]"
                aria-label="הקודם"
              >
                <ChevronRight size={20} />
              </button>
            )}
            <button
              onClick={() => {
                if (!isLast) setSlideIdx((i) => i + 1);
                else setPhase("tour");
              }}
              className="h-11 px-5 rounded-full font-bold text-white text-[14.5px] flex items-center gap-1.5 shadow-sm"
              style={{ background: GREEN }}
            >
              {isLast ? "התחל סיור" : "הבא"}
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return <TourOverlay steps={tour} index={tourIdx} setIndex={setTourIdx} onFinish={finish} />;
}

function TourOverlay({
  steps,
  index,
  setIndex,
  onFinish,
}: {
  steps: TourStep[];
  index: number;
  setIndex: (n: number) => void;
  onFinish: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    const step = steps[index];
    const measure = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };
    measure();
    const id = window.setInterval(measure, 250);
    tickRef.current = id;
    window.addEventListener("resize", measure);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      window.removeEventListener("resize", measure);
    };
  }, [index, steps]);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  // Calculate spotlight rect with padding
  const pad = 8;
  const spotlight = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Tooltip position — above the bottom nav (which is at the bottom of viewport)
  const tooltipBottom = rect ? Math.max(window.innerHeight - rect.top + 16, 100) : 120;

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[210] pointer-events-none">
      {/* Dimmed overlay with cut-out */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={onFinish}>
        <defs>
          <mask id="gb-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.left}
                y={spotlight.top}
                width={spotlight.width}
                height={spotlight.height}
                rx={14}
                ry={14}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(15,23,42,0.62)" mask="url(#gb-tour-mask)" />
        {spotlight && (
          <rect
            x={spotlight.left}
            y={spotlight.top}
            width={spotlight.width}
            height={spotlight.height}
            rx={14}
            ry={14}
            fill="none"
            stroke="#0E6B5A"
            strokeWidth={2.5}
          />
        )}
      </svg>

      {/* Tooltip card */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[min(92vw,360px)] bg-white rounded-2xl shadow-2xl p-4 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={{ bottom: tooltipBottom }}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${GREEN}14`, color: GREEN }}
            >
              שלב {index + 1} / {steps.length}
            </span>
          </div>
          <button
            onClick={onFinish}
            aria-label="סגור"
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#F3F4F6] text-[#6B7280] -mt-1 -ml-1"
          >
            <X size={16} />
          </button>
        </div>
        <h3 className="text-[16px] font-extrabold text-[#0F172A] mb-1">{step.title}</h3>
        <p className="text-[13.5px] leading-[1.5] text-[#4B5563] mb-3">{step.body}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={onFinish}
            className="text-[13px] font-semibold text-[#6B7280] px-2 py-2"
          >
            סיים
          </button>
          <div className="flex-1" />
          {index > 0 && (
            <button
              onClick={() => setIndex(index - 1)}
              className="h-9 px-3 rounded-full border border-[#E5E7EB] text-[#374151] text-[13px] font-semibold flex items-center gap-1"
            >
              <ChevronRight size={16} />
              הקודם
            </button>
          )}
          <button
            onClick={() => (isLast ? onFinish() : setIndex(index + 1))}
            className="h-9 px-4 rounded-full font-bold text-white text-[13px] flex items-center gap-1"
            style={{ background: GREEN }}
          >
            {isLast ? "סיום" : "הבא"}
            {!isLast && <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Floating help button — re-opens the onboarding flow at any time.
 */
export function HelpButton({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  // Auto-open on first visit
  useEffect(() => {
    if (shouldShowOnboarding(role)) {
      const t = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(t);
    }
  }, [role]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="הסבר על האפליקציה"
        className="fixed z-[95] w-11 h-11 rounded-full bg-white border border-[#E5E7EB] shadow-md flex items-center justify-center text-[#0E6B5A] hover:scale-105 active:scale-95 transition-transform"
        style={{
          bottom: "calc(var(--nav-h, 64px) + 12px + env(safe-area-inset-bottom))",
          insetInlineStart: 12,
        }}
      >
        <HelpCircle size={22} strokeWidth={1.9} />
      </button>
      <OnboardingFlow role={role} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
