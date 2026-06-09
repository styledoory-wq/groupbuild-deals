import { useEffect } from "react";
import { Bell, Tag, Wallet, Info } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScreenHeader, EmptyState } from "@/components/ds";
import { SHADOWS, MOTION } from "@/lib/designSystem";
import { useApp } from "@/store/AppStore";

const iconFor = { deal: Tag, deposit: Wallet, system: Info } as const;

export default function Notifications() {
  const { notifications, refreshNotifications, markNotificationsRead } = useApp();

  useEffect(() => {
    void refreshNotifications();
    const t = setTimeout(() => { void markNotificationsRead(); }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F0F2F5" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        <ScreenHeader title="התראות" subtitle="עדכונים חמים על העסקאות שלך" />

        <div className="px-5 mt-2 space-y-2.5">
          {notifications.length === 0 && (
            <EmptyState
              icon={<Bell className="h-8 w-8 text-[#9CA3AF]" />}
              title="אין התראות חדשות"
              description="כאן יופיעו עדכונים על הצעות, פיקדונות ומידע חשוב."
            />
          )}
          {notifications.map((n) => {
            const Icon = iconFor[n.type] ?? Info;
            const unread = n.unread;
            return (
              <div
                key={n.id}
                className="rounded-[20px] p-4 flex items-start gap-3 animate-fade-in"
                style={{
                  background: unread
                    ? "linear-gradient(180deg,#FFFFFF 0%, #FFFBEB 100%)"
                    : "#FFFFFF",
                  boxShadow: unread ? SHADOWS.card : SHADOWS.cardDim,
                  transition: `box-shadow ${MOTION.base} ${MOTION.ease}`,
                }}
              >
                <div
                  className="h-10 w-10 rounded-[14px] flex items-center justify-center shrink-0"
                  style={{
                    background: unread ? "#D4AF37" : "#F4F6FA",
                    color: unread ? "#FFFFFF" : "#6B7280",
                    boxShadow: unread ? SHADOWS.pill : "none",
                  }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5 gap-2">
                    <h3 className="font-bold text-[14px] text-[#0A1F3D] tracking-tight truncate">{n.title}</h3>
                    {unread && <span className="h-2 w-2 rounded-full bg-[#D4AF37] shrink-0" />}
                  </div>
                  <p className="text-[12.5px] text-[#6B7280] leading-relaxed">{n.body}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-2 font-medium">
                    {new Date(n.createdAt).toLocaleDateString("he-IL")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav role="resident" />
    </div>
  );
}
