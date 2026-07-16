import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Search, Tag, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { preloadRoute } from "@/lib/routePreload";

/**
 * Bottom navigation for anonymous / guest visitors.
 * Reduced surface: no profile, no notifications, no personal area.
 * Rendered by BottomNav when `useApp().user` is null.
 */
const items: { to: string; label: string; icon: LucideIcon; match?: (path: string) => boolean }[] = [
  { to: "/", label: "בית", icon: Home, match: (p) => p === "/" },
  { to: "/categories", label: "קטגוריות", icon: LayoutGrid, match: (p) => p.startsWith("/categories") },
  { to: "/search", label: "חיפוש", icon: Search, match: (p) => p.startsWith("/search") },
  { to: "/deals", label: "דילים", icon: Tag, match: (p) => p.startsWith("/deals") },
];

function GuestBottomNavImpl() {
  const location = useLocation();
  return (
    <nav
      dir="rtl"
      className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-[90] w-full max-w-[480px] bg-white border-t border-x border-[#ECEEF2] rounded-t-2xl transition-transform duration-200 [.keyboard-open_&]:translate-y-full [.keyboard-open_&]:pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -4px 16px -8px rgba(31,41,55,0.08)" }}
      aria-label="ניווט אורח"
    >
      <div className="mx-auto w-full max-w-[var(--app-max-w)] flex items-stretch justify-between px-1" style={{ height: "var(--nav-h)" }}>
        {items.map(({ to, label, icon: Icon, match }) => {
          const active = match ? match(location.pathname) : location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              data-guest-tab={to.replace("/", "") || "home"}
              onFocus={() => preloadRoute(to)}
              onMouseEnter={() => preloadRoute(to)}
              onPointerDown={() => preloadRoute(to)}
              onTouchStart={() => preloadRoute(to)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-[3px] relative transition-colors duration-150",
                active ? "text-[#0E6B5A]" : "text-[#6B7280] hover:text-[#1F2937]",
              )}
              style={{ minHeight: "var(--tap)" }}
            >
              <span
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full transition-all duration-200",
                  active ? "w-10 bg-[#0E6B5A]" : "w-0 bg-transparent",
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
  );
}

export const GuestBottomNav = memo(GuestBottomNavImpl);
