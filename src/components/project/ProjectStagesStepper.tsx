import { Check } from "lucide-react";

const URBANIST = "'Urbanist', system-ui, sans-serif";
const BRAND = "#0E6B5A";

export type StepperStage = {
  key: string;
  num: number;
  short: string;
};

interface Props {
  stages: StepperStage[];
  /** Index of the currently active stage. */
  currentIdx: number;
  /** Stages with index < doneBeforeIdx are rendered as completed (✓). Defaults to currentIdx. */
  doneBeforeIdx?: number;
  onSelect?: (idx: number) => void;
  /** Compact variant shrinks the circles + label — used on the dashboard card. */
  compact?: boolean;
  className?: string;
}

/**
 * Shared numbered-circle stepper used by ProjectManagement and the resident
 * dashboard "My Project" card. Keeps a single source of truth for the visual.
 */
export function ProjectStagesStepper({
  stages,
  currentIdx,
  doneBeforeIdx,
  onSelect,
  compact = false,
  className = "",
}: Props) {
  const doneBefore = doneBeforeIdx ?? currentIdx;
  const Wrapper: "div" | "button" = "div";
  return (
    <div
      className={`bg-white rounded-2xl ${compact ? "p-2" : "p-3"} border border-gray-100 shadow-sm overflow-x-auto no-scrollbar ${className}`}
    >
      <div className="flex items-center gap-1 min-w-max relative">
        {stages.map((s, i) => {
          const isCurrent = i === currentIdx;
          const isDone = i < doneBefore;
          const circleBase = compact
            ? isCurrent
              ? "w-8 h-8 text-[12px] ring-4 ring-[#0E6B5A]/15"
              : "w-7 h-7 text-[11px]"
            : isCurrent
              ? "w-10 h-10 text-[14px] ring-4 ring-[#0E6B5A]/15"
              : "w-8 h-8 text-[12px]";
          const isInteractive = !!onSelect;
          const Node: "button" | "div" = isInteractive ? "button" : "div";
          return (
            <Node
              key={s.key}
              type={isInteractive ? "button" : undefined}
              onClick={
                isInteractive
                  ? (e: React.MouseEvent) => {
                      e.stopPropagation();
                      onSelect!(i);
                    }
                  : undefined
              }
              className={`flex flex-col items-center gap-1 ${compact ? "px-1.5 py-0.5" : "px-2 py-1"} shrink-0`}
            >
              <div
                className={`flex items-center justify-center rounded-full font-extrabold transition-all ${circleBase} ${
                  isDone ? "text-white" : isCurrent ? "text-white" : "text-gray-400 bg-gray-100"
                }`}
                style={{
                  background: isDone || isCurrent ? BRAND : undefined,
                  fontFamily: URBANIST,
                }}
              >
                {isDone ? <Check className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> : s.num}
              </div>
              <div
                className={`${compact ? "text-[9.5px]" : "text-[10.5px]"} font-bold whitespace-nowrap ${
                  isCurrent ? "text-[#0E6B5A]" : "text-gray-500"
                }`}
              >
                {s.short}
              </div>
            </Node>
          );
        })}
      </div>
    </div>
  );
}
