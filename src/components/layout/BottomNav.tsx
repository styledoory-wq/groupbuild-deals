import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Tag, User, Bell, Briefcase, BarChart3, Users, Building2, ShieldCheck, Heart, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const items: Record<Role, { to: string; label: string; icon: LucideIcon }[]> = {
  resident: [
    { to: "/resident", label: "בית", icon: Home },
    { to: "/resident/categories", label: "קטגוריות", icon: LayoutGrid },
    { to: "/resident/deals", label: "עסקאות", icon: Tag },
    { to: "/resident/my-offers", label: "ההצעות שלי", icon: Heart },
    { to: "/resident/profile", label: "פרופיל", icon: User },
  ],
  supplier: [
    { to: "/supplier", label: "בית", icon: Home },
    { to: "/supplier/offers", label: "הצעות", icon: Briefcase },
    { to: "/supplier/leads", label: "לידים", icon: Users },
    { to: "/supplier/reviews", label: "ביקורות", icon: BarChart3 },
  ],
  admin: [
    { to: "/admin", label: "בית", icon: Home },
    { to: "/admin/projects", label: "פרויקטים", icon: Building2 },
    { to: "/admin/suppliers", label: "ספקים", icon: ShieldCheck },
    { to: "/admin/deals", label: "עסקאות", icon: Tag },
    { to: "/admin/stats", label: "סטטיסטיקה", icon: BarChart3 },
  ],
};

export function BottomNav({ role }: { role: Role }) {
  const location = useLocation();
  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-[440px] md:max-w-xl lg:max-w-2xl px-3 pb-3 md:pb-5 safe-bottom">
        <div className="gb-dock rounded-[28px] px-2 md:px-3 py-2 md:py-2.5 flex items-center justify-between">
          {items[role].map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== `/${role}` && location.pathname.startsWith(to));
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-300 relative group",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-gradient-to-b from-gold/25 via-gold/10 to-transparent ring-1 ring-gold/40 shadow-[0_8px_20px_-8px_hsl(44_53%_54%_/_0.45)]"
                  />
                )}
                <Icon
                  className={cn(
                    "h-[19px] w-[19px] relative transition-transform duration-300",
                    active && "text-gold drop-shadow-[0_0_8px_hsl(44_53%_54%_/_0.6)] scale-110"
                  )}
                  strokeWidth={active ? 2.4 : 1.75}
                />
                <span className={cn("text-[10px] leading-none relative", active ? "font-bold" : "font-normal")}>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
