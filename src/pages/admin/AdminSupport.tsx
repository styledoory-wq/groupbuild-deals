import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { supabase } from "@/integrations/supabase/client";
import { invalidateSupportWhatsapp } from "@/hooks/useSupportContact";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";

export default function AdminSupport() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("id,support_whatsapp")
        .limit(1)
        .maybeSingle();
      if (error) toast.error(error.message);
      setRowId(data?.id ?? null);
      setPhone(data?.support_whatsapp ?? "");
      setLoading(false);
    })();
  }, []);

  const preview = normalizeWhatsappUrl(phone);

  const save = async () => {
    const cleaned = phone.trim();
    if (cleaned && !normalizeWhatsappUrl(cleaned)) {
      toast.error("מספר לא תקין. הזן מספר ישראלי (למשל 052-624-7941)");
      return;
    }
    setSaving(true);
    let error = null as null | { message: string };
    if (rowId) {
      const res = await supabase
        .from("system_settings")
        .update({ support_whatsapp: cleaned || null })
        .eq("id", rowId);
      error = res.error;
    } else {
      const res = await supabase
        .from("system_settings")
        .insert({ support_whatsapp: cleaned || null })
        .select("id")
        .maybeSingle();
      error = res.error;
      if (res.data?.id) setRowId(res.data.id);
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidateSupportWhatsapp();
    toast.success("מספר התמיכה עודכן");
  };

  return (
    <MobileShell>
      <AdminPageHeader title="תמיכה" description="ניהול פרטי יצירת קשר לתמיכת משתמשים" />

      <div className="px-5 lg:px-8 py-5 max-w-2xl space-y-6">
        <section className="bg-white border border-[#ECEEF2] rounded-[14px] p-5 space-y-4">
          <div>
            <h2 className="text-[15px] font-extrabold text-[#0F172A]">מספר וואטסאפ לתמיכה</h2>
            <p className="text-[12.5px] text-[#6B7280] mt-1">
              המספר שיוצג בכפתור "צריך עזרה?" ובמסך התמיכה, לדיירים ולספקים.
            </p>
          </div>

          <label className="block">
            <span className="text-[12px] font-bold text-[#374151]">מספר טלפון</span>
            <input
              dir="ltr"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="052-624-7941"
              disabled={loading}
              className="mt-1.5 w-full h-11 rounded-[10px] border border-[#E5E7EB] px-3 text-[14px] font-semibold text-[#0F172A] focus:border-[#0E6B5A] focus:outline-none disabled:opacity-50"
            />
            <span className="text-[11px] text-[#6B7280] mt-1 block">
              ניתן להזין בכל פורמט: 0526247941 / 052-624-7941 / +972 52 624 7941
            </span>
          </label>

          {preview && (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] px-3 py-2 text-[12px] text-[#166534]">
              קישור סופי: <span dir="ltr" className="font-bold">{preview}</span>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="h-10 px-5 rounded-[10px] bg-[#0E6B5A] text-white text-[13px] font-extrabold disabled:opacity-50"
            >
              {saving ? "שומר..." : "שמור"}
            </button>
          </div>
        </section>
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
