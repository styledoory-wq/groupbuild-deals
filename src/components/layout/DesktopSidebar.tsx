import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Tag, User, Briefcase, BarChart3, Users, Building2, ShieldCheck, Heart, CheckSquare, LogOut, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { preloadRoute } from "@/lib/routePreload";
import { BrandLogo } from "@/components/BrandLogo";
import { useApp } from "@/store/AppStore";
import { toast } from "sonner";
import type { Role } from "@/types";

const items: Record<Role, { to: string; label: string; icon: LucideIcon }[]> = {
  resident: [
    { to: "/resident", label: "בית", icon: Home },
    { to: "/resident/deals", label: "עסקאות", icon: Tag },
    { to: "/resident/favorites", label: "מועדפים", icon: Heart },
    { to: "/resident/my-offers", label: "ההצעות שלי", icon: CheckSquare },
    { to: "/resident/profile", label: "פרופיל", icon: User },
  ],
  supplier: [
    { to: "/supplier", label: "בית", icon: Home },
    { to: "/supplier/leads", label: "לידים", icon: Users },
    { to: "/supplier/offers", label: "הצעות", icon: Briefcase },
    { to: "/supplier/revenue", label: "הכנסות", icon: TrendingUp },
    { to: "/supplier/account", label: "חשבון", icon: User },
  ],
  admin: [
    { to: "/admin", label: "בית", icon: Home },
    { to: "/admin/projects", label: "פרויקטים", icon: Building2 },
    { to: "/admin/suppliers", label: "ספקים", icon: ShieldCheck },
    { to: "/admin/deals", label: "עסקאות", icon: Tag },
    { to: "/admin/stats", label: "סטטיסטיקה", icon: BarChart3 },
  ],
};

/**
 * Right-side fixed sidebar shown only on lg+ (≥1024px).
 * Toggles `body.has-desktop-sidebar` so the global CSS reserves padding-right.
 */
export function DesktopSidebar({ role }: { role: Role }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useApp();

  useEffect(() => {
    document.body.classList.add("has-desktop-sidebar");
    return () => document.body.classList.remove("has-desktop-sidebar");
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  return (
    <aside
      dir="rtl"
      className="hidden lg:flex fixed top-0 right-0 bottom-0 w-[248px] z-[80] flex-col bg-white border-l border-[#ECEEF2] shadow-[var(--shadow-soft)] pt-[env(safe-area-inset-top)]"
    >
      <div className="px-5 pt-6 pb-4 border-b border-[#ECEEF2]">
        <BrandLogo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items[role].map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== `/${role}` && pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              onMouseEnter={() => preloadRoute(to)}
              onFocus={() => preloadRoute(to)}
              className={cn(
                "flex items-center gap-3 h-12 px-4 rounded-[14px] text-[15px] font-bold transition-colors",
                active
                  ? "bg-[#0E6B5A] text-white shadow-[0_6px_16px_-8px_rgba(10,31,61,0.45)]"
                  : "text-[#1F2937] hover:bg-[#F4F6FA]",
              )}
            >
              <Icon
                className="shrink-0"
                style={{ width: 20, height: 20 }}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className="truncate">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#ECEEF2] space-y-1">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 h-12 px-4 rounded-[14px] text-[15px] font-bold text-[#1F2937] hover:bg-[#F4F6FA] w-full transition-colors"
        >
          <LogOut className="shrink-0" style={{ width: 20, height: 20 }} strokeWidth={2} />
          <span className="truncate">יציאה</span>
        </button>
      </div>

      <div className="px-5 py-4 border-t border-[#ECEEF2] text-[11px] text-[#9CA3AF] text-center">
        GroupBuild © {new Date().getFullYear()}
      </div>
    </aside>
  );
}
