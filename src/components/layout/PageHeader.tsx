import { ArrowRight, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/AppStore";

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  showBell?: boolean;
  variant?: "navy" | "cream";
  rightSlot?: React.ReactNode;
}

export function PageHeader({ title, subtitle, back = true, showBell = false, variant = "navy", rightSlot }: Props) {
  const navigate = useNavigate();
  const { unreadCount } = useApp();

  const isNavy = variant === "navy";

  return (
    <header
      className={cn(
        "px-5 md:px-8 lg:px-10 pt-6 md:pt-8 pb-8 md:pb-12 rounded-b-[28px] md:rounded-b-[36px] relative overflow-hidden",
        isNavy ? "gb-hero-calm" : "bg-background text-foreground border-b border-border"
      )}
    >
      <div className="flex items-center justify-between mb-6 relative">
        {back ? (
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center transition-smooth",
              isNavy ? "bg-white/12 hover:bg-white/20 border border-white/20 backdrop-blur text-white" : "bg-card border border-border hover:bg-muted text-foreground"
            )}
            aria-label="חזרה"
          >
            <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        ) : (
          <div className="h-10 w-10" />
        )}

        <div className="flex items-center gap-2">
          {rightSlot}
          {showBell && (
            <button
              onClick={() => navigate("/resident/notifications")}
              className={cn(
                "relative h-10 w-10 rounded-full flex items-center justify-center transition-smooth",
                isNavy ? "bg-white/12 hover:bg-white/20 border border-white/20 backdrop-blur text-white" : "bg-card border border-border text-foreground"
              )}
              aria-label="התראות"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {unreadCount > 0 && (
                <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-gold" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 animate-fade-up relative text-right">
        <div className="gb-divider-gold mr-0 ml-auto" />
        <h1 className={cn(
          "text-[26px] md:text-[34px] lg:text-[40px] font-extrabold leading-[1.15] tracking-tight",
          isNavy ? "text-white" : "text-foreground"
        )}>{title}</h1>
        {subtitle && (
          <p className={cn(
            "text-[14px] leading-relaxed font-medium",
            isNavy ? "text-white/85" : "text-muted-foreground"
          )}>
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
