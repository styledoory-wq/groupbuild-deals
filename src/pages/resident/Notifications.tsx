import { useEffect } from "react";
import { Bell, Tag, Wallet, Info } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { cn } from "@/lib/utils";

const iconFor = { deal: Tag, deposit: Wallet, system: Info } as const;

export default function Notifications() {
  const { notifications, markNotificationsRead } = useApp();

  useEffect(() => {
    const t = setTimeout(markNotificationsRead, 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <MobileShell>
      <PageHeader title="התראות" subtitle="עדכונים חמים על העסקאות שלך" back={false} />
      <div className="px-5 -mt-4 relative z-10 space-y-2">
        {notifications.length === 0 && (
          <div className="gb-card p-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            אין התראות חדשות
          </div>
        )}
        {notifications.map((n) => {
          const Icon = iconFor[n.type];
          return (
            <div
              key={n.id}
              className={cn(
                "gb-card p-4 flex items-start gap-3",
                n.unread && "border-gold/40 bg-gradient-to-l from-gold/5 to-card"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0",
                n.unread ? "bg-gradient-gold text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-sm text-foreground">{n.title}</h3>
                  {n.unread && <span className="h-2 w-2 rounded-full bg-gold" />}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleDateString("he-IL")}</p>
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav role="resident" />
    </MobileShell>
  );
}
