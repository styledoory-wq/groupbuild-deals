import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Building2, Phone, Mail, Pencil, FileText, Wallet,
  ChevronLeft, Bell, Shield, Ticket, Camera,
} from "lucide-react";

import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ResidentProfile() {
  const navigate = useNavigate();
  const { user, logout, projects } = useApp();
  const project = projects.find((p) => p.id === user?.projectId);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const cacheKey = `avatar:${user.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setAvatarUrl(cached); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
      const path = (data as { avatar_url?: string | null } | null)?.avatar_url;
      if (!path) return;
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      if (!cancelled && signed?.signedUrl) {
        sessionStorage.setItem(cacheKey, signed.signedUrl);
        setAvatarUrl(signed.signedUrl);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      if (signed?.signedUrl) {
        sessionStorage.setItem(`avatar:${user.id}`, signed.signedUrl);
        setAvatarUrl(signed.signedUrl);
      }
      toast.success("התמונה עודכנה");
    } catch (err) {
      toast.error("שגיאה בהעלאת תמונה");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const initials = (user?.name ?? "").trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join("");

  const actions = [
    { label: "עריכת פרופיל", icon: Pencil, onClick: () => navigate("/resident/profile/edit") },
    { label: "בקשת הרשאת ועד בית", icon: Building2, onClick: () => navigate("/committee/request") },
    { label: "הפיקדונות שלי", icon: Wallet, onClick: () => navigate("/resident/deposits") },
    { label: "ההטבה שלי", icon: Ticket, onClick: () => navigate("/resident/my-vouchers") },
    { label: "המסמכים שלי", icon: FileText, onClick: () => navigate("/resident/documents") },
    { label: "התראות", icon: Bell, onClick: () => navigate("/resident/notifications") },
    { label: "מדיניות פרטיות", icon: Shield, onClick: () => navigate("/resident/privacy") },
  ];

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F7F5F0" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        {/* Hero — avatar + name */}
        <section className="px-5 pt-6 pb-6 text-center">
          <div className="relative inline-block">
            <div className="h-28 w-28 rounded-full bg-white border border-[#ECEEF2] shadow-[0_8px_24px_-8px_rgba(10,31,61,0.15)] flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[34px] font-extrabold text-[#1F2937] tracking-tight">{initials || "?"}</span>
              )}
            </div>
            <label className="absolute bottom-0 left-0 h-9 w-9 rounded-full bg-[#0E6B5A] flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(14,107,90,0.5)] cursor-pointer active:scale-95 transition-transform">
              <Camera className="h-4 w-4 text-white" strokeWidth={2.4} />
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          <h1 className="mt-4 text-[24px] font-extrabold text-[#1F2937] tracking-tight">{user?.name}</h1>
          <p className="text-[13px] text-[#6B7280] mt-1 font-medium">
            דייר{project ? ` · ${project.name}` : ""}
          </p>
        </section>

        {/* Info card */}
        {(user?.phone || user?.email || user?.apartment) && (
          <div className="px-5">
            <div className="bg-white rounded-[24px] border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.06)] divide-y divide-[#F7F5F0]">
              {user?.phone && (
                <InfoRow icon={Phone} label="טלפון" value={user.phone} />
              )}
              {user?.email && (
                <InfoRow icon={Mail} label="אימייל" value={user.email} />
              )}
              {project && user?.apartment && (
                <InfoRow icon={Building2} label="דירה" value={String(user.apartment)} />
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 mt-5 space-y-2">
          {actions.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="w-full h-[60px] rounded-[20px] px-4 flex items-center justify-between bg-white border border-[#ECEEF2] shadow-[0_4px_12px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] active:scale-[0.99] transition-transform"
            >
              <span className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-[#0E6B5A]/12 flex items-center justify-center">
                  <Icon className="h-[18px] w-[18px] text-[#0E6B5A]" strokeWidth={2} />
                </span>
                <span className="text-[15px] font-bold text-[#1F2937] tracking-tight">{label}</span>
              </span>
              <ChevronLeft className="h-5 w-5 text-[#9CA3AF]" strokeWidth={2.2} />
            </button>
          ))}

          <button
            onClick={handleLogout}
            className="mt-4 w-full h-[56px] rounded-[20px] px-4 flex items-center justify-center gap-2 bg-white border border-[#FECACA] text-[#DC2626] active:scale-[0.99] transition-transform"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={2.2} />
            <span className="text-[15px] font-bold tracking-tight">התנתקות</span>
          </button>
        </div>
      </div>
      <BottomNav role="resident" />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="h-9 w-9 rounded-xl bg-[#0E6B5A]/12 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-[#0E6B5A]" strokeWidth={2.2} />
      </span>
      <div className="flex-1 min-w-0 text-right">
        <div className="text-[11px] text-[#6B7280] font-semibold">{label}</div>
        <div className="text-[14px] font-bold text-[#1F2937] truncate">{value}</div>
      </div>
    </div>
  );
}
