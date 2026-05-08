import { ShieldCheck, BadgeCheck, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label?: string;
  icon?: "shield" | "badge" | "sparkle";
  size?: "sm" | "md";
  variant?: "gold" | "success" | "navy";
  className?: string;
}

const ICONS: Record<NonNullable<Props["icon"]>, LucideIcon> = {
  shield: ShieldCheck,
  badge: BadgeCheck,
  sparkle: Sparkles,
};

/** Small premium trust badge — used across the app for verified entities, statuses, etc. */
export function VerifiedBadge({
  label = "מאומת",
  icon = "shield",
  size = "sm",
  variant = "gold",
  className,
}: Props) {
  const Icon = ICONS[icon];
  const sizes = size === "sm"
    ? "text-[10px] px-2 py-0.5 gap-1"
    : "text-[12px] px-2.5 py-1 gap-1.5";
  const variants = {
    gold: "bg-gold/10 text-primary border-gold/40",
    success: "bg-success/10 text-success border-success/30",
    navy: "bg-primary/5 text-primary border-primary/20",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center font-bold rounded-full border whitespace-nowrap",
        sizes,
        variants[variant],
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );
}
