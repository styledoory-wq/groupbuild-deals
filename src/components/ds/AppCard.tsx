import { forwardRef, HTMLAttributes, AnchorHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { SHADOWS, MOTION } from "@/lib/designSystem";

type Variant = "default" | "tinted" | "dim";

interface AppCardProps extends HTMLAttributes<HTMLElement> {
  variant?: Variant;
  /** light tint background (when variant=tinted) */
  tint?: string;
  to?: string;
  padded?: boolean;
}

/**
 * Unified card primitive. Soft shadow, rounded-[20px], no border by default.
 * Press: scale(1.02) + stronger shadow at 200ms.
 */
export const AppCard = forwardRef<HTMLElement, AppCardProps>(function AppCard(
  { variant = "default", tint, to, padded = true, className = "", style, children, ...rest },
  ref,
) {
  const dim = variant === "dim";
  const baseStyle: React.CSSProperties = {
    background:
      variant === "tinted" && tint
        ? `linear-gradient(180deg, #FFFFFF 0%, ${tint} 100%)`
        : "#FFFFFF",
    boxShadow: dim ? SHADOWS.cardDim : SHADOWS.card,
    opacity: dim ? 0.62 : 1,
    transition: `transform ${MOTION.base} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
    ...style,
  };

  const cls = `relative rounded-[20px] ${padded ? "p-4" : ""} ${
    to && !dim ? "active:scale-[1.02]" : ""
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
