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

/**
 * Unified PageHeader — light, clean, aligned with the resident DS.
 * `variant` is accepted for backward compat but always renders the light style.
 */
export function PageHeader({ title, subtitle, back = true, showBell = false, rightSlot }: Props) {
  const navigate = useNavigate();
  const { unreadCount } = useApp();

  return (
    <header className="px-5 pt-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        {back ? (
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center bg-white",
              "shadow-[0_2px_8px_-2px_rgba(10,31,61,0.06)] active:scale-95 transition-transform",
            )}
            aria-label="חזרה"
          >
            <ArrowRight className="h-[18px] w-[18px] text-[#0A1F3D]" strokeWidth={2} />
          </button>
        ) : (
          <div className="h-10 w-10" />
        )}

        <div className="flex items-center gap-2">
          {rightSlot}
          {showBell && (
            <button
              onClick={() => navigate("/resident/notifications")}
              className="relative h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(10,31,61,0.06)] active:scale-95 transition-transform"
              aria-label="התראות"
            >
              <Bell className="h-[18px] w-[18px] text-[#0A1F3D]" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full bg-[#D4AF37]" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="text-right">
        <h1 className="text-[24px] font-extrabold text-[#0A1F3D] tracking-tight leading-tight break-words">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px] font-medium text-[#6B7280] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
