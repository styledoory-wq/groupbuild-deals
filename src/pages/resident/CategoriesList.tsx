import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, Search, Star, Tag, MapPin, Sparkles, Trophy, Home, Hammer, Users } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import newBuildImg from "@/assets/journey-new-build.jpg";
import renoImg from "@/assets/journey-renovation.jpg";
import committeeImg from "@/assets/journey-committee.jpg";
import type { ProjectType } from "@/lib/stageCatalog";

const URBANIST = "'Urbanist', system-ui, sans-serif";
const EPILOGUE = "'Epilogue', system-ui, sans-serif";

type Journey = {
  id: ProjectType;
  title: string;
  desc: string;
  img: string;
  icon: typeof Home;
  bg: string;
  cta: string;
  ctaText: string;
  accent: string;
};

const JOURNEYS: Journey[] = [
  {
    id: "new",
    title: "בנייה חדשה",
    desc: "מתכננים בית חדש? נלווה אותך משלב התכנון ועד הכניסה לבית",
    img: newBuildImg,
    icon: Home,
    bg: "#E8F2EC",
    cta: "#0E6B5A",
    ctaText: "#FFFFFF",
    accent: "#0E6B5A",
  },
  {
    id: "reno",
    title: "שיפוץ ובנייה קלה",
    desc: "משדרגים, משפצים או מרחיבים? כל הספקים לשיפוץ מוצלח",
    img: renoImg,
    icon: Hammer,
    bg: "#F5EEE1",
    cta: "#A47148",
    ctaText: "#FFFFFF",
    accent: "#A47148",
  },
  {
    id: "building",
    title: "ועד בית ובניין משותף",
    desc: "תחזוקה, שדרוגים וניהול הבניין בצורה חכמה וחסכונית",
    img: committeeImg,
    icon: Users,
    bg: "#E6ECF3",
    cta: "#1E3A63",
    ctaText: "#FFFFFF",
    accent: "#1E3A63",
  },
];

const QUICK_CHIPS = [
  { label: "פופולרי", icon: Star, color: "#F5A524", bg: "#FFF6E4" },
  { label: "במבצע", icon: Tag, color: "#8B5CF6", bg: "#F1EBFB" },
  { label: "קרוב אלי", icon: MapPin, color: "#0E6B5A", bg: "#E4F1EC" },
  { label: "חדש", icon: Sparkles, color: "#2563EB", bg: "#E7EEFB" },
  { label: "הכי נבחרים", icon: Trophy, color: "#DC2626", bg: "#FCE9E9" },
];

export default function CategoriesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const chips = useMemo(() => QUICK_CHIPS, []);

  const openJourney = (id: ProjectType) => {
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
        className="mx-auto w-full max-w-[var(--app-max-w)] px-5 pt-[calc(env(safe-area-inset-top)+16px)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 32px)" }}
      >
        {/* Top bar: bell + brand */}
        <div className="relative flex items-center justify-center mb-6">
          <button
            aria-label="התראות"
            className="absolute right-0 w-10 h-10 flex items-center justify-center active:scale-95 transition-transform"
          >
            <div className="relative">
              <Bell className="h-6 w-6 text-[#1A1A1A]" strokeWidth={2} />
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">3</span>
            </div>
          </button>
          <div className="text-center">
            <div className="text-[20px] font-black tracking-wide text-[#0E6B5A]" style={{ fontFamily: URBANIST }}>
              GROUPBUILD
            </div>
            <div className="text-[10px] text-gray-500 font-medium -mt-0.5">מאחדים דיירים, מורידים מחירים</div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-[28px] font-extrabold text-[#1A1A1A] leading-tight" style={{ fontFamily: URBANIST }}>
            מה הפרויקט שלך?
          </h1>
          <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed px-4">
            בחר את סוג הפרויקט כדי שנציג לך את הספקים בדיוק לפי הצורך שלך
          </p>
        </div>

        {/* 3 journey cards */}
        <div className="space-y-3 mb-8">
          {JOURNEYS.map((j) => {
            const Icon = j.icon;
            return (
              <button
                key={j.id}
                onClick={() => openJourney(j.id)}
                className="w-full text-right relative overflow-hidden rounded-3xl active:scale-[0.985] transition-transform"
                style={{ background: j.bg, boxShadow: "0 10px 24px -18px rgba(0,0,0,0.15)" }}
              >
                {/* chevron left */}
                <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/70 flex items-center justify-center">
                  <ChevronLeft className="h-4 w-4 text-[#1A1A1A]" strokeWidth={2.5} />
                </span>

                {/* content row */}
                <div className="flex items-stretch gap-2 p-4 pl-10">
                  {/* text */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex items-center gap-2 justify-start">
                        <h3 className="text-[17px] font-extrabold text-[#1A1A1A] leading-tight" style={{ fontFamily: URBANIST }}>
                          {j.title}
                        </h3>
                      </div>
                      <p className="text-[12px] text-gray-700/80 mt-1 leading-snug">{j.desc}</p>
                    </div>
                    <div className="mt-3">
                      <span
                        className="inline-flex items-center gap-1 text-[12px] font-bold rounded-full px-3.5 py-1.5"
                        style={{ background: j.cta, color: j.ctaText, fontFamily: URBANIST }}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={3} />
                        התחל
                      </span>
                    </div>
                  </div>

                  {/* image */}
                  <div className="relative shrink-0 w-[128px] h-[110px] rounded-2xl overflow-hidden bg-white/40">
                    <img
                      src={j.img}
                      alt={j.title}
                      loading="lazy"
                      width={720}
                      height={512}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-white/85 flex items-center justify-center"
                    >
                      <Icon className="h-4 w-4" style={{ color: j.accent }} strokeWidth={2.2} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick search */}
        <div className="mb-4">
          <h2 className="text-center text-[16px] font-extrabold text-[#1A1A1A] mb-3" style={{ fontFamily: URBANIST }}>
            חיפוש מהיר
          </h2>
          <div className="relative flex items-center">
            <input
              type="text"
              dir="rtl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
              }}
              placeholder="חפש שירות, ספק או מוצר..."
              className="w-full bg-white border border-gray-200 rounded-2xl py-3 pr-4 pl-11 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#0E6B5A]/20 focus:border-[#0E6B5A] transition-all shadow-sm"
            />
            <Search className="absolute left-4 h-5 w-5 text-gray-400" strokeWidth={2.5} />
          </div>
        </div>

        {/* Chip row */}
        <div className="flex justify-between gap-1.5 mb-5">
          {chips.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.label}
                className="flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: c.bg }}
                >
                  <Icon className="h-5 w-5" style={{ color: c.color }} strokeWidth={2.4} />
                </div>
                <span className="text-[10.5px] font-bold text-gray-700" style={{ fontFamily: URBANIST }}>
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Info banner */}
        <div className="rounded-2xl px-4 py-3 text-center border border-gray-100 bg-white/70">
          <p className="text-[12px] text-gray-700 font-semibold" style={{ fontFamily: URBANIST }}>
            ככל שמצטרפים יותר, המחיר יורד לכולם
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">מחירים קבוצתיים חכמים – חסכון אמיתי</p>
        </div>
      </div>

      <BottomNav role="resident" />
    </div>
  );
}
