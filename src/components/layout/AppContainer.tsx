import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * AppContainer — single source of truth for page width + horizontal padding.
 *
 * Replaces ad-hoc `max-w-*` + `px-*` combos scattered across pages. Uses the
 * `--pad-x` fluid token (16px → 32px) and `--app-max-w` (1280px). Centered.
 *
 * Use `size="narrow"` for forms / reading content, `size="wide"` (default)
 * for dashboards & lists, `size="full"` to opt out of the max-width cap.
 */
type Size = "narrow" | "wide" | "full";

const sizeClass: Record<Size, string> = {
  narrow: "max-w-2xl",                  // ~672px — forms, articles, profile
  wide:   "max-w-[var(--app-max-w)]",   // 1280px — default, dashboards/lists
  full:   "max-w-none",                 // edge-to-edge
};

export function AppContainer({
  children,
  className,
  size = "wide",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  size?: Size;
  as?: keyof JSX.IntrinsicElements;
}) {
  return (
    <Tag
      className={cn(
        "w-full mx-auto",
        sizeClass[size],
        "px-[var(--pad-x)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
