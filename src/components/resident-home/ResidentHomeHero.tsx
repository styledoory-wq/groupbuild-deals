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
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-[center_30%]"
        style={{ backgroundImage: `url("${HERO_BG}")` }}
      />
      {/* Soft vignette only under the copy — no card, photo stays open */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 70% at 70% 18%, rgba(247,245,240,0.78) 0%, rgba(247,245,240,0.35) 42%, rgba(247,245,240,0.08) 70%), linear-gradient(180deg, rgba(247,245,240,0.25) 0%, rgba(247,245,240,0.05) 55%, rgba(247,245,240,0.92) 100%)",
        }}
      />

      <div
        className="px-6 pb-5"
        style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
      >
        <header className="pt-2 pb-5 flex justify-between items-center gap-3">
          <div
            className="inline-flex"
            style={{
              filter:
                "drop-shadow(0 1px 1px rgba(255,255,255,0.65)) drop-shadow(0 3px 6px rgba(0,0,0,0.28)) drop-shadow(0 10px 18px rgba(0,0,0,0.22))",
            }}
          >
            <BrandLogo size="md" className="h-12" />
          </div>
          {signedIn ? (
            <Link
              to="/resident"
              className="flex items-center gap-1.5 text-[#0E6B5A] font-semibold text-sm bg-white/90 backdrop-blur-md border border-[#0E6B5A]/20 px-4 py-1.5 rounded-full"
            >
              <UserCircle2 className="h-4 w-4" />
              האזור האישי
            </Link>
          ) : (
            <Link
              to="/auth/resident?mode=signin"
              onClick={setResidentIntent}
              className="text-[#0E6B5A] font-semibold text-sm bg-white/90 backdrop-blur-md border border-[#0E6B5A]/20 px-4 py-1.5 rounded-full"
            >
              התחברות
            </Link>
          )}
        </header>

        <section className="max-w-[22rem]">
          <h1
            className="text-[30px] font-extrabold text-[#0B1220] leading-[1.12] tracking-tight"
            style={{
              WebkitTextStroke: "0.65px rgba(255,255,255,0.95)",
              paintOrder: "stroke fill",
              textShadow:
                "0 0 1px #fff, 0 1px 0 #fff, 0 2px 6px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.18)",
            }}
          >
            כוח הקנייה של כולם
            <br />
            <span
              className="text-[#0E6B5A]"
              style={{
                WebkitTextStroke: "0.65px rgba(255,255,255,0.95)",
                paintOrder: "stroke fill",
              }}
            >
              לחיסכון בבית ובבניין
            </span>
          </h1>
          <p
            className="mt-3 text-[14.5px] text-white font-semibold leading-relaxed"
            style={{
              textShadow: "0 1px 2px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.4)",
            }}
          >
            רכישה קבוצתית עם השכנים — ספקים מאומתים ומחירים חכמים.
          </p>
        </section>

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
              className="inline-flex h-8 items-center justify-center px-3.5 rounded-full bg-white/90 border border-white text-[12px] font-bold leading-none text-[#334155] shadow-sm"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
