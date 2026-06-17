import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  to?: string;
  className?: string;
}

/**
 * Small round documents shortcut — matches the bell / support style.
 */
export function DocumentsButton({ to = "/resident/documents", className = "" }: Props) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      aria-label="המסמכים שלי"
      className={`h-10 w-10 rounded-full bg-white border border-[#ECEEF2] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(10,31,61,0.06)] active:scale-95 transition-transform ${className}`}
    >
      <FileText className="h-[18px] w-[18px] text-[#1F2937]" strokeWidth={2} />
    </button>
  );
}
