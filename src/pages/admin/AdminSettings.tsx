import { useNavigate } from "react-router-dom";
import { Bell, LayoutGrid, MapPin, Users, MessageSquare, UserCheck, ShieldCheck, Building2, BarChart3, ArrowLeft, LifeBuoy, FlaskConical, Send, type LucideIcon } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Switch } from "@/components/ui/switch";
import { FEATURE_FLAG_META, setFlag, useFeatureFlag } from "@/lib/featureFlags";

type Item = { to: string; icon: LucideIcon; title: string; desc: string };

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "תוכן ומיון",
    items: [
      { to: "/admin/catalog", icon: LayoutGrid, title: "עץ קטגוריות", desc: "ניהול מלא: תחומים, קטגוריות ושירותים" },
      { to: "/admin/categories", icon: LayoutGrid, title: "קטגוריות (ישן)", desc: "ניהול קטגוריות שטוח" },
      { to: "/admin/project-stages", icon: Building2, title: "תחומי פרויקט", desc: "קטגוריות בכל שלב" },
      { to: "/admin/regions", icon: MapPin, title: "אזורי שירות", desc: "ערים, אזורים ומועצות" },
    ],
  },
  {
    title: "משתמשים ובקשות",
    items: [
      { to: "/admin/users", icon: Users, title: "משתמשים", desc: "ניהול הרשאות וחשבונות" },
      { to: "/admin/residents", icon: Users, title: "דיירים", desc: "כל הדיירים הרשומים" },
      { to: "/admin/committee-requests", icon: UserCheck, title: "בקשות ועד בית", desc: "אישור הרשאות ועד" },
      { to: "/admin/leads", icon: Bell, title: "לידים", desc: "פניות והרשמות" },
      { to: "/admin/complaints", icon: MessageSquare, title: "תלונות", desc: "דיווחי משתמשים" },
    ],
  },
  {
    title: "ספקים — תצורה",
    items: [
      { to: "/admin/supplier-trust", icon: ShieldCheck, title: "אמון ספקים", desc: "דירוגי אמון ואישורים" },
    ],
  },
  {
    title: "מערכת",
    items: [
      { to: "/admin/notifications", icon: Bell, title: "התראות מערכת", desc: "מיילים ויעדי התראה" },
      { to: "/admin/support", icon: LifeBuoy, title: "תמיכה", desc: "מספר וואטסאפ ופרטי יצירת קשר" },
      { to: "/admin/stats", icon: BarChart3, title: "סטטיסטיקות", desc: "מבט-על מפורט" },
    ],
  },
];

export default function AdminSettings() {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <AdminPageHeader title="הגדרות" description="ניהול תצורה, משתמשים ותוכן המערכת" />

      <div className="px-5 lg:px-8 py-5 max-w-6xl space-y-6">
        {SECTIONS.map((sec) => (
          <section key={sec.title}>
            <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B7280] mb-2 px-1">
              {sec.title}
            </h2>
            <div className="bg-white border border-[#ECEEF2] rounded-[14px] divide-y divide-[#F1F3F7]">
              {sec.items.map((item) => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-right hover:bg-[#FAFBFC] transition-colors first:rounded-t-[14px] last:rounded-b-[14px]"
                >
                  <span className="h-9 w-9 rounded-[10px] bg-[#F4F6FA] flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-[#0E6B5A]" strokeWidth={2.2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-[13.5px] text-[#0F172A] truncate">{item.title}</div>
                    <div className="text-[12px] text-[#6B7280] mt-0.5 truncate">{item.desc}</div>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-[#9CA3AF] shrink-0" strokeWidth={2} />
                </button>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B7280] mb-2 px-1 flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            פיצ׳רים בטא
          </h2>
          <div className="bg-white border border-[#ECEEF2] rounded-[14px] divide-y divide-[#F1F3F7]">
            {FEATURE_FLAG_META.map((f) => (
              <FeatureFlagRow key={f.key} flagKey={f.key} label={f.label} description={f.description} />
            ))}
          </div>
          <p className="text-[11px] text-[#8E8E93] mt-2 px-1">
            הגדרות אלה נשמרות בדפדפן הנוכחי ומאפשרות להסתיר או להפעיל פיצ׳רים ניסיוניים.
          </p>
        </section>
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function FeatureFlagRow({ flagKey, label, description }: { flagKey: Parameters<typeof setFlag>[0]; label: string; description: string }) {
  const enabled = useFeatureFlag(flagKey);
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3.5 text-right first:rounded-t-[14px] last:rounded-b-[14px]">
      <span className="h-9 w-9 rounded-[10px] bg-[#F4F6FA] flex items-center justify-center shrink-0">
        <FlaskConical className="h-4 w-4 text-[#0E6B5A]" strokeWidth={2.2} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[13.5px] text-[#0F172A] truncate">{label}</div>
        <div className="text-[12px] text-[#6B7280] mt-0.5">{description}</div>
      </div>
      <Switch checked={enabled} onCheckedChange={(v) => setFlag(flagKey, v)} />
    </div>
  );
}
