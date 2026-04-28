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
  const { notifications } = useApp();
  const unread = notifications.filter((n) => n.unread).length;

  const isNavy = variant === "navy";

  return (
    <header
      className={cn(
        "px-5 pt-7 pb-10 rounded-b-[24px]",
        isNavy ? "bg-gradient-hero text-primary-foreground" : "bg-background text-foreground border-b border-border"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        {back ? (
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center transition-smooth",
              isNavy ? "bg-white/10 hover:bg-white/15 border border-white/10" : "bg-card border border-border hover:bg-muted"
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
                isNavy ? "bg-white/10 hover:bg-white/15 border border-white/10" : "bg-card border border-border"
              )}
              aria-label="התראות"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {unread > 0 && (
                <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-gold" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 animate-fade-up">
        <div className="gb-divider-gold" />
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && (
          <p className={cn("text-sm", isNavy ? "text-primary-foreground/65" : "text-muted-foreground")}>
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
