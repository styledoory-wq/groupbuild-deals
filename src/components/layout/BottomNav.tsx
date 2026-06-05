import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Tag, User, Briefcase, BarChart3, Users, Building2, ShieldCheck, Heart, ScanLine, CheckSquare, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { preloadRoute } from "@/lib/routePreload";
import type { Role } from "@/types";

const items: Record<Role, { to: string; label: string; icon: LucideIcon }[]> = {
  resident: [
    { to: "/resident", label: "בית", icon: Home },
    { to: "/resident/deals", label: "עסקאות", icon: Tag },
    { to: "/resident/search", label: "חיפוש", icon: Search },
    { to: "/resident/my-offers", label: "הצעות", icon: Heart },
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
 * Premium floating dock — Apple-style glass blur, rounded 28px, gold active.
 * Sits above the safe area as a true floating pill (not a full-width bar).
 */
function BottomNavImpl({ role }: { role: Role }) {
  const location = useLocation();
  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 left-0 right-0 z-[90] flex justify-center pointer-events-none px-4 transition-transform duration-200 [.keyboard-open_&]:translate-y-full [.keyboard-open_&]:pointer-events-none"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <div
        className="pointer-events-auto w-full max-w-md flex items-stretch justify-between gap-1 px-2"
        style={{
          height: "var(--nav-h)",
          borderRadius: "28px",
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(236,238,242,0.9)",
          boxShadow: "0 12px 32px -12px rgba(10,31,61,0.18), 0 2px 8px -2px rgba(10,31,61,0.06)",
        }}
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
                "flex-1 min-w-touch flex flex-col items-center justify-center gap-1 transition-all duration-200 relative rounded-2xl",
                active ? "text-[#D4AF37]" : "text-[#0A1F3D]/55 hover:text-[#0A1F3D]",
              )}
              style={{ minHeight: "var(--tap)" }}
            >
              <Icon
                className={cn("shrink-0 transition-transform duration-200", active && "scale-110")}
                style={{ width: "clamp(20px, 5vw, 24px)", height: "clamp(20px, 5vw, 24px)" }}
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span className={cn("text-[10px] leading-none truncate max-w-full px-0.5", active ? "font-bold" : "font-medium")}>
                {label}
              </span>
              {active && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#D4AF37]" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export const BottomNav = memo(BottomNavImpl);
