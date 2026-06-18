import { cn } from "@/lib/utils";
import brandMark from "@/assets/brand-mark.png";

interface Props {
  /** "dark" = dark wordmark for light surfaces; "light" = white wordmark for dark surfaces. */
  variant?: "dark" | "light";
  /** Show only the icon mark without the wordmark. */
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

/**
 * GroupBuild brand logo — official mark + Rubik wordmark per brand guidelines.
 * Brand colors: Deep #0F3D34 · Mint #7FB69E · Soft #C7D8CD.
 */
export function BrandLogo({
  variant = "dark",
  markOnly = false,
  className,
  size = "md",
}: Props) {
  const wordColor = variant === "light" ? "#FFFFFF" : "#0F3D34";

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
            fontSize: "0.72em",
            letterSpacing: "-0.015em",
          }}
        >
          GroupBuild
        </span>
      )}
    </span>
  );
}

/** Official GroupBuild mark — four rounded shapes from the brand guidelines. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={brandMark}
      alt=""
      aria-hidden="true"
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}
