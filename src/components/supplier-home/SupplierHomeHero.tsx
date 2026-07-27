import { Link } from "react-router-dom";
import { UserCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const HERO_BG = "/marketing/supplier-hero-bg.jpg";

const DEMAND_CHIPS = ["דלתות", "מיזוג", "חשמל", "ריצוף", "מטבחים"];

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
          <div className="inline-flex items-center rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 shadow-[0_8px_22px_-14px_rgba(11,18,32,0.25)] px-2.5 py-1.5">
            <BrandLogo size="sm" className="h-9" />
          </div>

          {signedIn ? (
            <Link
              to="/supplier"
              className="flex items-center gap-1.5 text-[#0E6B5A] font-semibold text-sm border border-[#0E6B5A]/25 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm"
            >
              <UserCircle2 className="h-4 w-4" />
              אזור הספק
            </Link>
          ) : (
            <Link
              to="/auth/supplier?mode=signin"
              onClick={setSupplierIntent}
              className="text-[#0E6B5A] font-semibold text-sm border border-[#0E6B5A]/25 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm"
            >
              התחברות
            </Link>
          )}
        </header>

        <section>
          <h1 className="text-[28px] font-extrabold text-[#0B1220] leading-[1.15] tracking-tight">
            לידים איכותיים
            <br />
            <span className="text-[#0E6B5A]">מפרויקטים אמיתיים</span>
          </h1>
          <p className="mt-3 text-[15px] text-[#3F4754] leading-relaxed max-w-[34ch]">
            GroupBuild מביאה אליכם פניות מדיירים וועדי בית שכבר מתאגדים לקנייה — בלי לבזבז תקציב על שיווק קר.
          </p>

          <div className="mt-5 space-y-2.5">
            {signedIn ? (
              <Link
                to="/supplier"
                className="flex h-14 items-center justify-center rounded-[20px] bg-[#0E6B5A] text-white text-[15px] font-extrabold shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)]"
              >
                כניסה למרחב הספק
              </Link>
            ) : (
              <>
                <Link
                  to="/auth/supplier?mode=signup"
                  onClick={setSupplierIntent}
                  className="flex h-14 items-center justify-center rounded-[20px] bg-[#0E6B5A] text-white text-[15px] font-extrabold shadow-[0_10px_28px_-12px_rgba(14,107,90,0.55)]"
                >
                  הצטרף כספק
                </Link>
                <Link
                  to="/auth/supplier?mode=signin"
                  onClick={setSupplierIntent}
                  className="flex h-12 items-center justify-center rounded-[18px] bg-white/85 border border-[#D5DED9] text-[#0E6B5A] text-[14px] font-bold backdrop-blur-sm"
                >
                  כבר רשום? התחבר
                </Link>
              </>
            )}
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-bold text-[#64748B] mb-2">תחומים מבוקשים עכשיו</p>
            <div className="flex flex-wrap gap-2">
              {DEMAND_CHIPS.map((label) => (
                <Link
                  key={label}
                  to={signedIn ? "/supplier/offers/new" : "/auth/supplier?mode=signup"}
                  onClick={signedIn ? undefined : setSupplierIntent}
                  className="inline-flex h-8 items-center justify-center px-3.5 rounded-full bg-white/80 border border-[#E4DFD4] text-[12px] font-bold leading-none text-[#334155] backdrop-blur-sm"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
