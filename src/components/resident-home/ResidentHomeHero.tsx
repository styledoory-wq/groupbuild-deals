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
 * Full-bleed photo that soft-blends into the page.
 * Right (RTL start): cleaner wash so logo + copy read clearly.
 * Left (RTL end): photo stays vivid; small white login chip sits on it.
 */
export function ResidentHomeHero({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      className="relative isolate overflow-hidden"
      style={{ background: "#F7F5F0" }}
      dir="rtl"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-[center_30%]"
        style={{
          backgroundImage: `url("${HERO_BG}")`,
          WebkitMaskImage:
            "linear-gradient(180deg, #000 0%, #000 58%, rgba(0,0,0,0.65) 78%, transparent 100%)",
          maskImage:
            "linear-gradient(180deg, #000 0%, #000 58%, rgba(0,0,0,0.65) 78%, transparent 100%)",
        }}
      />

      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: [
            "linear-gradient(270deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 18%, rgba(247,245,240,0.82) 36%, rgba(247,245,240,0.35) 55%, rgba(247,245,240,0.08) 72%, rgba(247,245,240,0) 100%)",
            "linear-gradient(180deg, rgba(247,245,240,0) 0%, rgba(247,245,240,0) 55%, rgba(247,245,240,0.4) 78%, #F7F5F0 100%)",
          ].join(", "),
        }}
      />

      <div
        className="relative px-5 pb-14"
        style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}
      >
        <header className="flex items-start justify-between gap-3 mb-8">
          <BrandLogo size="lg" className="h-12" />
          {signedIn ? (
            <Link
              to="/resident"
              className="flex items-center gap-1.5 text-[#0E6B5A] font-semibold text-[12.5px] bg-white border border-white/90 shadow-sm px-3.5 py-1.5 rounded-full shrink-0"
            >
              <UserCircle2 className="h-3.5 w-3.5" />
              האזור האישי
            </Link>
          ) : (
            <Link
              to="/auth/resident?mode=signin"
              onClick={setResidentIntent}
              className="text-[#0E6B5A] font-semibold text-[12.5px] bg-white border border-white/90 shadow-sm px-3.5 py-1.5 rounded-full shrink-0"
            >
              התחברות
            </Link>
          )}
        </header>

        <div className="max-w-[17.5rem]">
          <h1 className="text-[28px] font-extrabold text-[#0B1220] leading-[1.18] tracking-tight">
            כוח הקנייה של כולם
          </h1>
          <p className="mt-1 text-[28px] font-extrabold text-[#0E6B5A] leading-[1.18] tracking-tight">
            לחיסכון בבית ובבניין
          </p>
          <p className="mt-3 text-[14.5px] text-[#334155] font-medium leading-relaxed">
            רכישה קבוצתית עם השכנים — ספקים מאומתים ומחירים חכמים.
          </p>
        </div>

        <div className="mt-5 max-w-md">
          <GlobalSearchBar
            variant="hero"
            placeholder="איזה ספק או שירות אתם מחפשים היום?"
          />
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
    </section>
  );
}
