import { Link } from "react-router-dom";
import { UserCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { GlobalSearchBar } from "@/components/public/GlobalSearchBar";

const HERO_BG = "/marketing/resident-hero-bg.jpg";

const QUICK_CHIPS = [
  { label: "דלתות", q: "דלתות" },
  { label: "מזגן", q: "מזגן" },
  { label: "חשמלאי", q: "חשמלאי" },
  { label: "ריצוף", q: "ריצוף" },
];

function setResidentIntent() {
  try {
    sessionStorage.setItem("gb_intent", "resident");
  } catch {
    /* ignore */
  }
}

/**
 * Premium Apple-style hero:
 * - Full-bleed sharp photo (majority visible)
 * - Soft dark scrim only behind copy
 * - Long bottom dissolve + organic wave into the page
 */
export function ResidentHomeHero({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      className="relative isolate overflow-hidden"
      style={{ background: "#F7F5F0" }}
      dir="rtl"
    >
      {/* Sharp full-bleed photo — kept large and unblurred */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-cover bg-[center_30%]"
        style={{
          backgroundImage: `url("${HERO_BG}")`,
          minHeight: "100%",
        }}
      />

      {/* Soft dark overlay ONLY on the text side (RTL right) — not whitening the photo */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(270deg, rgba(11,18,32,0.52) 0%, rgba(11,18,32,0.34) 28%, rgba(11,18,32,0.12) 48%, rgba(11,18,32,0) 68%)",
        }}
      />

      {/* Long bottom dissolve (~320px) — almost imperceptible */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-[320px] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(247,245,240,0) 0%, rgba(247,245,240,0.08) 28%, rgba(247,245,240,0.35) 55%, rgba(247,245,240,0.72) 78%, #F7F5F0 100%)",
        }}
      />

      {/* Organic wave — image feels continuous into the page */}
      <svg
        aria-hidden
        className="absolute bottom-0 inset-x-0 z-[1] w-full h-[72px] sm:h-[88px]"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <path
          fill="#F7F5F0"
          d="M0,72 C180,108 360,28 540,52 C780,84 960,128 1200,76 C1320,48 1380,40 1440,56 L1440,120 L0,120 Z"
        />
      </svg>

      <div
        className="relative z-[2] px-5 pb-28 pt-2 min-h-[560px] flex flex-col"
        style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}
      >
        <header className="flex items-start justify-between gap-3 mb-10">
          <div
            style={{
              filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.35))",
            }}
          >
            <BrandLogo variant="light" size="lg" className="h-12" />
          </div>
          {signedIn ? (
            <Link
              to="/resident"
              className="flex items-center gap-1.5 text-[#0E6B5A] font-semibold text-[12.5px] bg-white border border-white/90 shadow-md px-3.5 py-1.5 rounded-full shrink-0"
            >
              <UserCircle2 className="h-3.5 w-3.5" />
              האזור האישי
            </Link>
          ) : (
            <Link
              to="/auth/resident?mode=signin"
              onClick={setResidentIntent}
              className="text-[#0E6B5A] font-semibold text-[12.5px] bg-white border border-white/90 shadow-md px-3.5 py-1.5 rounded-full shrink-0"
            >
              התחברות
            </Link>
          )}
        </header>

        <div className="max-w-[17.5rem] mt-2">
          <h1
            className="text-[28px] font-extrabold text-white leading-[1.18] tracking-tight"
            style={{ textShadow: "0 2px 18px rgba(0,0,0,0.35)" }}
          >
            כוח הקנייה של כולם
          </h1>
          <p
            className="mt-1 text-[28px] font-extrabold text-[#7DDBB8] leading-[1.18] tracking-tight"
            style={{ textShadow: "0 2px 18px rgba(0,0,0,0.3)" }}
          >
            לחיסכון בבית ובבניין
          </p>
          <p
            className="mt-3 text-[14.5px] text-white/90 font-medium leading-relaxed"
            style={{ textShadow: "0 1px 10px rgba(0,0,0,0.35)" }}
          >
            רכישה קבוצתית עם השכנים — ספקים מאומתים ומחירים חכמים.
          </p>
        </div>

        <div className="mt-auto pt-10 w-full max-w-md pb-2">
          <GlobalSearchBar
            variant="hero"
            placeholder="איזה ספק או שירות אתם מחפשים היום?"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_CHIPS.map((c) => (
              <Link
                key={c.label}
                to={`/search?q=${encodeURIComponent(c.q)}`}
                className="inline-flex h-8 items-center justify-center px-3 rounded-full bg-white/95 border border-white text-[12px] font-bold leading-none text-[#334155] shadow-md"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
