import { useNavigate } from "react-router-dom";
import { Eye, X } from "lucide-react";
import { setPreviewRole, usePreviewRole } from "@/lib/previewMode";

export function PreviewModeBanner() {
  const role = usePreviewRole();
  const navigate = useNavigate();
  if (!role) return null;
  const label = role === "resident" ? "דייר" : "ספק";
  const exit = () => {
    setPreviewRole(null);
    navigate("/admin", { replace: true });
  };
  return (
    <div
      dir="rtl"
      className="fixed top-0 inset-x-0 z-[120] bg-[#FFF3B0] border-b border-[#D4AF37] text-[#0A1F3D] shadow-[0_2px_8px_-2px_rgba(10,31,61,0.15)]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto max-w-[var(--app-max-w)] flex items-center gap-2 px-4 py-2 text-[12.5px] font-bold">
        <Eye className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="flex-1 truncate">מצב תצוגה — אדמין · ממשק {label}</span>
        <button
          onClick={exit}
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#0A1F3D] text-white text-[11.5px] font-extrabold active:scale-95 transition-transform"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.4} />
          יציאה
        </button>
      </div>
    </div>
  );
}
