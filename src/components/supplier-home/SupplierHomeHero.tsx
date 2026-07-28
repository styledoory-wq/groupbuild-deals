import { Link } from "react-router-dom";
import { UserCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const HERO_BG = "/marketing/supplier-hero-bg.jpg";

/** Soft white rim — thinner than before */
const headlineHalo: React.CSSProperties = {
  WebkitTextStroke: "0.45px rgba(255,255,255,0.9)",
  paintOrder: "stroke fill",
  textShadow: [
    "-1px 0 0 rgba(255,255,255,0.95)",
    "1px 0 0 rgba(255,255,255,0.95)",
    "0 -1px 0 rgba(255,255,255,0.95)",
    "0 1px 0 rgba(255,255,255,0.95)",
    "0 2px 8px rgba(0,0,0,0.22)",
  ].join(", "),
};

/** White fill + black outline for supporting line */
const subOutline: React.CSSProperties = {
  color: "#FFFFFF",
  WebkitTextStroke: "0.85px rgba(0,0,0,0.88)",
  paintOrder: "stroke fill",
  textShadow: [
    "-1.2px 0 0 #000",
    "1.2px 0 0 #000",
    "0 -1.2px 0 #000",
    "0 1.2px 0 #000",
    "-0.8px -0.8px 0 #000",
    "0.8px -0.8px 0 #000",
    "-0.8px 0.8px 0 #000",
    "0.8px 0.8px 0 #000",
    "0 3px 10px rgba(0,0,0,0.35)",
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
          {/* Bigger mark + light wordmark — pops on photo without a white plate */}
          <div
            className="inline-flex items-center"
            style={{
              filter:
                "drop-shadow(0 0 10px rgba(255,255,255,0.55)) drop-shadow(0 3px 6px rgba(0,0,0,0.4)) drop-shadow(0 12px 20px rgba(0,0,0,0.28))",
            }}
          >
            <BrandLogo variant="light" size="xl" className="h-[68px]" />
          </div>
          {signedIn ? (
            <Link
              to="/supplier"
              className="flex items-center gap-1.5 text-[#0E6B5A] font-semibold text-sm bg-white/90 backdrop-blur-md border border-[#0E6B5A]/20 px-4 py-1.5 rounded-full shrink-0"
            >
              <UserCircle2 className="h-4 w-4" />
              אזור הספק
            </Link>
          ) : (
            <Link
              to="/auth/supplier?mode=signin"
              onClick={setSupplierIntent}
              className="text-[#0E6B5A] font-semibold text-sm bg-white/90 backdrop-blur-md border border-[#0E6B5A]/20 px-4 py-1.5 rounded-full shrink-0"
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

          <p
            className="mt-3.5 text-[15px] font-bold leading-relaxed"
            style={subOutline}
          >
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
