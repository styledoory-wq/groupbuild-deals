import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Tag, User, Briefcase, BarChart3, Users, Building2, ShieldCheck, Heart, Ticket, ScanLine, CheckSquare, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const items: Record<Role, { to: string; label: string; icon: LucideIcon }[]> = {
  resident: [
    { to: "/resident", label: "בית", icon: Home },
    { to: "/resident/deals", label: "עסקאות", icon: Tag },
    { to: "/resident/my-vouchers", label: "ההטבה שלי", icon: Ticket },
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

function BottomNavImpl({ role }: { role: Role }) {
  const location = useLocation();
  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-[440px] md:max-w-xl lg:max-w-2xl px-3 pb-3 md:pb-5 safe-bottom">
        <div className="ios-dock rounded-[28px] px-2 md:px-3 py-2 md:py-2.5 flex items-center justify-between">
          {items[role].map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== `/${role}` && location.pathname.startsWith(to));
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-300 relative group",
                  active ? "text-gold" : "text-[#B8C0CC] hover:text-white"
                )}
              >
                {active && (
                  <>
                    <span aria-hidden className="absolute -inset-0.5 rounded-full bg-gold/10 blur-xl opacity-80" />
                    <span
                      aria-hidden
                      className="absolute top-1 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full"
                      style={{
                        background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.06) 0%, rgba(8,26,51,0.95) 60%, #071427 100%)",
                        boxShadow: "0 0 0 1px rgba(201,169,97,0.22), 0 4px 14px -6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
                      }}
                    />
                  </>
                )}
                <Icon
                  className={cn(
                    "relative transition-transform duration-300",
                    active ? "h-[19px] w-[19px] text-gold scale-105" : "h-[19px] w-[19px]"
                  )}
                  strokeWidth={active ? 1.9 : 1.6}
                />
                <span className={cn("text-[10px] leading-none relative", active ? "font-medium text-gold" : "font-normal")}>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export const BottomNav = memo(BottomNavImpl);
