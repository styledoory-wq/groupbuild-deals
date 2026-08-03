import { ReactNode } from "react";
import { useSmartBack } from "@/lib/backNavigation";
import { ChevronRight } from "lucide-react";

interface BackHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional element rendered on the left side of the header (icons, buttons). */
  right?: ReactNode;
  /** Custom back handler. Defaults to smart back. Pass `false` to hide the back button. */
  onBack?: (() => void) | false;
  /** Route to land on when there is no history (deep link / push / share entry). */
  backTo?: string;
}

/**
 * Unified sticky header for inner pages.
 * Metrics locked to the shared header system: 56px row, px-5,
 * 44×44 circular back button with the same ChevronRight icon as PageHeader.
 */
export function BackHeader({ title, subtitle, right, onBack, backTo }: BackHeaderProps) {
  const smartBack = useSmartBack(backTo);
  const handleBack = () => {
    if (typeof onBack === "function") onBack();
    else smartBack();
  };
  return (
    <header
      className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/60"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-2">
        {onBack !== false ? (
          <button
            onClick={handleBack}
            className="h-11 w-11 -mr-2 shrink-0 rounded-full flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-transform duration-150 touch-manipulation"
            aria-label="חזרה"
          >
            <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
        ) : (
          <div className="w-11 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {/* Not the page H1 — that lives in page content. This is a nav label. */}
          <div
            className="text-[16px] font-bold tracking-tight text-foreground truncate"
            role="heading"
            aria-level={2}
          >
            {title}
          </div>
          {subtitle && (
            <p className="text-[12px] font-medium text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {right && <div className="shrink-0 flex items-center gap-1">{right}</div>}
      </div>
    </header>
  );
}
