import { Link } from "react-router-dom";
import { UserCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";
import { HeroBrandLockup } from "@/components/marketing/HeroBrandLockup";
import { MotionHover } from "@/components/motion/MotionHover";
import { useHeroScrollMotion } from "@/lib/motion/useHeroScrollMotion";

const HERO_BG = "/marketing/supplier-hero-bg.jpg";

function setSupplierIntent() {
  try {
    sessionStorage.setItem("gb_intent", "supplier");
  } catch {
    /* ignore */
  }
}

/**
 * Premium Apple-style hero:
 * - Full-bleed sharp photo (majority visible)
 * - Soft dark scrim only behind copy
 * - Long bottom dissolve + organic wave into the page
 */
export function SupplierHomeHero({ signedIn }: { signedIn: boolean }) {
  const heroRef = useRef<HTMLElement | null>(null);
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  const { enabled: motionOn, bgScale, bgY, titleY, titleOpacity } = useHeroScrollMotion(heroRef, isMobile);

  const titleBlock = (
    <>
      <h1
        className="text-[30px] font-extrabold text-white leading-[1.15] tracking-tight"
        style={{ textShadow: "0 3px 18px rgba(0,0,0,0.55)" }}
      >
        לידים איכותיים
      </h1>
      <p
        className="mt-1 text-[30px] font-extrabold text-[#5CC9A0] leading-[1.15] tracking-tight"
        style={{ textShadow: "0 3px 18px rgba(0,0,0,0.55)" }}
      >
        מפרויקטים אמיתיים
      </p>
      <p
        className="mt-3 text-[14.5px] text-white/90 font-medium leading-relaxed"
        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}
      >
        פלטפורמה שמחברת בין ספקים מקצועיים לבין קבוצות רכישה, דיירים ופרויקטים איכותיים מכל הארץ
      </p>
    </>
  );

  const loginLink = signedIn ? (
    <MotionHover>
      <Link
        to="/supplier"
        className="flex items-center gap-1.5 text-[#0E6B5A] font-semibold text-[12.5px] bg-white border border-white/90 shadow-md px-3.5 py-1.5 rounded-full shrink-0"
      >
        <UserCircle2 className="h-3.5 w-3.5" />
        אזור הספק
      </Link>
    </MotionHover>
  ) : (
    <MotionHover>
      <Link
        to="/auth/supplier?mode=signin"
        onClick={setSupplierIntent}
        className="text-[#0E6B5A] font-semibold text-[12.5px] bg-white border border-white/90 shadow-md px-3.5 py-1.5 rounded-full shrink-0"
      >
        התחברות
      </Link>
    </MotionHover>
  );

  const ctaBlock = signedIn ? (
    <MotionHover>
      <Link
        to="/supplier"
        className="flex h-14 items-center justify-center rounded-2xl bg-white text-[#0E6B5A] text-[15px] font-extrabold shadow-[0_12px_28px_-12px_rgba(0,0,0,0.35)]"
      >
        כניסה למרחב הספק
      </Link>
    </MotionHover>
  ) : (
    <>
      <MotionHover>
        <Link
          to="/auth/supplier?mode=signup"
          onClick={setSupplierIntent}
          className="flex h-14 items-center justify-center rounded-2xl text-white text-[15px] font-extrabold shadow-[0_12px_28px_-10px_rgba(14,107,90,0.55)]"
          style={{ background: "linear-gradient(135deg, #0E6B5A 0%, #1A8870 100%)" }}
        >
          הצטרף כספק
        </Link>
      </MotionHover>
      <MotionHover>
        <Link
          to="/auth/supplier?mode=signin"
          onClick={setSupplierIntent}
          className="flex h-11 items-center justify-center text-[14px] font-bold text-white"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}
        >
          כבר רשום? התחבר
        </Link>
      </MotionHover>
    </>
  );

  return (
    <section
      ref={heroRef}
      className="relative isolate overflow-hidden"
      style={{ background: "#121A18" }}
      dir="rtl"
    >
      {motionOn ? (
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-30 bg-cover bg-[center_32%]"
          style={{
            backgroundImage: `url("${HERO_BG}")`,
            minHeight: "100%",
            scale: bgScale,
            y: bgY,
            transformOrigin: "center top",
          }}
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-30 bg-cover bg-[center_32%]"
          style={{
            backgroundImage: `url("${HERO_BG}")`,
            minHeight: "100%",
          }}
        />
      )}

      <div
        aria-hidden
        className="absolute inset-0 -z-20 pointer-events-none"
        style={{
          background: [
            "linear-gradient(270deg, rgba(10,20,18,0.62) 0%, rgba(10,20,18,0.44) 26%, rgba(10,20,18,0.18) 46%, transparent 64%)",
            "radial-gradient(ellipse 60% 55% at 82% 28%, rgba(10,20,18,0.48) 0%, transparent 100%)",
          ].join(", "),
        }}
      />

      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-[320px] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(247,245,240,0) 0%, rgba(247,245,240,0.08) 28%, rgba(247,245,240,0.35) 55%, rgba(247,245,240,0.72) 78%, #F7F5F0 100%)",
        }}
      />

      <svg
        aria-hidden
        className="absolute bottom-0 inset-x-0 z-[1] w-full h-[72px] sm:h-[88px]"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <path
          fill="#F7F5F0"
          d="M0,72 C180,108 360,28 540,52 C780,84 960,128 1200,76 C1320,48 1380,40 1440,56 L1440,120 L0,120 Z"
        />
      </svg>

      <div
        className="relative z-[2] px-5 pb-28 pt-2 min-h-[560px] flex flex-col"
        style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}
      >
        <header className="flex items-center justify-between gap-3 mb-8">
          <HeroBrandLockup />
          {loginLink}
        </header>

        <div className="max-w-[18rem] mt-2">
          {motionOn ? (
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div style={{ y: titleY, opacity: titleOpacity }}>{titleBlock}</motion.div>
            </motion.div>
          ) : (
            titleBlock
          )}
        </div>

        <div className="mt-auto pt-10 mx-auto w-full max-w-sm space-y-2.5 pb-2">
          {motionOn ? (
            <motion.div
              className="space-y-2.5"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {ctaBlock}
            </motion.div>
          ) : (
            ctaBlock
          )}
        </div>
      </div>
    </section>
  );
}
