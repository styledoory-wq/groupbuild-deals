import { Link } from "react-router-dom";
import { UserCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const HERO_BG = "/marketing/supplier-hero-bg.jpg";

function setSupplierIntent() {
  try {
    sessionStorage.setItem("gb_intent", "supplier");
  } catch {
    /* ignore */
  }
}

/**
 * Full-bleed photo soft-blends into the page.
 * Right: gradually brighter wash for readable copy.
 * Left: open/clean photo with almost no overlay.
 */
export function SupplierHomeHero({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      className="relative isolate overflow-hidden"
      style={{ background: "#F7F5F0" }}
      dir="rtl"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-[center_35%]"
        style={{
          backgroundImage: `url("${HERO_BG}")`,
          WebkitMaskImage:
            "linear-gradient(180deg, #000 0%, #000 58%, rgba(0,0,0,0.65) 78%, transparent 100%)",
          maskImage:
            "linear-gradient(180deg, #000 0%, #000 58%, rgba(0,0,0,0.65) 78%, transparent 100%)",
        }}
      />

      {/* Horizontal: bright on right → clear on left. Vertical: soft bottom blend. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: [
            // Right half solid page-cream, then soft dissolve into the photo
            "linear-gradient(270deg, #F7F5F0 0%, #F7F5F0 48%, rgba(247,245,240,0.92) 58%, rgba(247,245,240,0.45) 72%, rgba(247,245,240,0.12) 86%, rgba(247,245,240,0) 100%)",
            // Bottom blend into page
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
              to="/supplier"
              className="flex items-center gap-1.5 text-[#0E6B5A] font-semibold text-[12.5px] bg-white border border-white/90 shadow-sm px-3.5 py-1.5 rounded-full shrink-0"
            >
              <UserCircle2 className="h-3.5 w-3.5" />
              אזור הספק
            </Link>
          ) : (
            <Link
              to="/auth/supplier?mode=signin"
              onClick={setSupplierIntent}
              className="text-[#0E6B5A] font-semibold text-[12.5px] bg-white border border-white/90 shadow-sm px-3.5 py-1.5 rounded-full shrink-0"
            >
              התחברות
            </Link>
          )}
        </header>

        <div className="max-w-[17.5rem]">
          <h1 className="text-[28px] font-extrabold text-[#0B1220] leading-[1.18] tracking-tight">
            לידים איכותיים
          </h1>
          <p className="mt-1 text-[28px] font-extrabold text-[#0E6B5A] leading-[1.18] tracking-tight">
            מפרויקטים אמיתיים
          </p>
          <p className="mt-3 text-[14.5px] text-[#334155] font-medium leading-relaxed">
            פניות מדיירים וועדים שכבר מתאגדים לקנייה — בלי שיווק קר.
          </p>
        </div>

        {/* CTAs — centered, previous larger size */}
        <div className="mt-7 mx-auto w-full max-w-sm space-y-2.5">
          {signedIn ? (
            <Link
              to="/supplier"
              className="flex h-14 items-center justify-center rounded-2xl bg-[#0E6B5A] text-white text-[15px] font-extrabold shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)]"
            >
              כניסה למרחב הספק
            </Link>
          ) : (
            <>
              <Link
                to="/auth/supplier?mode=signup"
                onClick={setSupplierIntent}
                className="flex h-14 items-center justify-center rounded-2xl bg-[#0E6B5A] text-white text-[15px] font-extrabold shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)]"
              >
                הצטרף כספק
              </Link>
              <Link
                to="/auth/supplier?mode=signin"
                onClick={setSupplierIntent}
                className="flex h-11 items-center justify-center text-[14px] font-bold text-[#0E6B5A]"
              >
                כבר רשום? התחבר
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
