import { forwardRef, HTMLAttributes, AnchorHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { MOTION } from "@/lib/designSystem";

type Variant = "default" | "tinted" | "dim";

interface AppCardProps extends HTMLAttributes<HTMLElement> {
  variant?: Variant;
  /** light tint background (when variant=tinted) */
  tint?: string;
  to?: string;
  padded?: boolean;
}

/**
 * Unified card primitive. Soft shadow, rounded-[var(--radius)], no border by default.
 * Press: scale(0.98) at 180ms.
 */
export const AppCard = forwardRef<HTMLElement, AppCardProps>(function AppCard(
  { variant = "default", tint, to, padded = true, className = "", style, children, ...rest },
  ref,
) {
  const dim = variant === "dim";
  const baseStyle: React.CSSProperties = {
    background:
      variant === "tinted" && tint
        ? `linear-gradient(180deg, hsl(var(--card)) 0%, ${tint} 100%)`
        : "hsl(var(--card))",
    boxShadow: dim ? "var(--shadow-soft)" : "var(--shadow-card)",
    opacity: dim ? 0.62 : 1,
    transition: `transform ${MOTION.base} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
    ...style,
  };

  const cls = `relative rounded-[var(--radius)] ${padded ? "p-4" : ""} ${
    to && !dim ? "active:scale-[0.98]" : ""
  } ${className}`;

  if (to && !dim) {
    const anchorRest = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={to}
        className={cls}
        style={baseStyle}
        {...anchorRest}
      >
        {children}
      </Link>
    );
  }

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={cls}
      style={baseStyle}
      {...(rest as HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  );
});
