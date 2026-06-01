import { useEffect, useState } from "react";
import { Bell, Loader2, Save, Mail, Smartphone } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Settings = {
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  // Per-event email
  approval_email_enabled: boolean;
  new_lead_email_enabled: boolean;
  system_email_enabled: boolean;
  deposit_email_enabled: boolean;
  new_offer_email_enabled: boolean;
  voucher_email_enabled: boolean;
  deal_status_email_enabled: boolean;
  welcome_email_enabled: boolean;
  // Per-event push
  approval_push_enabled: boolean;
  new_lead_push_enabled: boolean;
  system_push_enabled: boolean;
  deposit_push_enabled: boolean;
  new_offer_push_enabled: boolean;
  voucher_push_enabled: boolean;
  deal_status_push_enabled: boolean;
};

const DEFAULTS: Settings = {
  email_notifications_enabled: true,
  push_notifications_enabled: true,
  approval_email_enabled: true,
  new_lead_email_enabled: true,
  system_email_enabled: true,
  deposit_email_enabled: true,
  new_offer_email_enabled: true,
  voucher_email_enabled: true,
  deal_status_email_enabled: true,
  welcome_email_enabled: true,
  approval_push_enabled: true,
  new_lead_push_enabled: true,
  system_push_enabled: true,
  deposit_push_enabled: true,
  new_offer_push_enabled: true,
  voucher_push_enabled: true,
  deal_status_push_enabled: true,
};

const EVENTS: Array<{
  label: string;
  desc: string;
  emailKey: keyof Settings;
  pushKey: keyof Settings;
}> = [
  { label: "אישור חשבון", desc: "כשהאדמין מאשר את החשבון שלך.", emailKey: "approval_email_enabled", pushKey: "approval_push_enabled" },
  { label: "אישור פיקדון", desc: "כשתשלום או פיקדון מתקבל.", emailKey: "deposit_email_enabled", pushKey: "deposit_push_enabled" },
  { label: "ליד חדש (ספקים)", desc: "כשדייר מתעניין בהצעה שלך.", emailKey: "new_lead_email_enabled", pushKey: "new_lead_push_enabled" },
  { label: "הצעה חדשה", desc: "כשספק מפרסם הצעה רלוונטית.", emailKey: "new_offer_email_enabled", pushKey: "new_offer_push_enabled" },
  { label: "שובר חדש", desc: "כששובר חדש מופק לחשבונך.", emailKey: "voucher_email_enabled", pushKey: "voucher_push_enabled" },
  { label: "עדכון סטטוס עסקה", desc: "כשסטטוס עסקה משתנה.", emailKey: "deal_status_email_enabled", pushKey: "deal_status_push_enabled" },
  { label: "עדכוני מערכת", desc: "הודעות חשובות ופעילות בחשבון.", emailKey: "system_email_enabled", pushKey: "system_push_enabled" },
];

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) {
        navigate("/auth");
        return;
      }
      setUserId(uid);
      const { data: row } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (row) {
        setSettings((prev) => ({ ...prev, ...(row as Partial<Settings>) }));
      }
      setLoading(false);
    })();
  }, [navigate]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_settings")
      .upsert({ user_id: userId, ...settings }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(`שמירה נכשלה: ${error.message}`);
    else toast.success("ההגדרות נשמרו");
  };

  const toggle = (key: keyof Settings) =>
    setSettings((s) => ({ ...s, [key]: !s[key] }));

  if (loading) {
    return (
      <MobileShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </MobileShell>
    );
  }

  const emailOn = settings.email_notifications_enabled;
  const pushOn = settings.push_notifications_enabled;

  return (
    <MobileShell>
      <PageHeader title="הגדרות התראות" subtitle="ניהול מייל והתראות פוש" />

      <div className="px-5 -mt-4 relative z-10 space-y-4 pb-24">
        <div className="gb-card p-3 bg-gold/10 border-gold/30">
          <p className="text-fs-xs text-primary leading-relaxed">
            <Mail className="inline h-3.5 w-3.5 ml-1" />
            מיילים נשלחים דרך Resend. התראות פוש פעילות באפליקציה הנייטיב כשהאישורים מוגדרים.
          </p>
        </div>

        <div className="gb-card p-4 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-gold" />ערוצים ראשיים
          </h3>
          <Row
            label="קבלת מיילים"
            desc="כיבוי כאן יבטל את כל המיילים מהמערכת."
            checked={emailOn}
            onChange={() => toggle("email_notifications_enabled")}
          />
          <Row
            label="התראות פוש"
            desc="התראות בנייד (iOS/Android)."
            checked={pushOn}
            onChange={() => toggle("push_notifications_enabled")}
          />
        </div>

        <div className="gb-card p-4 space-y-2">
          <h3 className="font-bold text-sm mb-2">סוגי אירועים</h3>
          <div className="flex items-center gap-1 text-fs-xs text-muted-foreground pb-2 border-b">
            <div className="flex-1">אירוע</div>
            <div className="w-14 text-center flex items-center justify-center gap-1"><Mail className="h-3 w-3" />מייל</div>
            <div className="w-14 text-center flex items-center justify-center gap-1"><Smartphone className="h-3 w-3" />פוש</div>
          </div>
          {EVENTS.map((e) => (
            <div key={e.label} className="flex items-center gap-1 py-1.5">
              <div className="flex-1">
                <div className="text-sm font-bold">{e.label}</div>
                <div className="text-fs-xs text-muted-foreground">{e.desc}</div>
              </div>
              <div className="w-14 flex justify-center">
                <Switch
                  checked={!!settings[e.emailKey]}
                  onCheckedChange={() => toggle(e.emailKey)}
                  disabled={!emailOn}
                />
              </div>
              <div className="w-14 flex justify-center">
                <Switch
                  checked={!!settings[e.pushKey]}
                  onCheckedChange={() => toggle(e.pushKey)}
                  disabled={!pushOn}
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "שומר…" : "שמירת הגדרות"}
        </Button>
      </div>
    </MobileShell>
  );
}

function Row({
  label, desc, checked, onChange, disabled,
}: { label: string; desc: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className={"flex items-start gap-3 p-2 rounded-xl " + (disabled ? "opacity-50" : "hover:bg-muted/40 cursor-pointer")}>
      <div className="flex-1">
        <div className="text-sm font-bold">{label}</div>
        <div className="text-fs-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}
