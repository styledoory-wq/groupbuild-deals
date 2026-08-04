import { useNavigate } from "react-router-dom";
import { Bell, LayoutGrid, MapPin, Users, MessageSquare, UserCheck, ShieldCheck, Building2, BarChart3, ArrowLeft, LifeBuoy, FlaskConical, Send, Inbox, Gift, Coins, type LucideIcon } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Switch } from "@/components/ui/switch";
import { FEATURE_FLAG_META, setFlag, useFeatureFlag } from "@/lib/featureFlags";

type Item = { to: string; icon: LucideIcon; title: string; desc: string };

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "תוכן",
    items: [
      { to: "/admin/catalog", icon: LayoutGrid, title: "קטגוריות", desc: "עץ תחומים, קטגוריות ושירותים" },
      { to: "/admin/project-stages", icon: Building2, title: "תחומי פרויקט", desc: "קטגוריות בכל שלב פרויקט" },
      { to: "/admin/regions", icon: MapPin, title: "אזורי שירות", desc: "ערים, אזורים ומועצות" },
    ],
  },
  {
    title: "משתמשים",
    items: [
      { to: "/admin/users", icon: Users, title: "משתמשים", desc: "הרשאות וחשבונות" },
      { to: "/admin/residents", icon: Users, title: "דיירים", desc: "כל הדיירים הרשומים" },
      { to: "/admin/leads", icon: Inbox, title: "לידים", desc: "פניות והרשמות" },
      { to: "/admin/committee-requests", icon: UserCheck, title: "בקשות ועד בית", desc: "אישור הרשאות ועד" },
      { to: "/admin/complaints", icon: MessageSquare, title: "תלונות", desc: "דיווחי משתמשים" },
    ],
  },
  {
    title: "מערכת",
    items: [
      { to: "/admin/notifications", icon: Bell, title: "התראות", desc: "מיילים ויעדי התראה" },
      { to: "/admin/support", icon: LifeBuoy, title: "תמיכה", desc: "מספר וואטסאפ ופרטי קשר" },
      { to: "/admin/message-templates", icon: Send, title: "הודעות מוכנות", desc: "תבניות לספקים, דיירים וועדים" },
      { to: "/admin/stats", icon: BarChart3, title: "סטטיסטיקות", desc: "אנליטיקה מלאה ומחזור" },
      { to: "/admin/supplier-trust", icon: ShieldCheck, title: "אמון ספקים", desc: "דירוגי אמון ואישורים" },
      { to: "/admin/referrals", icon: Gift, title: "הפניות ספקים", desc: "מעקב הזמנות ותגמולי קרדיט" },
      { to: "/admin/referral-settings", icon: Coins, title: "הגדרות קרדיט הפניות", desc: "הפעלה, סכום תגמול וחלון זמן" },
    ],
  },
];

export default function AdminSettings() {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div className="bg-[#F7F8FA] min-h-screen">
        <AdminPageHeader title="הגדרות" description="ניהול תצורה, משתמשים ותוכן המערכת" />

        <div dir="rtl" className="px-5 lg:px-8 pt-2 pb-24 max-w-6xl space-y-8">
          {SECTIONS.map((sec) => (
            <section key={sec.title}>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8B94A3] mb-3 px-1">
                {sec.title}
              </h2>
              <div className="bg-white border border-[#EEF0F4] rounded-[16px] divide-y divide-[#F3F5F8] overflow-hidden">
                {sec.items.map((item) => (
                  <button
                    key={item.to}
                    onClick={() => navigate(item.to)}
                    className="w-full flex items-center gap-3.5 px-5 py-4 text-right hover:bg-[#FAFBFC] transition-all duration-200 ease-out group"
                  >
                    <span className="h-9 w-9 rounded-[10px] bg-[#F4F6FA] flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-[#4B5563] group-hover:text-[#0E6B5A] transition-colors" strokeWidth={1.75} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] text-[#0F172A] truncate">{item.title}</div>
                      <div className="text-[12px] text-[#8B94A3] mt-0.5 truncate">{item.desc}</div>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-[#C4CAD3] group-hover:text-[#0E6B5A] group-hover:-translate-x-0.5 transition-all duration-200 shrink-0" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8B94A3] mb-3 px-1 flex items-center gap-1.5">
              <FlaskConical className="h-3 w-3" strokeWidth={1.75} />
              פיצ׳רים בטא
            </h2>
            <div className="bg-white border border-[#EEF0F4] rounded-[16px] divide-y divide-[#F3F5F8] overflow-hidden">
              {FEATURE_FLAG_META.map((f) => (
                <FeatureFlagRow key={f.key} flagKey={f.key} label={f.label} description={f.description} />
              ))}
            </div>
            <p className="text-[11px] text-[#8B94A3] mt-2 px-1">
              הגדרות אלה נשמרות בדפדפן הנוכחי.
            </p>
          </section>
        </div>
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function FeatureFlagRow({ flagKey, label, description }: { flagKey: Parameters<typeof setFlag>[0]; label: string; description: string }) {
  const enabled = useFeatureFlag(flagKey);
  return (
    <div className="w-full flex items-center gap-3.5 px-5 py-4 text-right">
      <span className="h-9 w-9 rounded-[10px] bg-[#F4F6FA] flex items-center justify-center shrink-0">
        <FlaskConical className="h-4 w-4 text-[#4B5563]" strokeWidth={1.75} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px] text-[#0F172A] truncate">{label}</div>
        <div className="text-[12px] text-[#8B94A3] mt-0.5">{description}</div>
      </div>
      <Switch checked={enabled} onCheckedChange={(v) => setFlag(flagKey, v)} />
    </div>
  );
}
