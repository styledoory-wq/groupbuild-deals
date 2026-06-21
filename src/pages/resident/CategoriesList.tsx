import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";

const URBANIST = "'Urbanist', system-ui, sans-serif";
const EPILOGUE = "'Epilogue', system-ui, sans-serif";
const BRAND = "#0E6B5A";

type ProjectType = {
  id: "new" | "reno" | "building";
  emoji: string;
  title: string;
  subtitle: string;
  bullets: string[];
  hint: string;
};

const TYPES: ProjectType[] = [
  {
    id: "new",
    emoji: "🏗️",
    title: "בנייה חדשה",
    subtitle: "מהקרקע ועד מסירת מפתח",
    bullets: ["תכנון והיתרים", "שלד ומעטפת", "מערכות וגמרים"],
    hint: "8 שלבי בנייה · 25+ קטגוריות",
  },
  {
    id: "reno",
    emoji: "🔨",
    title: "שיפוץ",
    subtitle: "שדרוג דירה או חדרים",
    bullets: ["מטבח ואמבטיה", "צבע, חשמל ואינסטלציה", "ריצוף וגמרים"],
    hint: "7 תחומים · ספקים מומלצים",
  },
  {
    id: "building",
    emoji: "🏢",
    title: "בניין משותף",
    subtitle: "ועד בית וניהול שטחים",
    bullets: ["מעליות וניקיון", "גינון ומצלמות", "סולארי ושיפוץ חזית"],
    hint: "8 תחומים · קניה קבוצתית",
  },
];

export default function CategoriesList() {
  const navigate = useNavigate();

  const pick = (id: ProjectType["id"]) => {
    try { localStorage.setItem("gb:projectType", id); } catch {}
    navigate(`/resident/categories/stages?type=${id}`);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full"
      style={{ background: "#FBF8F3", fontFamily: EPILOGUE, color: "#2D2D2D" }}
    >
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] px-5 pt-[calc(env(safe-area-inset-top)+24px)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 32px)" }}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 bg-[#0E6B5A]/10 text-[#0E6B5A] px-2.5 py-1 rounded-full text-[11px] font-bold mb-3">
            <Sparkles className="h-3 w-3" />
            צעד 1 מתוך 2
          </div>
          <h1
            className="text-[28px] font-extrabold tracking-tight text-[#1A1A1A] leading-tight"
            style={{ fontFamily: URBANIST }}
          >
            איזה סוג פרויקט מלווים?
          </h1>
          <p className="text-[14px] text-gray-500 mt-1.5 leading-relaxed">
            בוחרים סוג ומקבלים מסלול שלבים, ספקים והמלצות מותאמים אישית.
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-3.5">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className="group block w-full text-right bg-white rounded-3xl p-5 border border-gray-100 shadow-[0_8px_24px_-12px_rgba(14,107,90,0.18)] active:scale-[0.99] transition-all hover:border-[#0E6B5A]/30 hover:shadow-[0_12px_30px_-12px_rgba(14,107,90,0.28)]"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-[34px] shrink-0"
                  style={{ background: "linear-gradient(135deg,#F0F9F6 0%,#E3F1EC 100%)" }}
                >
                  <span aria-hidden>{t.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2
                      className="text-[19px] font-extrabold text-[#1A1A1A] leading-tight"
                      style={{ fontFamily: URBANIST }}
                    >
                      {t.title}
                    </h2>
                    <ChevronLeft className="h-5 w-5 text-gray-300 group-hover:text-[#0E6B5A] transition-colors shrink-0" />
                  </div>
                  <p className="text-[13px] text-gray-500 mt-0.5">{t.subtitle}</p>

                  <ul className="mt-3 space-y-1">
                    {t.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-1.5 text-[12.5px] text-gray-600">
                        <span className="w-1 h-1 rounded-full bg-[#0E6B5A]" />
                        {b}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] font-bold text-[#0E6B5A] tabular-nums">
                    {t.hint}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Skip to PM */}
        <button
          onClick={() => navigate("/resident/project-management")}
          className="mt-6 w-full text-[13px] font-semibold text-gray-500 underline-offset-4 hover:underline"
        >
          כבר יש לי פרויקט פעיל — לניהול הפרויקט שלי ←
        </button>
      </div>

      <BottomNav role="resident" />
    </div>
  );
}
