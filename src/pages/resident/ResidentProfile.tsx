import { useNavigate } from "react-router-dom";
import { LogOut, Building2, Phone, Mail, History, Pencil } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { formatILS, getActiveTier, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResidentProfile() {
  const navigate = useNavigate();
  const { user, logout, deposits, deals, projects } = useApp();
  const myDeposits = deposits.filter((d) => d.userId === user?.id);
  const project = projects.find((p) => p.id === user?.projectId);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("supabase signOut failed", e);
    }
    logout();
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
          <div className="text-xs text-muted-foreground">דייר · {project?.name}</div>

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
            {project && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 text-gold" /> דירה {user?.apartment}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="px-5 mb-5">
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-gold" />
          היסטוריית עסקאות
        </h2>
        <div className="space-y-2">
          {myDeposits.length === 0 && (
            <div className="gb-card p-6 text-center text-sm text-muted-foreground">
              עדיין לא הצטרפת לעסקאות.
            </div>
          )}
          {myDeposits.map((dep) => {
            const deal = deals.find((d) => d.id === dep.dealId);
            if (!deal) return null;
            const tier = getActiveTier(deal);
            return (
              <div key={dep.id} className="gb-card p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center text-xl shrink-0">🛒</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{deal.title}</div>
                  <div className="text-[11px] text-muted-foreground">פיקדון {formatILS(dep.amount)} · {new Date(dep.createdAt).toLocaleDateString("he-IL")}</div>
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-success px-2 py-1 rounded-full bg-success/10">שולם</div>
                  <div className="text-[11px] text-primary font-bold mt-1">{formatILS(tier.price)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="px-5 space-y-2">
        <Button onClick={() => navigate("/resident/profile/edit")} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground">
          <Pencil className="h-4 w-4 ml-2" /> עריכת פרופיל
        </Button>
        <Button onClick={handleLogout} variant="outline" className="w-full h-12 rounded-2xl border-border">
          <LogOut className="h-4 w-4 ml-2" /> התנתקות
        </Button>
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
