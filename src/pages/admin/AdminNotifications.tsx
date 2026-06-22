import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { LoadingState } from "@/components/ds";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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

export default function AdminNotifications() {
  const [settings, setSettings] = useState<AdminSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const sendTest = async () => {
    const to = testEmail.trim();
    if (!to) { toast.error("נא להזין אימייל לבדיקה"); return; }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type: "test", to },
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "שליחה נכשלה");
      toast.success("מייל הבדיקה נשלח");
    } catch (err) {
      toast.error(`שליחה נכשלה: ${err instanceof Error ? err.message : "שגיאה"}`, { duration: 10000 });
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("admin_settings").select("*").limit(1).maybeSingle();
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
    if (error) toast.error(`שמירה נכשלה: ${error.message}`);
    else toast.success("ההגדרות נשמרו");
  };

  if (loading) return <MobileShell><LoadingState /></MobileShell>;
  if (!settings) return <MobileShell><div className="p-8 text-center">לא נמצאו הגדרות</div></MobileShell>;

  return (
    <MobileShell>
      <AdminPageHeader title="התראות מערכת" description="כתובת אימייל לאדמין וסוגי התראות" />

      <div className="px-5 lg:px-8 py-5 max-w-3xl space-y-4">
        <div className="bg-white border border-[#ECEEF2] rounded-[14px] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#0E6B5A]" />
            <h3 className="font-extrabold text-[14px]">אימייל לקבלת התראות</h3>
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
            <p className="text-[12px] text-[#6B7280] mt-1.5">לכתובת זו יישלחו התראות על אירועים חדשים במערכת.</p>
          </div>
        </div>

        <div className="bg-white border border-[#ECEEF2] rounded-[14px] p-5 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-[#0E6B5A]" />
            <h3 className="font-extrabold text-[14px]">סוגי התראות</h3>
          </div>
          {[
            { key: "notify_on_new_resident" as const, label: "דייר חדש נרשם", desc: "התראה בכל הרשמת דייר" },
            { key: "notify_on_new_supplier" as const, label: "ספק חדש נרשם", desc: "התראה בכל הרשמת ספק" },
            { key: "notify_on_deal_interest" as const, label: "מתעניין חדש בעסקה", desc: "התראה כשדייר מסמן עניין בעסקה" },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center gap-3 p-2 rounded-[10px] hover:bg-[#FAFBFC] cursor-pointer">
              <input
                type="checkbox"
                checked={settings[opt.key]}
                onChange={(e) => setSettings({ ...settings, [opt.key]: e.target.checked })}
                className="h-4 w-4 accent-[#0E6B5A]"
              />
              <div className="flex-1">
                <div className="text-[13px] font-extrabold">{opt.label}</div>
                <div className="text-[12px] text-[#6B7280]">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="w-full h-11 rounded-[12px] bg-[#0E6B5A] hover:bg-[#0E6B5A]/90 text-white font-extrabold flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "שומר…" : "שמירת הגדרות"}
        </Button>

        <div className="bg-white border border-[#ECEEF2] rounded-[14px] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#0E6B5A]" />
            <h3 className="font-extrabold text-[14px]">בדיקת שליחת מיילים</h3>
          </div>
          <div>
            <Label className="text-xs">אימייל לבדיקה</Label>
            <Input type="email" dir="ltr" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.co.il" />
          </div>
          <Button onClick={sendTest} disabled={sendingTest} variant="outline" className="w-full h-11 rounded-[12px]">
            <Mail className="h-4 w-4 ml-2" />
            {sendingTest ? "שולח…" : "שליחת מייל בדיקה"}
          </Button>
        </div>
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
