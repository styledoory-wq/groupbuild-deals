import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const heroImage = "/marketing/resident-hero-bg.jpg";

type ResidentHomeHeroProps = {
  onOpenAuth: (mode?: "login" | "signup") => void;
};

export function ResidentHomeHero({ onOpenAuth }: ResidentHomeHeroProps) {
  const { user } = useAuth();

  return (
    <header className="relative isolate overflow-hidden bg-[#F7F5F0]">
      {/* Full-bleed photo — stays large and sharp */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt=""
          aria-hidden
          className="h-full w-full object-cover object-[center_32%] sm:object-[center_28%]"
        />
        {/* Soft dark scrim only on text side for readability */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/28 to-transparent sm:from-black/50 sm:via-black/22"
        />
        {/* Long dissolve into page cream — starts only at the bottom */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[min(38vh,360px)] bg-gradient-to-t from-[#F7F5F0] via-[#F7F5F0]/55 to-transparent"
        />
      </div>

      {/* Organic bottom edge — image continues into the page */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] leading-[0]" aria-hidden>
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="block h-[72px] w-full sm:h-[96px] md:h-[112px]"
        >
          <path
            fill="#F7F5F0"
            d="M0,72 C180,118 360,18 540,52 C720,86 900,118 1080,64 C1200,28 1320,40 1440,72 L1440,120 L0,120 Z"
          />
        </svg>
      </div>

      <div className="relative z-[1] mx-auto flex min-h-[min(92vh,920px)] w-full max-w-6xl flex-col px-4 pb-28 pt-5 sm:px-6 sm:pb-32 sm:pt-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo
            to="/"
            height={36}
            className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] [&_img]:brightness-0 [&_img]:invert"
          />
          <div className="flex items-center gap-2">
            {user ? (
              <Button
                asChild
                size="sm"
                className="rounded-full bg-white px-4 text-[#0B1220] shadow-md hover:bg-white/95"
              >
                <Link to="/app">
                  לאפליקציה
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth("login")}
                className="rounded-full border border-white/35 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-[2px] transition hover:bg-white/25"
              >
                התחברות
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10 sm:py-14">
          <div className="mx-auto w-full max-w-xl text-center sm:mx-0 sm:max-w-lg sm:text-right lg:max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              לדיירים ולוועדי בית
            </p>

            <h1 className="mt-4 text-[clamp(2.15rem,5.2vw,3.85rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
              תחסכו יחד.
              <span className="mt-1 block text-white/92">תתקדמו מהר יותר.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-white/82 drop-shadow-[0_1px_10px_rgba(0,0,0,0.3)] sm:mx-0 sm:text-base sm:leading-8">
              GroupBuild מחברת דיירים באותו בניין לעסקאות קבוצתיות חכמות — שקיפות מלאה, הצעות תחרותיות
              והתקדמות ברורה עד הביצוע.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:items-stretch">
              <Button
                asChild
                size="lg"
                className="h-14 w-full max-w-sm rounded-2xl bg-[#0E6B5A] px-8 text-base font-semibold text-white shadow-[0_14px_36px_rgba(14,107,90,0.38)] hover:bg-[#0c5d4e] sm:max-w-none"
              >
                <Link to="/residents/explore">
                  <Search className="size-5" />
                  גלו הצעות באזור שלכם
                </Link>
              </Button>

              {!user ? (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => onOpenAuth("signup")}
                  className={cn(
                    "h-14 w-full max-w-sm rounded-2xl border-white/40 bg-white/10 px-8 text-base font-semibold text-white",
                    "backdrop-blur-[2px] hover:bg-white/18 sm:max-w-none",
                  )}
                >
                  הרשמה לדיירים
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
