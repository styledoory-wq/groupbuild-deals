import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Tag, User, Briefcase, Users, Building2, ShieldCheck, Heart, CheckSquare, LogOut, TrendingUp, CreditCard, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { preloadRoute } from "@/lib/routePreload";
import { BrandLogo } from "@/components/BrandLogo";
import { useApp } from "@/store/AppStore";
import { useAdminAttention } from "@/hooks/useAdminAttention";
import { toast } from "sonner";
import type { Role } from "@/types";

const items: Record<Role, { to: string; label: string; icon: LucideIcon; badgeKey?: "suppliers" | "deals" | "complaints" | "leads" | "committee" }[]> = {
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
    { to: "/admin", label: "דשבורד", icon: Home },
    { to: "/admin/suppliers", label: "ספקים", icon: ShieldCheck, badgeKey: "suppliers" },
    { to: "/admin/deals", label: "הצעות", icon: Tag, badgeKey: "deals" },
    { to: "/admin/projects", label: "פרויקטים", icon: Building2 },
    { to: "/admin/leads", label: "לידים", icon: Users, badgeKey: "leads" },
    { to: "/admin/payments", label: "תשלומים", icon: CreditCard },
    { to: "/admin/settings", label: "הגדרות", icon: Settings },
  ],
};

export function DesktopSidebar({ role }: { role: Role }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useApp();
  const { data: attention } = useAdminAttention();

  useEffect(() => {
    document.body.classList.add("has-desktop-sidebar");
    return () => document.body.classList.remove("has-desktop-sidebar");
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  const badgeFor = (key?: "suppliers" | "deals" | "complaints" | "leads" | "committee"): number => {
    if (role !== "admin" || !attention || !key) return 0;
    if (key === "suppliers") return attention.pendingSuppliers;
    if (key === "deals") return attention.dealsNoImage;
    if (key === "complaints") return attention.openComplaints;
    if (key === "leads") return attention.openLeads;
    if (key === "committee") return attention.pendingCommittee;
    return 0;
  };

  return (
    <aside
      dir="rtl"
      className="hidden lg:flex fixed top-0 right-0 bottom-0 w-[248px] z-[80] flex-col bg-white border-l border-[#EEF0F4] pt-[env(safe-area-inset-top)]"
    >
      <div className="px-5 pt-6 pb-4 border-b border-[#EEF0F4]">
        <BrandLogo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items[role].map(({ to, label, icon: Icon, badgeKey }) => {
          const active = pathname === to || (to !== `/${role}` && pathname.startsWith(to));
          const badge = badgeFor(badgeKey);
          return (
            <NavLink
              key={to}
              to={to}
              onMouseEnter={() => preloadRoute(to)}
              onFocus={() => preloadRoute(to)}
              className={cn(
                "flex items-center gap-3 h-11 px-3.5 rounded-[10px] text-[14px] font-semibold transition-all duration-200 ease-out",
                active
                  ? "bg-[#0F172A] text-white"
                  : "text-[#4B5563] hover:bg-[#F4F6FA] hover:text-[#0F172A]",
              )}
            >
              <Icon className="shrink-0" style={{ width: 18, height: 18 }} strokeWidth={active ? 2 : 1.75} />
              <span className="truncate flex-1">{label}</span>
              {badge > 0 && (
                <span className={cn(
                  "min-w-[20px] h-5 px-1.5 rounded-full text-[10.5px] font-bold flex items-center justify-center tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-[#C1483C] text-white",
                )}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-[#EEF0F4]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 h-11 px-3.5 rounded-[10px] text-[14px] font-semibold text-[#4B5563] hover:bg-[#F4F6FA] hover:text-[#0F172A] w-full transition-all duration-200"
        >
          <LogOut className="shrink-0" style={{ width: 18, height: 18 }} strokeWidth={1.75} />
          <span className="truncate">יציאה</span>
        </button>
      </div>

      <div className="px-5 py-3 border-t border-[#EEF0F4] text-[11px] text-[#8B94A3] text-center">
        GroupBuild © {new Date().getFullYear()}
      </div>
    </aside>
  );
}
