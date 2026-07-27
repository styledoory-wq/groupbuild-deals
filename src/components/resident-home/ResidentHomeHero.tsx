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

export function ResidentHomeHero({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="relative isolate overflow-hidden">
      {/* Full-bleed atmosphere — edge to edge */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url("${HERO_BG}")` }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(247,245,240,0.72) 0%, rgba(247,245,240,0.55) 28%, rgba(247,245,240,0.82) 72%, rgba(247,245,240,1) 100%), radial-gradient(ellipse 90% 60% at 50% 0%, rgba(255,255,255,0.35), transparent 70%)",
        }}
      />

      <div
        className="px-6 pb-6"
        style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
      >
        <header className="pt-2 pb-4 flex justify-between items-center gap-3">
          {/* Frosted plate keeps the official mark crisp on photo — BrandLogo unchanged */}
          <div className="inline-flex items-center rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 shadow-[0_8px_22px_-14px_rgba(11,18,32,0.25)] px-2.5 py-1.5">
            <BrandLogo size="sm" className="h-9" />
          </div>

          {signedIn ? (
            <Link
              to="/resident"
              className="flex items-center gap-1.5 text-[#0E6B5A] font-semibold text-sm border border-[#0E6B5A]/25 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm"
            >
              <UserCircle2 className="h-4 w-4" />
              האזור האישי
            </Link>
          ) : (
            <Link
              to="/auth/resident?mode=signin"
              onClick={setResidentIntent}
              className="text-[#0E6B5A] font-semibold text-sm border border-[#0E6B5A]/25 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm"
            >
              התחברות
            </Link>
          )}
        </header>

        <section>
          <h1 className="text-[28px] font-extrabold text-[#0B1220] leading-[1.15] tracking-tight">
            כוח הקנייה של כולם
            <br />
            <span className="text-[#0E6B5A]">לחיסכון בבית ובבניין</span>
          </h1>
          <p className="mt-3 text-[15px] text-[#3F4754] leading-relaxed max-w-[34ch]">
            GroupBuild מחברת דיירים לרכישה קבוצתית — ספקים מאומתים, מחירים חכמים, ושקיפות מלאה.
          </p>

          <div className="mt-5 sticky top-[max(12px,env(safe-area-inset-top))] z-20">
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
                className="inline-flex h-8 items-center justify-center px-3.5 rounded-full bg-white/80 border border-[#E4DFD4] text-[12px] font-bold leading-none text-[#334155] backdrop-blur-sm"
              >
                {c.label}
              </Link>
            ))}
            <Link
              to="/categories"
              className="inline-flex h-8 items-center justify-center px-3.5 rounded-full bg-[#0E6B5A] text-white text-[12px] font-bold leading-none"
            >
              כל הקטגוריות
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
