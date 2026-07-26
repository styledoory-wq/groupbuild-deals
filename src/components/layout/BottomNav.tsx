import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Tag, User, Briefcase, Users, Building2, ShieldCheck, TrendingUp, LayoutGrid, Search, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { preloadRoute } from "@/lib/routePreload";
import { DesktopSidebar } from "./DesktopSidebar";
import { useAdminAttention } from "@/hooks/useAdminAttention";
import { useApp } from "@/store/AppStore";
import { GuestBottomNav } from "./GuestBottomNav";
import type { Role } from "@/types";

const items: Record<Role, { to: string; label: string; icon: LucideIcon; badgeKey?: "suppliers" | "deals" | "total" }[]> = {
  resident: [
    { to: "/resident", label: "בית", icon: Home },
    { to: "/resident/deals", label: "עסקאות", icon: Tag },
    { to: "/resident/categories", label: "קטגוריות", icon: LayoutGrid },
    { to: "/resident/search", label: "חיפוש", icon: Search },
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
    { to: "/admin", label: "דשבורד", icon: Home, badgeKey: "total" },
    { to: "/admin/suppliers", label: "ספקים", icon: ShieldCheck, badgeKey: "suppliers" },
    { to: "/admin/deals", label: "הצעות", icon: Tag, badgeKey: "deals" },
    { to: "/admin/projects", label: "פרויקטים", icon: Building2 },
    { to: "/admin/settings", label: "הגדרות", icon: Settings },
  ],
};

function BottomNavImpl({ role }: { role: Role }) {
  const location = useLocation();
  const { user, authReady } = useApp();
  const { data: attention } = useAdminAttention();

  // Guest visitors get a completely separate nav (no profile, no notifications, no personal area).
  // We only downgrade to the guest nav for resident-facing chrome — supplier/admin surfaces are auth-only.
  if (role === "resident" && authReady && !user) {
    return <GuestBottomNav />;
  }

  const badgeFor = (key?: "suppliers" | "deals" | "total"): number => {
    if (role !== "admin" || !attention || !key) return 0;
    if (key === "suppliers") return attention.pendingSuppliers;
    if (key === "deals") return attention.dealsNoImage;
    return attention.total;
  };

  return (
    <>
      <DesktopSidebar role={role} />
      <nav
        dir="rtl"
        className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-[90] w-full max-w-[480px] bg-white border-t border-x border-[#ECEEF2] rounded-t-2xl transition-transform duration-200 [.keyboard-open_&]:translate-y-full [.keyboard-open_&]:pointer-events-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -4px 16px -8px rgba(31,41,55,0.08)" }}
      >
        <div className="mx-auto w-full max-w-[var(--app-max-w)] flex items-stretch justify-between px-1" style={{ height: "var(--nav-h)" }}>
          {items[role].map(({ to, label, icon: Icon, badgeKey }) => {
            const active = location.pathname === to || (to !== `/${role}` && location.pathname.startsWith(to));
            const badge = badgeFor(badgeKey);
            return (
              <NavLink
                key={to}
                to={to}
                data-tour={`nav-${to.split("/").pop()}`}
                onFocus={() => preloadRoute(to)}
                onMouseEnter={() => preloadRoute(to)}
                onPointerDown={() => preloadRoute(to)}
                onTouchStart={() => preloadRoute(to)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors duration-150",
                  active ? "text-[#0E6B5A]" : "text-[#6B7280] hover:text-[#1F2937]",
                )}
                style={{ minHeight: "var(--tap)" }}
              >
                <div
                  className={cn(
                    "relative grid place-items-center rounded-xl transition-all duration-200",
                    active ? "h-9 w-11 bg-[#0E6B5A]/12" : "h-9 w-11 bg-transparent",
                  )}
                >
                  <Icon
                    className="shrink-0"
                    style={{ width: 22, height: 22 }}
                    strokeWidth={active ? 2.35 : 1.9}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C1483C] text-white text-[9.5px] font-bold flex items-center justify-center leading-none tabular-nums">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
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
