import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Bell, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface AdminSettingsRow {
  id: string;
  notification_email: string | null;
  notify_on_new_resident: boolean;
  notify_on_new_supplier: boolean;
  notify_on_deal_interest: boolean;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<AdminSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) toast.error(`טעינה נכשלה: ${error.message}`);
      setSettings(data as AdminSettingsRow | null);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("admin_settings")
      .update({
        notification_email: settings.notification_email?.trim() || null,
        notify_on_new_resident: settings.notify_on_new_resident,
        notify_on_new_supplier: settings.notify_on_new_supplier,
        notify_on_deal_interest: settings.notify_on_deal_interest,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast.error(`שמירה נכשלה: ${error.message}`);
    } else {
      toast.success("ההגדרות נשמרו");
    }
  };

  if (loading) return <MobileShell><div className="p-8 text-center">טוען…</div></MobileShell>;
  if (!settings) return <MobileShell><div className="p-8 text-center">לא נמצאו הגדרות</div></MobileShell>;

  return (
    <MobileShell>
      <PageHeader title="הגדרות מערכת" subtitle="התראות ופרטי קשר לאדמין" />

      <div className="px-5 -mt-4 relative z-10 space-y-4 pb-24">
        <div className="gb-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gold" />
            <h3 className="font-bold text-sm">אימייל לקבלת התראות</h3>
          </div>
          <div>
            <Label className="text-xs">כתובת אימייל</Label>
            <Input
              type="email"
              dir="ltr"
              value={settings.notification_email ?? ""}
              onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
              placeholder="admin@example.co.il"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              לכתובת זו יישלחו התראות על אירועים חדשים במערכת.
            </p>
          </div>
        </div>

        <div className="gb-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gold" />
            <h3 className="font-bold text-sm">סוגי התראות</h3>
          </div>

          {[
            { key: "notify_on_new_resident" as const, label: "דייר חדש נרשם", desc: "התראה בכל הרשמת דייר" },
            { key: "notify_on_new_supplier" as const, label: "ספק חדש נרשם", desc: "התראה בכל הרשמת ספק" },
            { key: "notify_on_deal_interest" as const, label: "מתעניין חדש בעסקה", desc: "התראה כשדייר מסמן עניין בעסקה" },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 cursor-pointer">
              <input
                type="checkbox"
                checked={settings[opt.key]}
                onChange={(e) => setSettings({ ...settings, [opt.key]: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              <div className="flex-1">
                <div className="text-sm font-bold">{opt.label}</div>
                <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="gb-card p-3 bg-amber-50 border-amber-200/50">
          <p className="text-[11px] text-amber-900">
            💡 שליחת מיילים בפועל דורשת הגדרת דומיין מייל. כרגע ההתראות נרשמות בלוגים. ניתן להגדיר דומיין מאוחר יותר ללא שינוי קוד.
          </p>
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

      <BottomNav role="admin" />
    </MobileShell>
  );
}
