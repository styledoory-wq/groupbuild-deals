import { useNavigate } from "react-router-dom";
import { LogOut, Building2, Phone, Mail, Pencil, FileText, Wallet, ChevronLeft, User as UserIcon, Bell, Settings } from "lucide-react";

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

  const initial = user?.name?.charAt(0) ?? "";

  const actions = [
    { label: "עריכת פרופיל", icon: Pencil, onClick: () => navigate("/resident/profile/edit") },
    { label: "הפיקדונות שלי", icon: Wallet, onClick: () => navigate("/resident/deposits") },
    { label: "המסמכים שלי", icon: FileText, onClick: () => navigate("/resident/documents") },
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

          {/* Avatar + identity */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="h-[110px] w-[110px] rounded-full ios-avatar-gold mx-auto flex items-center justify-center">
              <UserIcon className="h-12 w-12 text-white" strokeWidth={1.75} />
            </div>
            <h2 className="font-extrabold text-[22px] mt-5 text-[#0A1F3D] tracking-tight">{user?.name}</h2>
            <p className="text-[13px] text-[#475569] mt-1">
              דייר{project ? ` · ${project.name}` : ""}
            </p>
            <div className="mt-5 space-y-2">
              {user?.phone && (
                <div className="flex items-center justify-center gap-2 text-[13px] text-[#475569]">
                  <span>{user.phone}</span>
                  <Phone className="h-4 w-4 text-[#C9A961]" strokeWidth={2} />
                </div>
              )}
              {user?.email && (
                <div className="flex items-center justify-center gap-2 text-[13px] text-[#475569]">
                  <span>{user.email}</span>
                  <Mail className="h-4 w-4 text-[#C9A961]" strokeWidth={2} />
                </div>
              )}
              {project && user?.apartment && (
                <div className="flex items-center justify-center gap-2 text-[13px] text-[#475569]">
                  <span>דירה {user.apartment}</span>
                  <Building2 className="h-4 w-4 text-[#C9A961]" strokeWidth={2} />
                </div>
              )}
            </div>
          </div>


          {/* Action list */}
          <div className="space-y-3">
            {actions.map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="ios-btn-navy w-full h-14 rounded-2xl px-5 flex items-center justify-between font-bold text-[15px] tracking-tight"
              >
                <span className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
                  </span>
                  {label}
                </span>
                <ChevronLeft className="h-5 w-5 text-white/70" strokeWidth={2.4} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
