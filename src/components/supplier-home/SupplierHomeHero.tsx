import { Link } from "react-router-dom";
import { UserCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const HERO_BG = "/marketing/supplier-hero-bg.jpg";

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

function setSupplierIntent() {
  try {
    sessionStorage.setItem("gb_intent", "supplier");
  } catch {
    /* ignore */
  }
}

export function SupplierHomeHero({ signedIn }: { signedIn: boolean }) {
  return (
    <div
      className="relative isolate overflow-hidden"
      style={{ background: "#F7F5F0" }}
    >
      {/* Photo fades out into page color — no hard cut */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-[center_35%]"
        style={{
          backgroundImage: `url("${HERO_BG}")`,
          WebkitMaskImage:
            "linear-gradient(180deg, #000 0%, #000 48%, rgba(0,0,0,0.55) 72%, transparent 100%)",
          maskImage:
            "linear-gradient(180deg, #000 0%, #000 48%, rgba(0,0,0,0.55) 72%, transparent 100%)",
        }}
      />
      {/* Soft bottom blend into page wash */}
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
              to="/supplier"
              className="flex items-center gap-1.5 text-[#0E6B5A] font-semibold text-sm bg-white/90 backdrop-blur-md border border-[#0E6B5A]/20 px-4 py-1.5 rounded-full"
            >
              <UserCircle2 className="h-4 w-4" />
              אזור הספק
            </Link>
          ) : (
            <Link
              to="/auth/supplier?mode=signin"
              onClick={setSupplierIntent}
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
            לידים איכותיים
            <br />
            <span className="text-[#0E6B5A]" style={headlineHalo}>
              מפרויקטים אמיתיים
            </span>
          </h1>

          {/* Dark glass chip — makes white copy actually readable */}
          <p className="mt-3.5 inline-block max-w-full rounded-2xl bg-[#0B1220]/55 backdrop-blur-md px-3.5 py-2.5 text-[14px] font-semibold leading-relaxed text-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]">
            פניות מדיירים וועדים שכבר מתאגדים לקנייה — בלי שיווק קר.
          </p>
        </section>

        <div className="mt-5">
          {signedIn ? (
            <Link
              to="/supplier"
              className="flex h-[52px] items-center justify-center rounded-2xl bg-[#0E6B5A] text-white text-[15px] font-extrabold shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)]"
            >
              כניסה למרחב הספק
            </Link>
          ) : (
            <div className="space-y-2">
              <Link
                to="/auth/supplier?mode=signup"
                onClick={setSupplierIntent}
                className="flex h-[52px] items-center justify-center rounded-2xl bg-[#0E6B5A] text-white text-[15px] font-extrabold shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)]"
              >
                הצטרף כספק
              </Link>
              <Link
                to="/auth/supplier?mode=signin"
                onClick={setSupplierIntent}
                className="flex h-10 items-center justify-center text-[13px] font-bold text-[#0E6B5A]"
                style={{ textShadow: "0 1px 0 rgba(255,255,255,0.95)" }}
              >
                כבר רשום? התחבר
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
