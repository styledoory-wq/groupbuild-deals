import { useNavigate } from "react-router-dom";
import { ChevronLeft, Building2, CreditCard, Settings, Bell, LifeBuoy, LogOut, type LucideIcon } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = { icon: LucideIcon; label: string; sub?: string; to?: string; onClick?: () => void };

export default function SupplierAccount() {
  const navigate = useNavigate();
  const { user, logout } = useApp();

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    await logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  const rows: Row[] = [
    { icon: Building2, label: "פרופיל העסק", sub: "פרטים, תחומים, אזורים ומיתוג", to: "/supplier/profile/edit" },
    { icon: CreditCard, label: "מנוי וחיובים", sub: "תכנית, חשבוניות, אמצעי תשלום" },
    { icon: Settings, label: "הגדרות", sub: "שפה, אזור פעילות, פרטיות" },
    { icon: Bell, label: "התראות", sub: "Email, Push, וואטסאפ", to: "/settings/notifications" },
    { icon: LifeBuoy, label: "תמיכה", sub: "מרכז עזרה, צור קשר", to: "/support" },
  ];

  const displayName = user?.name || "החשבון שלי";
  const initial = (displayName?.[0] ?? "ס").toUpperCase();

  return (
    <MobileShell>
      <div className="min-h-screen bg-[#F7F8FA] pb-8" dir="rtl">
        <header className="px-5 pt-6 pb-5">
          <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight">חשבון</h1>
          <p className="text-[13px] text-[#8E95A2] mt-1">ניהול העסק, מנוי והגדרות</p>
        </header>

        {/* Identity card */}
        <section className="px-5">
          <div className="bg-white rounded-3xl border border-[#EEF0F3] p-5 flex items-center gap-4 shadow-sm">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#0E6B5A] to-[#1A8870] text-white font-bold text-[20px] flex items-center justify-center">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[16px] text-[#0F172A] truncate">{displayName}</div>
              <div className="text-[12px] text-[#8E95A2] truncate mt-0.5">{user?.email ?? "ספק"}</div>
            </div>
            <button
              onClick={() => navigate("/supplier/profile/edit")}
              className="text-[13px] font-semibold text-[#0E6B5A] shrink-0"
            >
              עריכה
            </button>
          </div>
        </section>

        {/* Settings list */}
        <section className="px-5 mt-6">
          <div className="bg-white rounded-3xl border border-[#EEF0F3] overflow-hidden shadow-sm">
            {rows.map((r, i) => {
              const Icon = r.icon;
              const onClick = r.onClick ?? (r.to ? () => navigate(r.to!) : () => toast.message("בקרוב"));
              return (
                <button
                  key={r.label}
                  onClick={onClick}
                  className={`w-full flex items-center gap-3 p-4 text-right active:bg-[#F7F8FA] transition ${i < rows.length - 1 ? "border-b border-[#F2F4F7]" : ""}`}
                >
                  <div className="h-10 w-10 rounded-xl bg-[#F4F6F9] flex items-center justify-center shrink-0">
                    <Icon className="h-[18px] w-[18px] text-[#0F172A]" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="font-semibold text-[14px] text-[#0F172A]">{r.label}</div>
                    {r.sub && <div className="text-[12px] text-[#8E95A2] mt-0.5 truncate">{r.sub}</div>}
                  </div>
                  <ChevronLeft className="h-4 w-4 text-[#8E95A2] shrink-0" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Logout */}
        <section className="px-5 mt-6">
          <button
            onClick={handleLogout}
            className="w-full h-13 py-3.5 rounded-2xl bg-white border border-[#FECACA] text-[#DC2626] font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.4} />
            יציאה מהחשבון
          </button>
          <div className="text-center text-[11px] text-[#9CA3AF] mt-4">
            GroupBuild © {new Date().getFullYear()}
          </div>
        </section>
      </div>
      <BottomNav role="supplier" />
    </MobileShell>
  );
}
