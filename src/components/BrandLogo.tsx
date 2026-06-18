import { cn } from "@/lib/utils";
import groupBuildMarkExact from "@/assets/groupbuild-mark-exact.png.asset.json";

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
    <img
      src={groupBuildMarkExact.url}
      alt=""
      aria-hidden="true"
      className={cn("select-none object-contain", className)}
      draggable={false}
    />
  );
}
