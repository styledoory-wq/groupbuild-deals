import { cn } from "@/lib/utils";

interface Props {
  variant?: "dark" | "light";
  markOnly?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "h-9",
  md: "h-12",
  lg: "h-16",
  xl: "h-24",
};

/** Official GroupBuild brand colors */
const COLORS = {
  deep: "#0F3D34",   // dark green — tall leaning shape
  vivid: "#2E9D74",  // vivid green — small square
  mint: "#9CC4B0",   // mint — house pentagon
  soft: "#C7D8CD",   // soft mint — light square
};

/**
 * GroupBuild brand logo — vector mark + Rubik wordmark per official brand guidelines.
 */
export function BrandLogo({
  variant = "dark",
  markOnly = false,
  className,
  size = "md",
}: Props) {
  const wordColor = variant === "light" ? "#FFFFFF" : COLORS.deep;

  return (
    <span
      className={cn("inline-flex items-center gap-2.5 select-none", sizeMap[size], className)}
      aria-label="GroupBuild"
      role="img"
    >
      <BrandMark className="h-full w-auto" />
      {!markOnly && (
        <span
          className="font-extrabold leading-none tracking-tight"
          style={{
            color: wordColor,
            fontFamily: "'Rubik', 'Heebo', system-ui, sans-serif",
            fontSize: "0.78em",
            letterSpacing: "-0.025em",
          }}
        >
          GroupBuild
        </span>
      )}
    </span>
  );
}

/**
 * Official GroupBuild mark — four geometric shapes forming two stylized houses.
 * Crisp vector reproduction of the brand-guideline mark.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 120"
      className={cn("select-none", className)}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top-left: leaning rounded bar (deep green) — parallelogram with rounded caps */}
      <line
        x1="16"
        y1="60"
        x2="32"
        y2="14"
        stroke={COLORS.deep}
        strokeWidth="28"
        strokeLinecap="round"
      />

      {/* Top-right: house pentagon (mint) */}
      <path
        d="
          M 70 4
          Q 73 1 76 4
          L 94 22
          Q 96 24 96 28
          L 96 58
          Q 96 64 90 64
          L 56 64
          Q 50 64 50 58
          L 50 28
          Q 50 24 52 22
          Z
        "
        fill={COLORS.mint}
      />

      {/* Bottom-left: vivid green rounded square */}
      <rect x="10" y="76" width="36" height="36" rx="8" fill={COLORS.vivid} />

      {/* Bottom-right: soft mint rounded square */}
      <rect x="54" y="76" width="36" height="36" rx="8" fill={COLORS.soft} />
    </svg>
  );
}
