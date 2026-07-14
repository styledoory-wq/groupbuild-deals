import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface BackHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional element rendered on the left side of the header (icons, buttons). */
  right?: ReactNode;
  /** Custom back handler. Defaults to navigate(-1). Pass `false` to hide the back button. */
  onBack?: (() => void) | false;
}

/**
 * Unified sticky header used across simple/inner pages
 * (Committee, Admin, settings, forms). Mirrors the inline pattern that was
 * duplicated across ~40 pages.
 *
 * For rich top-level dashboards (Resident/Supplier home) keep the custom
 * headers that include greeting + avatar — they're intentional.
 */
export function BackHeader({ title, subtitle, right, onBack }: BackHeaderProps) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (typeof onBack === "function") onBack();
    else navigate(-1);
  };
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-[#EDEAE3]">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
        {onBack !== false ? (
          <button
            onClick={handleBack}
            className="p-2 -mr-2 rounded-full hover:bg-[#F0EEE7] active:scale-95 transition"
            aria-label="חזרה"
          >
            <ArrowRight className="w-5 h-5 text-[#1F1F1F]" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <div className="flex-1 min-w-0">
          {/* Not the page H1 — that lives in page content. This is a nav label. */}
          <div className="text-base font-semibold text-[#1F1F1F] truncate" role="heading" aria-level={2}>{title}</div>
          {subtitle && (
            <p className="text-xs text-[#6B6B6B] truncate">{subtitle}</p>
          )}
        </div>
        {right && <div className="shrink-0 flex items-center gap-1">{right}</div>}
      </div>
    </header>
  );
}
