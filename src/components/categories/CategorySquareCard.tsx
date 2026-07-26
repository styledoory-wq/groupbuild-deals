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
 * Sketch-matched service tile: compact square, outline brand icon,
 * text-sm title, slate-400 supplier count.
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
        "aspect-[1/1.05] w-full flex flex-col items-center justify-center gap-2",
        "rounded-2xl border border-gray-100 bg-white shadow-sm",
        "px-2.5 py-3",
        as === "button" && "active:scale-[0.97] transition-transform",
        className,
      )}
    >
      <Icon
        size={32}
        strokeWidth={1.5}
        absoluteStrokeWidth={false}
        fill="none"
        className="h-8 w-8 shrink-0"
        style={{ color: BRAND, stroke: BRAND }}
        aria-hidden
      />
      <span className="block max-w-full px-0.5 text-center text-sm font-bold leading-snug text-slate-900 line-clamp-2">
        {title}
      </span>
      {bottom && (
        <span className="block text-xs font-normal leading-none text-slate-400">
          {bottom}
        </span>
      )}
    </Comp>
  );
}
