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

export function SupplierHomeHero({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-[center_35%]"
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
          <div className="inline-flex items-center rounded-2xl bg-white/90 backdrop-blur-md border border-white/95 shadow-sm px-2.5 py-1.5">
            <BrandLogo size="sm" className="h-9" />
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
            style={{ textShadow: "0 1px 0 rgba(255,255,255,0.9), 0 8px 24px rgba(247,245,240,0.85)" }}
          >
            לידים איכותיים
            <br />
            <span className="text-[#0E6B5A]">מפרויקטים אמיתיים</span>
          </h1>
          <p
            className="mt-3 text-[14.5px] text-[#0B1220] font-semibold leading-relaxed"
            style={{ textShadow: "0 1px 0 rgba(255,255,255,0.95), 0 6px 18px rgba(247,245,240,0.9)" }}
          >
            פניות מדיירים וועדים שכבר מתאגדים לקנייה — בלי שיווק קר.
          </p>
        </section>

        <div className="mt-5">
          {signedIn ? (
            <Link
              to="/supplier"
              className="flex h-13 h-[52px] items-center justify-center rounded-2xl bg-[#0E6B5A] text-white text-[15px] font-extrabold shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)]"
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
                style={{ textShadow: "0 1px 0 rgba(255,255,255,0.9)" }}
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
