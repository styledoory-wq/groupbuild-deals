import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const BRAND = "#0E6B5A";

type Props = {
  title: string;
  Icon: LucideIcon;
  count?: number;
  /** Override the bottom line (defaults to "N ספקים" / "בקרוב") */
  subtitle?: string;
  onClick?: () => void;
  className?: string;
  as?: "button" | "div";
};

/**
 * Compact square service card — outline brand icon, text-sm title,
 * light-gray supplier count. Matches sketch spacing 1:1.
 */
export function CategorySquareCard({
  title,
  Icon,
  count,
  subtitle,
  onClick,
  className,
  as = "button",
}: Props) {
  const soon = typeof count === "number" && count === 0;
  const Comp: "button" | "div" = as === "button" ? "button" : "div";
  const bottom =
    subtitle ??
    (typeof count === "number" ? (soon ? "בקרוב" : `${count} ספקים`) : null);

  return (
    <Comp
      type={as === "button" ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "aspect-square flex flex-col items-center justify-center gap-1.5",
        "rounded-2xl border border-gray-100 bg-white shadow-sm",
        "px-2 py-2.5",
        as === "button" && "active:scale-[0.97] transition-transform",
        className,
      )}
    >
      <Icon
        size={32}
        strokeWidth={1.55}
        absoluteStrokeWidth={false}
        fill="none"
        className="h-8 w-8 shrink-0"
        style={{ color: BRAND, stroke: BRAND }}
      />
      <span className="block px-0.5 text-center text-sm font-bold leading-snug text-slate-900 line-clamp-2">
        {title}
      </span>
      {bottom && (
        <span className="block text-[10px] font-normal leading-none text-gray-400">
          {bottom}
        </span>
      )}
    </Comp>
  );
}
