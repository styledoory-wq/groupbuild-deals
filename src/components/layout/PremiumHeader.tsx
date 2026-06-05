import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  rightSlot?: ReactNode;
}

/**
 * Premium light header — Apple/Wolt inspired.
 * Used by the redesigned post-login pages.
 */
export function PremiumHeader({ title, subtitle, back = true, rightSlot }: Props) {
  const navigate = useNavigate();
  return (
    <header className="px-5 pt-4 pb-2">
      <div className="flex items-center justify-between mb-3">
        {back ? (
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-white border border-[#ECEEF2] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(10,31,61,0.06)] active:scale-95 transition-transform"
            aria-label="חזרה"
          >
            <ChevronRight className="h-[18px] w-[18px] text-[#0A1F3D]" strokeWidth={2.2} />
          </button>
        ) : (
          <div className="h-10 w-10" />
        )}
        <div className="flex items-center gap-2">{rightSlot}</div>
      </div>
      <h1 className="text-[26px] leading-[1.15] font-extrabold tracking-tight text-[#0A1F3D]">{title}</h1>
      {subtitle && <p className="text-[13px] text-[#6B7280] mt-1 font-medium">{subtitle}</p>}
    </header>
  );
}
