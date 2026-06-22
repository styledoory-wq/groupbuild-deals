import { useNavigate, useLocation } from "react-router-dom";
import { ScanLine } from "lucide-react";

/**
 * Floating action button for QR scanning - shown across supplier screens.
 * Sits above the BottomNav (mobile) and bottom-left on desktop.
 */
export function ScanFAB() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!pathname.startsWith("/supplier")) return null;
  if (pathname.startsWith("/supplier/scan")) return null;
  // Hide on offer-editor / marketing flows to avoid covering form actions
  if (pathname.includes("/edit") || pathname.includes("/new") || pathname.includes("/marketing")) return null;

  return (
    <button
      onClick={() => navigate("/supplier/scan")}
      aria-label="סריקת קוד"
      title="סריקת קוד"
      data-tour="fab-scan"
      className="fixed z-[95] left-5 lg:left-8 h-14 w-14 rounded-full bg-[#0E6B5A] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h, 64px) + 16px)",
        boxShadow: "0 10px 24px -8px rgba(14,107,90,0.55)",
      }}
    >
      <ScanLine className="h-6 w-6" strokeWidth={2.2} />
    </button>
  );
}
