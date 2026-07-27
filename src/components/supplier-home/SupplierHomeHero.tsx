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
            style={{
              WebkitTextStroke: "0.65px rgba(255,255,255,0.95)",
              paintOrder: "stroke fill",
              textShadow:
                "0 0 1px #fff, 0 1px 0 #fff, 0 2px 6px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.18)",
            }}
          >
            לידים איכותיים
            <br />
            <span
              className="text-[#0E6B5A]"
              style={{
                WebkitTextStroke: "0.65px rgba(255,255,255,0.95)",
                paintOrder: "stroke fill",
              }}
            >
              מפרויקטים אמיתיים
            </span>
          </h1>
          <p
            className="mt-3 text-[14.5px] text-white font-semibold leading-relaxed"
            style={{
              textShadow: "0 1px 2px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.4)",
            }}
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
