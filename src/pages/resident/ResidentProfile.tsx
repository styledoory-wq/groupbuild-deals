import { useNavigate } from "react-router-dom";
import { LogOut, Building2, Phone, Mail, Pencil, FileText, Wallet, ChevronLeft, User as UserIcon, Bell, Settings, Shield } from "lucide-react";

import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { toast } from "sonner";
import ambientBg from "@/assets/profile-ambient-bg.jpg";

export default function ResidentProfile() {
  const navigate = useNavigate();
  const { user, logout, projects } = useApp();
  const project = projects.find((p) => p.id === user?.projectId);

  const handleLogout = async () => {
    await logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  const initials = (user?.name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("");
  const avatarUrl = (user as unknown as { avatar_url?: string; image_url?: string; photo_url?: string })?.avatar_url
    || (user as unknown as { image_url?: string })?.image_url
    || (user as unknown as { photo_url?: string })?.photo_url
    || "";

  const actions = [
    { label: "עריכת פרופיל", icon: Pencil, onClick: () => navigate("/resident/profile/edit") },
    { label: "הפיקדונות שלי", icon: Wallet, onClick: () => navigate("/resident/deposits") },
    { label: "המסמכים שלי", icon: FileText, onClick: () => navigate("/resident/documents") },
    { label: "מדיניות פרטיות", icon: Shield, onClick: () => navigate("/resident/privacy") },
    { label: "התנתקות", icon: LogOut, onClick: handleLogout },
  ];

  return (
    <MobileShell>
      {/* Architectural ambient backdrop — soft blurred luxury skyline */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <img
          src={ambientBg}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute inset-x-0 top-0 w-full h-[70vh] object-cover opacity-[0.18] blur-[2px] scale-110"
        />
        {/* Navy tint wash to keep ambience cohesive */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1F3D]/10 via-[#F5F7FA]/70 to-[#E7ECF3]" />
        {/* Soft gold ambient glow top-right */}
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#C9A961]/15 blur-3xl" />
        {/* Navy depth glow bottom-left */}
        <div className="absolute bottom-10 -left-20 h-72 w-72 rounded-full bg-[#0A1F3D]/10 blur-3xl" />
        {/* Fine fade to white at content area for readability */}
        <div className="absolute inset-x-0 top-[45vh] h-[40vh] bg-gradient-to-b from-transparent via-white/40 to-white/70" />
      </div>

      <div className="pb-32 relative">
        <div className="pt-4 px-5">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-full bg-white/70 backdrop-blur border border-[#E2E8F0] flex items-center justify-center text-[#0A1F3D] hover:bg-white transition-smooth"
              aria-label="חזרה"
            >
              <ChevronLeft className="h-[18px] w-[18px] rotate-180" strokeWidth={1.75} />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/resident/notifications")}
                className="h-10 w-10 rounded-full bg-white/70 backdrop-blur border border-[#E2E8F0] flex items-center justify-center text-[#0A1F3D] hover:bg-white transition-smooth"
                aria-label="התראות"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => navigate("/resident/profile/edit")}
                className="h-10 w-10 rounded-full bg-white/70 backdrop-blur border border-[#E2E8F0] flex items-center justify-center text-[#0A1F3D] hover:bg-white transition-smooth"
                aria-label="הגדרות"
              >
                <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Identity — name + meta, no avatar */}
          <div className="text-center mb-8 animate-fade-in">
            <h2 className="font-extrabold text-[22px] text-[#0A1F3D] tracking-tight leading-snug px-4 break-words">
              {user?.name}
            </h2>
            <p className="text-[13px] text-[#475569] mt-1.5 font-medium">
              דייר{project ? ` · ${project.name}` : ""}
            </p>
            <div className="mt-5 space-y-2.5">
              {user?.phone && (
                <div className="flex items-center justify-center gap-2 text-[14px] text-[#334155]">
                  <span>{user.phone}</span>
                  <Phone className="h-4 w-4 text-[#C9A961]" strokeWidth={2} />
                </div>
              )}
              {user?.email && (
                <div className="flex items-center justify-center gap-2 text-[14px] text-[#334155] break-all">
                  <span>{user.email}</span>
                  <Mail className="h-4 w-4 text-[#C9A961]" strokeWidth={2} />
                </div>
              )}
              {project && user?.apartment && (
                <div className="flex items-center justify-center gap-2 text-[14px] text-[#334155]">
                  <span>דירה {user.apartment}</span>
                  <Building2 className="h-4 w-4 text-[#C9A961]" strokeWidth={2} />
                </div>
              )}
            </div>
          </div>


          {/* Action list — lighter glass cards, premium not heavy */}
          <div className="space-y-2.5">
            {actions.map(({ label, icon: Icon, onClick }, idx) => {
              const isLogout = idx === actions.length - 1;
              return (
                <button
                  key={label}
                  onClick={onClick}
                  className="w-full h-[60px] rounded-2xl px-4 flex items-center justify-between font-semibold text-[15px] tracking-tight bg-white/85 backdrop-blur border border-[#E2E8F0] text-[#0A1F3D] hover:border-[#C9A961]/45 hover:bg-white transition-all active:scale-[0.99] shadow-[0_4px_14px_-8px_rgba(15,30,60,0.10)]"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={
                        "h-10 w-10 rounded-xl flex items-center justify-center border " +
                        (isLogout
                          ? "bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]"
                          : "bg-[#F1F5F9] border-[#E2E8F0] text-[#0A1F3D]")
                      }
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                    </span>
                    <span className={isLogout ? "text-[#B91C1C]" : ""}>{label}</span>
                  </span>
                  <ChevronLeft className="h-5 w-5 text-[#94A3B8]" strokeWidth={2} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
