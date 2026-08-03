import { ChevronRight, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSmartBack } from "@/lib/backNavigation";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/AppStore";
import { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  showBell?: boolean;
  /** "default" = standard PageHeader. "large" = premium-style hero header. */
  size?: "large" | "default";
  /** Accepted for backward compatibility — visual variant is no longer used. */
  variant?: "navy" | "cream";
  rightSlot?: ReactNode;
  /** Route to land on when there is no history (deep link / push / share entry). */
  backTo?: string;
  /** Full override of the back button behaviour. */
  onBack?: () => void;
}

/**
 * Unified PageHeader — light, clean, semantic-token based.
 * Merges the former PremiumHeader via the `size="large"` prop.
 */
export function PageHeader({
  title,
  subtitle,
  back = true,
  showBell = false,
  size = "default",
  rightSlot,
  backTo,
  onBack,
}: Props) {
  const navigate = useNavigate();
  const smartBack = useSmartBack(backTo);
  const { unreadCount } = useApp();
  const large = size === "large";

  return (
    <header className={cn("px-5 pt-4 animate-fade-in", large ? "pb-2" : "pb-3")}>
      <div className={cn("flex items-center justify-between", large ? "mb-3" : "mb-2")}>
        {back ? (
          <button
            onClick={onBack ?? smartBack}
            className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center bg-card",
              "shadow-[var(--shadow-soft)] active:scale-95 transition-transform",
            )}
            aria-label="חזרה"
          >
            <ChevronRight className="h-[18px] w-[18px] text-foreground" strokeWidth={2.2} />
          </button>
        ) : (
          <div className="h-11 w-11" />
        )}

        <div className="flex items-center gap-2">
          {rightSlot}
          {showBell && (
            <button
              onClick={() => navigate("/resident/notifications")}
              className="relative h-11 w-11 rounded-full bg-card flex items-center justify-center shadow-[var(--shadow-soft)] active:scale-95 transition-transform"
              aria-label="התראות"
            >
              <Bell className="h-[18px] w-[18px] text-foreground" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full bg-secondary" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className={large ? "" : "text-right"}>
        <h1
          className={cn(
            "font-extrabold tracking-tight text-foreground",
            large ? "text-[26px] leading-[1.15]" : "text-[24px] leading-tight break-words",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              "text-muted-foreground font-medium",
              large ? "text-[13px] mt-1" : "mt-1 text-[13px] leading-relaxed",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
