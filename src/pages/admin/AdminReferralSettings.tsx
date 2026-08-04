import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function fromLocalInput(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function AdminReferralSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [rewardAmount, setRewardAmount] = useState("100");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("*")
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const row = data as Record<string, unknown>;
          setEnabled(row.supplier_referral_program_enabled !== false);
          setRewardAmount(String(row.supplier_referral_reward_amount ?? 100));
          setStartsAt(toLocalInput(row.supplier_referral_program_starts_at as string | null));
          setEndsAt(toLocalInput(row.supplier_referral_program_ends_at as string | null));
        }
      } catch (e) {
        console.error("[AdminReferralSettings] load", e);
        toast.error("טעינת ההגדרות נכשלה");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    const amount = Number(rewardAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("סכום התגמול חייב להיות מספר לא־שלילי");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("admin_update_referral_program_settings" as never, {
        _enabled: enabled,
        _reward_amount: amount,
        _starts_at: fromLocalInput(startsAt),
        _ends_at: fromLocalInput(endsAt),
      } as never);
      if (error) throw error;
      const result = data as { ok?: boolean; error?: string } | null;
      if (result && result.ok === false) throw new Error(result.error ?? "save_failed");
      toast.success("ההגדרות נשמרו");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileShell>
      <div className="bg-[#F7F8FA] min-h-screen" dir="rtl">
        <AdminPageHeader
          title="הגדרות קרדיט הפניות"
          description="הפעלה, סכום תגמול וחלון זמן של תוכנית ההפניות"
        />

        <div className="px-5 lg:px-8 pb-24 max-w-xl">
          {loading ? (
            <LoadingState fullHeight={false} />
          ) : (
            <div className="bg-white border border-[#EEF0F4] rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-right">
                  <div className="text-[14px] font-semibold text-[#0F172A]">תוכנית פעילה</div>
                  <div className="text-[12px] text-[#8B94A3] mt-0.5">
                    כבוי — לא יוצגו הזמנות ולא יינתן קרדיט חדש
                  </div>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward" className="text-[13px]">
                  סכום תגמול (₪)
                </Label>
                <Input
                  id="reward"
                  type="number"
                  min={0}
                  step={1}
                  dir="ltr"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="starts" className="text-[13px]">
                  תחילת תוכנית (אופציונלי)
                </Label>
                <Input
                  id="starts"
                  type="datetime-local"
                  dir="ltr"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ends" className="text-[13px]">
                  סיום תוכנית (אופציונלי)
                </Label>
                <Input
                  id="ends"
                  type="datetime-local"
                  dir="ltr"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="h-11"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-11 rounded-xl bg-[#0E6B5A] hover:bg-[#0c5a4c] text-white font-semibold"
              >
                <Save className="h-4 w-4 ml-2" />
                {saving ? "שומר..." : "שמירת הגדרות"}
              </Button>
            </div>
          )}
        </div>
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}
