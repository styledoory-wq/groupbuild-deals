import { useNavigate } from "react-router-dom";
import { LogOut, Building2, Phone, Mail, Pencil, FileText, Wallet, ChevronLeft } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { toast } from "sonner";

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
      <div className="ios-bg pb-32">
        {/* Top spacer for status bar feel */}
        <div className="pt-10 px-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight text-[#0D2346] leading-tight">
                הפרופיל שלי
              </h1>
              <p className="text-[13px] text-[#6B7280] mt-1">הפרטים והעסקאות שלך</p>
            </div>
          </div>

          {/* Profile hero card */}
          <div className="ios-card p-6 text-center mb-5 animate-fade-in">
            <div className="h-24 w-24 rounded-full ios-avatar-gold mx-auto flex items-center justify-center">
              <span className="text-[40px] font-extrabold text-white drop-shadow-sm leading-none">
                {initial}
              </span>
            </div>
            <h2 className="font-extrabold text-[20px] mt-4 text-[#0D2346] tracking-tight">{user?.name}</h2>
            <div className="text-[12px] text-[#6B7280] mt-1">
              דייר{project ? ` · ${project.name}` : ""}
            </div>

            <div className="mt-5 space-y-2.5">
              {user?.phone && (
                <div className="ios-meta-row">
                  <Phone className="h-4 w-4 text-[#C9A961]" /> {user.phone}
                </div>
              )}
              {user?.email && (
                <div className="ios-meta-row">
                  <Mail className="h-4 w-4 text-[#C9A961]" /> {user.email}
                </div>
              )}
              {project && user?.apartment && (
                <div className="ios-meta-row">
                  <Building2 className="h-4 w-4 text-[#C9A961]" /> דירה {user.apartment}
                </div>
              )}
            </div>
          </div>

          {/* Action list — grouped iOS-style cell stack */}
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
