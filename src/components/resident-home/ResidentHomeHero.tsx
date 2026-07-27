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

const headlineHalo = {
  WebkitTextStroke: "1px rgba(255,255,255,0.92)",
  paintOrder: "stroke fill" as const,
  textShadow: [
    "-2px 0 0 #fff",
    "2px 0 0 #fff",
    "0 -2px 0 #fff",
    "0 2px 0 #fff",
    "-1.5px -1.5px 0 #fff",
    "1.5px -1.5px 0 #fff",
    "-1.5px 1.5px 0 #fff",
    "1.5px 1.5px 0 #fff",
    "0 3px 10px rgba(0,0,0,0.28)",
  ].join(", "),
};

function setResidentIntent() {
  try {
    sessionStorage.setItem("gb_intent", "resident");
  } catch {
    /* ignore */
  }
}

export function ResidentHomeHero({ signedIn }: { signedIn: boolean }) {
  return (
    <div
      className="relative isolate overflow-hidden"
      style={{ background: "#F7F5F0" }}
    >
      {/* Photo fades out into page color — no hard cut */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-[center_30%]"
        style={{
          backgroundImage: `url("${HERO_BG}")`,
          WebkitMaskImage:
            "linear-gradient(180deg, #000 0%, #000 48%, rgba(0,0,0,0.55) 72%, transparent 100%)",
          maskImage:
            "linear-gradient(180deg, #000 0%, #000 48%, rgba(0,0,0,0.55) 72%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-[55%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(247,245,240,0) 0%, rgba(247,245,240,0.45) 42%, #F7F5F0 100%)",
        }}
      />

      <div
        className="relative px-6 pb-14"
        style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
      >
        <header className="pt-2 pb-5 flex justify-between items-center gap-3">
          <div
            className="inline-flex"
            style={{
              filter:
                "drop-shadow(0 2px 3px rgba(0,0,0,0.35)) drop-shadow(0 8px 14px rgba(0,0,0,0.28))",
            }}
          >
            <BrandLogo size="lg" className="h-14" />
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
            style={headlineHalo}
          >
            כוח הקנייה של כולם
            <br />
            <span className="text-[#0E6B5A]" style={headlineHalo}>
              לחיסכון בבית ובבניין
            </span>
          </h1>

          <p className="mt-3.5 inline-block max-w-full rounded-2xl bg-[#0B1220]/55 backdrop-blur-md px-3.5 py-2.5 text-[14px] font-semibold leading-relaxed text-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]">
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
