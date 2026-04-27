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
        "px-5 pt-6 pb-8 rounded-b-[28px]",
        isNavy ? "bg-gradient-hero text-primary-foreground" : "bg-background text-foreground border-b border-border"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        {back ? (
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center transition-smooth",
              isNavy ? "bg-white/10 hover:bg-white/20" : "bg-card border border-border hover:bg-muted"
            )}
            aria-label="חזרה"
          >
            <ArrowRight className="h-5 w-5" />
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
                isNavy ? "bg-white/10 hover:bg-white/20" : "bg-card border border-border"
              )}
              aria-label="התראות"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute top-1.5 left-1.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-primary" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 animate-fade-up">
        <div className="gb-divider-gold" />
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        {subtitle && (
          <p className={cn("text-sm", isNavy ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
