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
        "px-5 md:px-8 lg:px-10 pt-7 md:pt-10 pb-10 md:pb-14 rounded-b-[28px] md:rounded-b-[36px] relative overflow-hidden",
        isNavy ? "gb-hero-premium" : "bg-background text-foreground border-b border-border"
      )}
    >
      {isNavy && (
        <>
          <div aria-hidden className="absolute -top-20 -left-16 h-52 w-52 rounded-full bg-gold/20 blur-3xl pointer-events-none gb-float" />
          <div aria-hidden className="absolute -bottom-12 -right-12 h-52 w-52 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />
          <div aria-hidden className="absolute top-8 right-1/3 h-2 w-2 rounded-full bg-gold/80 shadow-[0_0_12px_hsl(44_53%_54%_/_0.8)] pointer-events-none" />
          <div aria-hidden className="absolute bottom-12 left-12 h-1.5 w-1.5 rounded-full bg-white/60 shadow-[0_0_8px_hsl(0_0%_100%_/_0.6)] pointer-events-none" />
        </>
      )}
      <div className="flex items-center justify-between mb-6 relative">
        {back ? (
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center transition-smooth",
              isNavy ? "bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur" : "bg-card border border-border hover:bg-muted"
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
                isNavy ? "bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur" : "bg-card border border-border"
              )}
              aria-label="התראות"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {unreadCount > 0 && (
                <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_hsl(44_53%_54%_/_0.8)]" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5 animate-fade-up relative">
        <div className="gb-divider-gold gb-glow-gold" />
        <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-tight">{title}</h1>
        {subtitle && (
          <p className={cn("text-[13px] leading-relaxed", isNavy ? "text-primary-foreground/75" : "text-muted-foreground")}>
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
