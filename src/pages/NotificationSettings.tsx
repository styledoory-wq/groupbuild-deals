import { useEffect, useState } from "react";
import { Bell, Loader2, Save, Mail } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Settings = {
  email_notifications_enabled: boolean;
  approval_email_enabled: boolean;
  new_lead_email_enabled: boolean;
  system_email_enabled: boolean;
};

const DEFAULTS: Settings = {
  email_notifications_enabled: true,
  approval_email_enabled: true,
  new_lead_email_enabled: true,
  system_email_enabled: true,
};

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
        setSettings({
          email_notifications_enabled: row.email_notifications_enabled,
          approval_email_enabled: row.approval_email_enabled,
          new_lead_email_enabled: row.new_lead_email_enabled,
          system_email_enabled: row.system_email_enabled,
        });
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

  const masterOn = settings.email_notifications_enabled;

  return (
    <MobileShell>
      <PageHeader title="הגדרות התראות" subtitle="ניהול מיילים והודעות מהמערכת" />

      <div className="px-5 -mt-4 relative z-10 space-y-4 pb-24">
        <div className="gb-card p-3 bg-gold/10 border-gold/30">
          <p className="text-[11px] text-primary leading-relaxed">
            <Mail className="inline h-3.5 w-3.5 ml-1" />
            שליחת המיילים תופעל ברגע שיוגדר דומיין שולח. עד אז ההעדפות נשמרות ואינן נשלחות בפועל.
          </p>
        </div>

        <div className="gb-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gold" />
            <h3 className="font-bold text-sm">קבלת מיילים מהמערכת</h3>
          </div>

          <Row
            label="קבלת מיילים (ראשי)"
            desc="כיבוי כאן יבטל את כל המיילים מהמערכת."
            checked={masterOn}
            onChange={() => toggle("email_notifications_enabled")}
          />
          <Row
            label="התראות על אישור חשבון"
            desc="הודעה כאשר האדמין מאשר את החשבון שלך."
            checked={settings.approval_email_enabled}
            onChange={() => toggle("approval_email_enabled")}
            disabled={!masterOn}
          />
          <Row
            label="לידים חדשים"
            desc="לספקים — מייל כאשר דייר מתעניין בהצעה."
            checked={settings.new_lead_email_enabled}
            onChange={() => toggle("new_lead_email_enabled")}
            disabled={!masterOn}
          />
          <Row
            label="עדכוני מערכת"
            desc="הודעות חשובות על שינויים ופעילות בחשבון."
            checked={settings.system_email_enabled}
            onChange={() => toggle("system_email_enabled")}
            disabled={!masterOn}
          />
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
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}
