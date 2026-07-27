import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Building2, CreditCard, Settings, Bell, LifeBuoy, LogOut,
  ShieldCheck, Clock, type LucideIcon,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resolveSupplierForUser } from "@/lib/supplierAuth";
import { loadSupplierCompletenessForUser, type SupplierCompleteness } from "@/lib/supplierCompleteness";
import { SupplierPendingBanner, isSupplierLive } from "@/components/supplier/SupplierWorkspace";

type Row = { icon: LucideIcon; label: string; sub?: string; to?: string; onClick?: () => void };

export default function SupplierAccount() {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [completeness, setCompleteness] = useState<SupplierCompleteness | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const uid = session.session?.user?.id;
        const email = session.session?.user?.email ?? "";
        if (!uid) return;
        const sup = await resolveSupplierForUser<{ id: string; business_name: string; approval_status: string }>(
          uid, email, "id, business_name, approval_status",
        );
        if (cancelled || !sup) return;
        setApprovalStatus(sup.approval_status);
        setBusinessName(sup.business_name);
        try {
          const { completeness: comp } = await loadSupplierCompletenessForUser(uid);
          if (!cancelled) setCompleteness(comp);
        } catch { /* ignore */ }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
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

  const displayName = businessName || user?.name || "החשבון שלי";
  const initial = (displayName?.[0] ?? "ס").toUpperCase();
  const live = isSupplierLive(approvalStatus);
  const percent = completeness?.percent ?? null;

  return (
    <MobileShell>
      <div className="min-h-screen bg-[#F7F8FA] pb-8" dir="rtl">
        <header className="px-5 pt-6 pb-4">
          <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight">חשבון</h1>
          <p className="text-[13px] text-[#8E95A2] mt-1">ניהול העסק, מנוי והגדרות</p>
        </header>

        <div className="px-5 mb-4">
          <SupplierPendingBanner status={approvalStatus} />
        </div>

        {/* Identity card */}
        <section className="px-5">
          <div className="bg-white rounded-3xl border border-[#EEF0F3] p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#0E6B5A] to-[#1A8870] text-white font-bold text-[20px] flex items-center justify-center">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[16px] text-[#0F172A] truncate">{displayName}</div>
                <div className="text-[12px] text-[#8E95A2] truncate mt-0.5">{user?.email ?? "ספק"}</div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${
                      live
                        ? "bg-[#E8F5F1] text-[#0E6B5A]"
                        : approvalStatus === "rejected"
                          ? "bg-[#FEE2E2] text-[#991B1B]"
                          : "bg-[#FEF3C7] text-[#92400E]"
                    }`}
                  >
                    {live ? <ShieldCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {live ? "מאושר" : approvalStatus === "rejected" ? "נדחה" : "ממתין לאישור"}
                  </span>
                  {percent != null && (
                    <span className="text-[11px] font-semibold text-[#64748B]">
                      פרופיל {percent}%
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate("/supplier/profile/edit")}
                className="text-[13px] font-semibold text-[#0E6B5A] shrink-0"
              >
                עריכה
              </button>
            </div>

            {percent != null && percent < 100 && (
              <div className="mt-4 pt-4 border-t border-[#F2F4F7]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-[#0E6B5A]">{percent}%</span>
                  <span className="text-[12px] font-semibold text-[#0F172A]">השלמת פרופיל</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${percent}%`, background: "linear-gradient(90deg,#0E6B5A,#1A8870)" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/supplier/profile/edit")}
                  className="mt-2 text-[12px] font-bold text-[#0E6B5A]"
                >
                  השלמת פרטים חסרים
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Settings list */}
        <section className="px-5 mt-5">
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
                  <div className="h-10 w-10 rounded-xl bg-[#E8F5F1] flex items-center justify-center shrink-0">
                    <Icon className="h-[18px] w-[18px] text-[#0E6B5A]" strokeWidth={2} />
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
            className="w-full py-3.5 rounded-2xl bg-white border border-[#FECACA] text-[#DC2626] font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition"
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
