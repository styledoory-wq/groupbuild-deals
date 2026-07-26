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
 * Shared category/stage square — white card, green line icon in soft circle,
 * title + optional supplier count. Matches the approved combo mockup.
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
        "aspect-[1/1.05] flex flex-col items-center justify-center gap-2 rounded-[22px] bg-white px-2 py-3",
        as === "button" && "active:scale-[0.97] transition-transform",
        className,
      )}
      style={{ boxShadow: "0 6px 18px -8px rgba(16,24,40,0.14)" }}
    >
      <span
        className="grid place-items-center w-[52px] h-[52px] rounded-full"
        style={{ background: "rgba(14,107,90,0.08)", color: BRAND }}
      >
        <Icon size={26} strokeWidth={1.65} />
      </span>
      <span className="block text-[12.5px] font-extrabold text-[#1A1A1A] leading-tight text-center line-clamp-2 px-0.5">
        {title}
      </span>
      {bottom && (
        <span
          className="block text-[11px] font-semibold leading-none"
          style={{ color: soon && !subtitle ? "#9CA3AF" : BRAND }}
        >
          {bottom}
        </span>
      )}
    </Comp>
  );
}
