export type SupplierHeroVariant = "a" | "b" | "c" | "d";

const WAVE_SOFT =
  "M0,72 C180,108 360,28 540,52 C780,84 960,128 1200,76 C1320,48 1380,40 1440,56 L1440,120 L0,120 Z";
const WAVE_ORGANIC =
  "M0,88 C120,40 220,120 360,96 C520,64 620,18 780,54 C960,100 1080,130 1240,70 C1340,34 1400,48 1440,62 L1440,140 L0,140 Z";
const WAVE_SUBTLE =
  "M0,50 C240,82 480,18 720,46 C960,74 1200,78 1440,42 L1440,90 L0,90 Z";

export function supplierHeroOverlap(variant: SupplierHeroVariant): string {
  switch (variant) {
    case "b":
      return "-mt-[100px]";
    case "c":
      return "-mt-[72px]";
    case "d":
      return "-mt-[88px]";
    default:
      return "-mt-[80px]";
  }
}

type Props = {
  variant: SupplierHeroVariant;
};

/**
 * Bottom transition layers only — photo stays full-bleed above this.
 */
export function SupplierHeroTransition({ variant }: Props) {
  if (variant === "c") {
    return (
      <>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-[380px] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(247,245,240,0) 0%, rgba(247,245,240,0.05) 35%, rgba(247,245,240,0.28) 62%, rgba(247,245,240,0.7) 84%, #F7F5F0 100%)",
          }}
        />
      </>
    );
  }

  if (variant === "b") {
    return (
      <>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-[260px] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(247,245,240,0) 0%, rgba(247,245,240,0.1) 32%, rgba(247,245,240,0.42) 58%, rgba(247,245,240,0.78) 82%, #F7F5F0 100%)",
          }}
        />
        <svg
          aria-hidden
          className="absolute bottom-0 inset-x-0 z-[1] w-full h-[96px] sm:h-[110px]"
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
        >
          <path fill="#F7F5F0" d={WAVE_ORGANIC} />
        </svg>
      </>
    );
  }

  if (variant === "d") {
    return (
      <>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-[280px] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(247,245,240,0) 0%, rgba(247,245,240,0.12) 40%, rgba(247,245,240,0.45) 70%, rgba(247,245,240,0.82) 90%, #F7F5F0 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-[5] h-[160px] pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 100%, rgba(247,245,240,0.95) 0%, rgba(247,245,240,0.4) 55%, transparent 80%)",
          }}
        />
        <svg
          aria-hidden
          className="absolute bottom-0 inset-x-0 z-[1] w-full h-[56px] sm:h-[64px]"
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
        >
          <path fill="#F7F5F0" d={WAVE_SUBTLE} />
        </svg>
      </>
    );
  }

  // A — default: long dissolve + soft wave
  return (
    <>
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
        <path fill="#F7F5F0" d={WAVE_SOFT} />
      </svg>
    </>
  );
}
