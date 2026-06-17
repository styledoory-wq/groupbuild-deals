import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Tag, User, Briefcase, BarChart3, Users, Building2, ShieldCheck, ScanLine, CheckSquare, LayoutGrid, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { preloadRoute } from "@/lib/routePreload";
import { DesktopSidebar } from "./DesktopSidebar";
import type { Role } from "@/types";

const items: Record<Role, { to: string; label: string; icon: LucideIcon }[]> = {
  resident: [
    { to: "/resident", label: "בית", icon: Home },
    { to: "/resident/deals", label: "עסקאות", icon: Tag },
    { to: "/resident/categories", label: "קטגוריות", icon: LayoutGrid },
    { to: "/resident/search", label: "חיפוש", icon: Search },
    { to: "/resident/profile", label: "פרופיל", icon: User },
  ],
  supplier: [
    { to: "/supplier", label: "בית", icon: Home },
    { to: "/supplier/offers", label: "הצעות", icon: Briefcase },
    { to: "/supplier/scan", label: "סריקה", icon: ScanLine },
    { to: "/supplier/redemptions", label: "מימושים", icon: CheckSquare },
    { to: "/supplier/leads", label: "לידים", icon: Users },
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
 * Facebook-style persistent bottom nav — full-width white bar,
 * fixed to the bottom, subtle hairline + shadow, respects iOS safe area.
 */
function BottomNavImpl({ role }: { role: Role }) {
  const location = useLocation();
  return (
    <>
      <DesktopSidebar role={role} />
      <nav
        dir="rtl"
        className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-[90] w-full max-w-[480px] bg-white border-t border-x border-[#ECEEF2] rounded-t-2xl transition-transform duration-200 [.keyboard-open_&]:translate-y-full [.keyboard-open_&]:pointer-events-none"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -4px 16px -8px rgba(31,41,55,0.08)",
        }}
      >
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] flex items-stretch justify-between px-1"
        style={{ height: "var(--nav-h)" }}
      >
        {items[role].map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== `/${role}` && location.pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              onFocus={() => preloadRoute(to)}
              onMouseEnter={() => preloadRoute(to)}
              onPointerDown={() => preloadRoute(to)}
              onTouchStart={() => preloadRoute(to)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-[3px] relative transition-colors duration-150",
                active ? "text-[#C9A227]" : "text-[#6B7280] hover:text-[#1F2937]",
              )}
              style={{ minHeight: "var(--tap)" }}
            >
              {/* Top active indicator — Facebook style */}
              <span
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full transition-all duration-200",
                  active ? "w-10 bg-[#C9A227]" : "w-0 bg-transparent",
                )}
              />
              <Icon
                className={cn("shrink-0 transition-transform duration-200", active && "scale-[1.08]")}
                style={{ width: 24, height: 24 }}
                strokeWidth={active ? 2.4 : 1.9}
              />
              <span className={cn("text-[10.5px] leading-none truncate max-w-full px-0.5 tracking-tight", active ? "font-bold" : "font-semibold")}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
    </>
  );
}

export const BottomNav = memo(BottomNavImpl);
