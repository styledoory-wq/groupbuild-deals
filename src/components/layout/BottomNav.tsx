import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Tag, User, Briefcase, BarChart3, Users, Building2, ShieldCheck, Heart, ScanLine, CheckSquare, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const items: Record<Role, { to: string; label: string; icon: LucideIcon }[]> = {
  resident: [
    { to: "/resident", label: "בית", icon: Home },
    { to: "/resident/deals", label: "עסקאות", icon: Tag },
    { to: "/resident/search", label: "חיפוש", icon: Search },
    { to: "/resident/my-offers", label: "שלי", icon: Heart },
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
 * Floating bottom navigation — fluid sized via design tokens.
 * - Height driven by --nav-h (clamp 60→72px) so MobileShell padding matches.
 * - Each tab is min 44×44 px tap target (WCAG / Apple HIG).
 * - Icon size + label size scale fluidly via the fs-* type tokens.
 */
function BottomNavImpl({ role }: { role: Role }) {
  const location = useLocation();
  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none transition-transform duration-200 [.keyboard-open_&]:translate-y-full [.keyboard-open_&]:pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-[var(--app-max-w)] px-[var(--pad-x)] pb-[max(env(safe-area-inset-bottom),8px)]">
        <div
          className="ios-dock rounded-[22px] px-1.5 sm:px-2.5 flex items-stretch justify-between gap-0.5"
          style={{ minHeight: "var(--nav-h)" }}
        >
          {items[role].map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== `/${role}` && location.pathname.startsWith(to));
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex-1 min-w-touch flex flex-col items-center justify-center gap-1 rounded-2xl transition-colors duration-200 relative group",
                  active ? "text-gold" : "text-white/65 hover:text-white",
                )}
                style={{ minHeight: "var(--tap)" }}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-1 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full"
                    style={{
                      background: "radial-gradient(circle at 30% 25%, rgba(201,169,97,0.22) 0%, rgba(10,31,61,0.0) 70%)",
                      boxShadow: "inset 0 0 0 1px rgba(201,169,97,0.30)",
                    }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative shrink-0 transition-transform duration-200",
                    active && "text-gold scale-110",
                  )}
                  style={{ width: "clamp(18px, 4.5vw, 22px)", height: "clamp(18px, 4.5vw, 22px)" }}
                  strokeWidth={active ? 2 : 1.7}
                />
                <span
                  className={cn(
                    "text-fs-xs leading-none relative truncate max-w-full px-0.5",
                    active ? "font-semibold text-gold" : "font-normal",
                  )}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export const BottomNav = memo(BottomNavImpl);
