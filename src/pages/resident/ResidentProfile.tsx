import { useNavigate } from "react-router-dom";
import { LogOut, Building2, Phone, Mail, Pencil, FileText, Wallet } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
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

  return (
    <MobileShell>
      <PageHeader title="הפרופיל שלי" subtitle="הפרטים והעסקאות שלך" back={false} />

      <div className="px-5 -mt-6 relative z-10 mb-5">
        <div className="gb-card p-5 text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-gold mx-auto flex items-center justify-center text-3xl font-extrabold text-primary shadow-gold">
            {user?.name?.charAt(0)}
          </div>
          <h2 className="font-bold text-lg mt-3">{user?.name}</h2>
          <div className="text-xs text-muted-foreground">דייר{project ? ` · ${project.name}` : ""}</div>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
            {user?.phone && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-gold" /> {user.phone}
              </div>
            )}
            {user?.email && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-gold" /> {user.email}
              </div>
            )}
            {project && user?.apartment && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 text-gold" /> דירה {user.apartment}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 space-y-2">
        <Button onClick={() => navigate("/resident/profile/edit")} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
          <Pencil className="h-4 w-4 ml-2" /> עריכת פרופיל
        </Button>
        <Button onClick={() => navigate("/resident/deposits")} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
          <Wallet className="h-4 w-4 ml-2" /> הפיקדונות שלי
        </Button>
        <Button onClick={() => navigate("/resident/documents")} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
          <FileText className="h-4 w-4 ml-2" /> המסמכים שלי
        </Button>
        <Button onClick={handleLogout} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
          <LogOut className="h-4 w-4 ml-2" /> התנתקות
        </Button>
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
