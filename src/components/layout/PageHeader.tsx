import { ArrowRight, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/AppStore";
import { AppContainer } from "./AppContainer";

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  showBell?: boolean;
  variant?: "navy" | "cream";
  rightSlot?: React.ReactNode;
}

/**
 * PageHeader — fluid spacing + typography via design tokens.
 * - Title uses gb-h1 (fluid clamp scale).
 * - Icon buttons are 44×44 tap targets on every breakpoint.
 * - Horizontal padding follows the global --pad-x token via AppContainer.
 */
export function PageHeader({ title, subtitle, back = true, showBell = false, variant = "navy", rightSlot }: Props) {
  const navigate = useNavigate();
  const { unreadCount } = useApp();

  const isNavy = variant === "navy";

  return (
    <header
      className={cn(
        "rounded-b-[clamp(20px,3vw,36px)] relative overflow-hidden",
        "pt-[clamp(12px,2vw,32px)] pb-[clamp(20px,3vw,48px)]",
        isNavy ? "gb-hero-calm" : "bg-background text-foreground border-b border-border",
      )}
    >
      <AppContainer>
        <div className="flex items-center justify-between mb-[clamp(12px,1.5vw,24px)] relative">
          {back ? (
            <button
              onClick={() => navigate(-1)}
              className={cn(
                "h-touch w-touch min-w-touch min-h-touch rounded-full flex items-center justify-center transition-smooth",
                isNavy ? "bg-white/12 hover:bg-white/20 border border-white/20 backdrop-blur text-white" : "bg-card border border-border hover:bg-muted text-foreground",
              )}
              aria-label="חזרה"
            >
              <ArrowRight className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>
          ) : (
            <div className="h-touch w-touch" />
          )}

          <div className="flex items-center gap-2">
            {rightSlot}
            {showBell && (
              <button
                onClick={() => navigate("/resident/notifications")}
                className={cn(
                  "relative h-touch w-touch min-w-touch min-h-touch rounded-full flex items-center justify-center transition-smooth",
                  isNavy ? "bg-white/12 hover:bg-white/20 border border-white/20 backdrop-blur text-white" : "bg-card border border-border text-foreground",
                )}
                aria-label="התראות"
              >
                <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full bg-gold" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 animate-fade-up relative text-right">
          <div className="gb-divider-gold mr-0 ml-auto" />
          <h1
            className={cn(
              "gb-h1 break-words",
              isNavy ? "text-white" : "text-foreground",
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                "text-fs-sm leading-relaxed font-medium",
                isNavy ? "text-white/85" : "text-muted-foreground",
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      </AppContainer>
    </header>
  );
}
