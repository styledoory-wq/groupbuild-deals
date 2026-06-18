import { cn } from "@/lib/utils";

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
 * GroupBuild brand logo — inline SVG mark + Rubik wordmark.
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
      className={cn("inline-flex items-center gap-2 select-none", sizeMap[size], className)}
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
            letterSpacing: "-0.01em",
          }}
        >
          GroupBuild
        </span>
      )}
    </span>
  );
}

/** Square brand mark — four rounded shapes forming a house cluster. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top-left: tall leaf-like parallelogram, deep green */}
      <path
        d="M22 8 C26 6 36 6 38 12 L42 44 C42 47 40 49 37 49 L24 49 C21 49 19 47 19 44 L19 14 C19 11 20 9 22 8 Z"
        fill="#0F3D34"
      />
      {/* Top-right: pentagon/house top, mint */}
      <path
        d="M64 8 L86 22 C88 23 89 25 89 27 L89 45 C89 47 87 49 85 49 L57 49 C55 49 53 47 53 45 L53 27 C53 25 54 23 56 22 L60 19 Z"
        fill="#7FB69E"
      />
      {/* Bottom-left: rounded square, mid mint-green */}
      <rect x="19" y="55" width="30" height="38" rx="6" fill="#5FA088" />
      {/* Bottom-right: house-shape rounded square, soft green */}
      <path
        d="M59 55 L85 55 C87.2 55 89 56.8 89 59 L89 89 C89 91.2 87.2 93 85 93 L59 93 C56.8 93 55 91.2 55 89 L55 66 C55 64 56 62 58 61 L62 58 Z"
        fill="#C7D8CD"
      />
    </svg>
  );
}
