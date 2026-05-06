import { cn } from "@/lib/utils";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

interface Props {
  /** Choose variant by surface: navy/dark surfaces use "light", cream/white surfaces use "dark". */
  variant?: "dark" | "light";
  className?: string;
  /** Predefined sizes; pick by context. */
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "h-7",
  md: "h-10",
  lg: "h-14",
  xl: "h-20",
};

/**
 * Centralized GroupBuild logo. Always reach for this component instead of
 * importing logo files directly so future swaps stay one-line edits.
 */
export function BrandLogo({ variant = "dark", className, size = "md" }: Props) {
  const src = variant === "light" ? logoLight : logoDark;
  return (
    <img
      src={src}
      alt="GroupBuild — מרוויחים יחד על הבית"
      className={cn(sizeMap[size], "w-auto select-none", className)}
      draggable={false}
      loading="eager"
    />
  );
}
