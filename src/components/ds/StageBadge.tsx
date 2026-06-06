import { StageTheme } from "@/lib/designSystem";

interface StageBadgeProps {
  stage: StageTheme;
  size?: "sm" | "md";
}

/** Pill that displays "שלב N · שם השלב" using the stage's accent color. */
export function StageBadge({ stage, size = "sm" }: StageBadgeProps) {
  const px = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  const fs = size === "md" ? "text-[11.5px]" : "text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1 ${px} ${fs} font-extrabold rounded-full`}
      style={{ background: stage.tint, color: stage.accent }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: stage.accent }} />
      שלב {stage.index} · {stage.shortTitle}
    </span>
  );
}
