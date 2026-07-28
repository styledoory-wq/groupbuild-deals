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
 * Split hero: clean content on the start (RTL right), atmosphere photo on the end (left).
 * No text-over-photo collision.
 */
export function ResidentHomeHero({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#F7F5F0" }}
      dir="rtl"
    >
      <div
        className="grid grid-cols-[1.15fr_0.95fr] min-h-[460px] sm:min-h-[500px]"
        style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
      >
        {/* Content — clean panel */}
        <div
          className="relative z-10 flex flex-col px-5 pb-8 pt-2"
          style={{
            background:
              "linear-gradient(165deg, #F7F5F0 0%, #F1F6F3 48%, #E8F5F1 100%)",
          }}
        >
          <header className="flex items-center justify-between gap-2 mb-6">
            <BrandLogo size="lg" className="h-12" />
            {signedIn ? (
              <Link
                to="/resident"
                className="flex items-center gap-1.5 text-[#0E6B5A] font-semibold text-[12.5px] border border-[#0E6B5A]/25 bg-white px-3 py-1.5 rounded-full shrink-0"
              >
                <UserCircle2 className="h-3.5 w-3.5" />
                האזור האישי
              </Link>
            ) : (
              <Link
                to="/auth/resident?mode=signin"
                onClick={setResidentIntent}
                className="text-[#0E6B5A] font-semibold text-[12.5px] border border-[#0E6B5A]/25 bg-white px-3 py-1.5 rounded-full shrink-0"
              >
                התחברות
              </Link>
            )}
          </header>

          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-[26px] sm:text-[30px] font-extrabold text-[#0B1220] leading-[1.15] tracking-tight max-w-[17rem]">
              כוח הקנייה של כולם
              <br />
              <span className="text-[#0E6B5A]">לחיסכון בבית ובבניין</span>
            </h1>
            <p className="mt-3 text-[13.5px] sm:text-[14.5px] text-[#475569] font-medium leading-relaxed max-w-[17.5rem]">
              רכישה קבוצתית עם השכנים — ספקים מאומתים ומחירים חכמים.
            </p>

            <div className="mt-5">
              <GlobalSearchBar
                variant="hero"
                placeholder="איזה ספק או שירות אתם מחפשים היום?"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_CHIPS.map((c) => (
                <Link
                  key={c.label}
                  to={`/search?q=${encodeURIComponent(c.q)}`}
                  className="inline-flex h-8 items-center justify-center px-3 rounded-full bg-white border border-[#E4DFD4] text-[12px] font-bold leading-none text-[#334155] shadow-sm"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Image — full-bleed visual plane */}
        <div className="relative min-h-[460px] sm:min-h-[500px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${HERO_BG}")` }}
            role="img"
            aria-label="בית ובניין"
          />
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-10"
            style={{
              background:
                "linear-gradient(270deg, rgba(247,245,240,0.55) 0%, rgba(247,245,240,0) 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-16"
            style={{
              background:
                "linear-gradient(180deg, rgba(247,245,240,0) 0%, #F7F5F0 100%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
