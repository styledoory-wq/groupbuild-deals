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
 * Premium service/category square — white card, brand-green outline icon,
 * bold title + light-gray supplier count.
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
        "aspect-[1/1.1] flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-white",
        "border border-gray-100 shadow-sm px-3 py-4",
        as === "button" && "active:scale-[0.97] transition-transform",
        className,
      )}
    >
      <Icon
        size={28}
        strokeWidth={1.65}
        absoluteStrokeWidth={false}
        fill="none"
        className="shrink-0"
        style={{ color: BRAND, stroke: BRAND }}
      />
      <span className="block px-0.5 text-center text-[13px] font-bold leading-tight text-slate-900 line-clamp-2">
        {title}
      </span>
      {bottom && (
        <span className="block text-[10.5px] font-normal leading-none text-gray-400">
          {bottom}
        </span>
      )}
    </Comp>
  );
}
