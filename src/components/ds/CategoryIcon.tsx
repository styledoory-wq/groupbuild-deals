import { iconForCategory, iconForStage, NEUTRAL_ICON } from "@/lib/categoryIcons";

/**
 * Single source of truth for rendering category / stage icons across the app.
 * Always resolves through `@/lib/categoryIcons` (the same resolver the
 * Categories screens use) — never emoji, never a local icon map.
 */
interface BaseProps {
  /** px size of the glyph */
  size?: number;
  className?: string;
  strokeWidth?: number;
}

interface CategoryIconProps extends BaseProps {
  categoryId?: string | null;
  label?: string | null;
  /** when true and no category link exists, render the neutral icon */
  neutral?: boolean;
}

export function CategoryIcon({
  categoryId,
  label,
  neutral = false,
  size = 18,
  strokeWidth = 1.75,
  className = "text-[#0E6B5A]",
}: CategoryIconProps) {
  const Icon =
    neutral || (!categoryId && !label) ? NEUTRAL_ICON : iconForCategory(categoryId, label);
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}

interface StageIconProps extends BaseProps {
  stageKey: string;
}

export function StageIcon({
  stageKey,
  size = 18,
  strokeWidth = 1.75,
  className = "text-[#0E6B5A]",
}: StageIconProps) {
  const Icon = iconForStage(stageKey);
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
