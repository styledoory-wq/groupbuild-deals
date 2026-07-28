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
 * Split hero: clean content on the start (RTL right), construction photo on the end (left).
 * No text-over-photo collision.
 */
export function SupplierHomeHero({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#F7F5F0" }}
      dir="rtl"
    >
      <div
        className="grid grid-cols-[1.15fr_0.95fr] min-h-[440px] sm:min-h-[480px]"
        style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
      >
        {/* Content — clean panel */}
        <div
          className="relative z-10 flex flex-col px-5 pb-10 pt-2"
          style={{
            background:
              "linear-gradient(165deg, #F7F5F0 0%, #F1F6F3 48%, #E8F5F1 100%)",
          }}
        >
          <header className="flex items-center justify-between gap-2 mb-7">
            <BrandLogo size="lg" className="h-12" />
            {signedIn ? (
              <Link
                to="/supplier"
                className="flex items-center gap-1.5 text-[#0E6B5A] font-semibold text-[12.5px] border border-[#0E6B5A]/25 bg-white px-3 py-1.5 rounded-full shrink-0"
              >
                <UserCircle2 className="h-3.5 w-3.5" />
                אזור הספק
              </Link>
            ) : (
              <Link
                to="/auth/supplier?mode=signin"
                onClick={setSupplierIntent}
                className="text-[#0E6B5A] font-semibold text-[12.5px] border border-[#0E6B5A]/25 bg-white px-3 py-1.5 rounded-full shrink-0"
              >
                התחברות
              </Link>
            )}
          </header>

          <div className="flex-1 flex flex-col justify-center max-w-[18.5rem]">
            <h1 className="text-[26px] sm:text-[30px] font-extrabold text-[#0B1220] leading-[1.15] tracking-tight">
              לידים איכותיים
              <br />
              <span className="text-[#0E6B5A]">מפרויקטים אמיתיים</span>
            </h1>
            <p className="mt-3 text-[13.5px] sm:text-[14.5px] text-[#475569] font-medium leading-relaxed">
              פניות מדיירים וועדים שכבר מתאגדים לקנייה — בלי שיווק קר.
            </p>

            <div className="mt-6 space-y-2">
              {signedIn ? (
                <Link
                  to="/supplier"
                  className="flex h-[48px] items-center justify-center rounded-2xl bg-[#0E6B5A] text-white text-[14.5px] font-extrabold shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)]"
                >
                  כניסה למרחב הספק
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth/supplier?mode=signup"
                    onClick={setSupplierIntent}
                    className="flex h-[48px] items-center justify-center rounded-2xl bg-[#0E6B5A] text-white text-[14.5px] font-extrabold shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)]"
                  >
                    הצטרף כספק
                  </Link>
                  <Link
                    to="/auth/supplier?mode=signin"
                    onClick={setSupplierIntent}
                    className="flex h-9 items-center justify-center text-[13px] font-bold text-[#0E6B5A]"
                  >
                    כבר רשום? התחבר
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Image — full-bleed visual plane */}
        <div className="relative min-h-[440px] sm:min-h-[480px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${HERO_BG}")` }}
            role="img"
            aria-label="בעלי מקצוע באתר בנייה"
          />
          {/* Soft edge into content panel */}
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
