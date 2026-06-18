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
            fontSize: "0.62em",
            letterSpacing: "-0.02em",
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
      {/* Top-left: tall leaning shape with angled top (deep green) */}
      <path
        d="
          M 14 8
          Q 14 4 18 3
          L 32 0.5
          Q 38 -0.2 38 6
          L 38 64
          Q 38 70 32 70
          L 20 70
          Q 14 70 14 64
          Z
        "
        fill={COLORS.deep}
      />

      {/* Top-right: house pentagon (mint) */}
      <path
        d="
          M 70 4
          Q 73 1 76 4
          L 94 22
          Q 96 24 96 28
          L 96 64
          Q 96 70 90 70
          L 56 70
          Q 50 70 50 64
          L 50 28
          Q 50 24 52 22
          Z
        "
        fill={COLORS.mint}
      />

      {/* Bottom-left: vivid green rounded square */}
      <rect x="14" y="78" width="32" height="32" rx="8" fill={COLORS.vivid} />

      {/* Bottom-right: soft mint rounded square */}
      <rect x="56" y="78" width="40" height="32" rx="8" fill={COLORS.soft} />
    </svg>
  );
}
