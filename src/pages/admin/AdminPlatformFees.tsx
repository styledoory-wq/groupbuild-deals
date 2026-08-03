import { useEffect, useState } from "react";
import { Loader2, Plus, Save, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatILS } from "@/store/AppStore";
import { formatFeeBandLabel, type PlatformFeeRule } from "@/lib/platformFees";
import { CategoryParticipationFees } from "@/components/admin/CategoryParticipationFees";

import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Draft = {
  id?: string;
  name: string;
  min_deal_price: string;
  max_deal_price: string;
  fee_amount: string;
  is_active: boolean;
  sort_order: string;
  priority: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  min_deal_price: "0",
  max_deal_price: "",
  fee_amount: "",
  is_active: true,
  sort_order: "100",
  priority: "100",
});

export default function AdminPlatformFees() {
  const askConfirm = useConfirm();
  const [rules, setRules] = useState<PlatformFeeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_fees" as never)
        .select(
          "id,name,fee_type,min_deal_price,max_deal_price,fee_amount,currency,is_active,category_id,offer_type,listing_type,priority,sort_order,conditions",
        )
        .eq("fee_type" as never, "participation" as never)
        .order("sort_order" as never, { ascending: true });
      if (error) throw error;
      setRules(
        ((data ?? []) as unknown as PlatformFeeRule[]).map((r) => ({
          ...r,
          min_deal_price: Number(r.min_deal_price),
          max_deal_price: r.max_deal_price == null ? null : Number(r.max_deal_price),
          fee_amount: Number(r.fee_amount),
        })),
      );
    } catch (e) {
      console.error("[AdminPlatformFees]", e);
      toast.error(e instanceof Error ? e.message : "טעינת מדרגות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleActive = async (rule: PlatformFeeRule) => {
    setBusyId(rule.id);
    try {
      const { error } = await supabase
        .from("platform_fees" as never)
        .update({ is_active: !rule.is_active } as never)
        .eq("id" as never, rule.id as never);
      if (error) throw error;
      toast.success(rule.is_active ? "המדרגה כובתה" : "המדרגה הופעלה");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "עדכון נכשל");
    } finally {
      setBusyId(null);
    }
  };

  const saveRule = async (rule: PlatformFeeRule, patch: Partial<Draft>) => {
    setBusyId(rule.id);
    try {
      const min = Number(patch.min_deal_price ?? rule.min_deal_price);
      const maxRaw = patch.max_deal_price ?? (rule.max_deal_price == null ? "" : String(rule.max_deal_price));
      const max = maxRaw.trim() === "" ? null : Number(maxRaw);
      const fee = Number(patch.fee_amount ?? rule.fee_amount);
      if (!Number.isFinite(min) || min < 0) throw new Error("מחיר מינימום לא תקין");
      if (max != null && (!Number.isFinite(max) || max < min)) throw new Error("מחיר מקסימום לא תקין");
      if (!Number.isFinite(fee) || fee < 0) throw new Error("סכום דמי השתתפות לא תקין");

      const { error } = await supabase
        .from("platform_fees" as never)
        .update({
          name: (patch.name ?? rule.name ?? "").trim() || null,
          min_deal_price: min,
          max_deal_price: max,
          fee_amount: fee,
          priority: Number(patch.priority ?? rule.priority ?? 100),
          sort_order: Number(patch.sort_order ?? rule.sort_order ?? 0),
        } as never)
        .eq("id" as never, rule.id as never);
      if (error) throw error;
      toast.success("המדרגה עודכנה");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שמירה נכשלה");
    } finally {
      setBusyId(null);
    }
  };

  const createRule = async () => {
    setCreating(true);
    try {
      const min = Number(draft.min_deal_price);
      const max = draft.max_deal_price.trim() === "" ? null : Number(draft.max_deal_price);
      const fee = Number(draft.fee_amount);
      if (!Number.isFinite(min) || min < 0) throw new Error("מחיר מינימום לא תקין");
      if (max != null && (!Number.isFinite(max) || max < min)) throw new Error("מחיר מקסימום לא תקין");
      if (!Number.isFinite(fee) || fee < 0) throw new Error("סכום דמי השתתפות לא תקין");

      const { error } = await supabase.from("platform_fees" as never).insert({
        name: draft.name.trim() || null,
        fee_type: "participation",
        min_deal_price: min,
        max_deal_price: max,
        fee_amount: fee,
        is_active: draft.is_active,
        priority: Number(draft.priority) || 100,
        sort_order: Number(draft.sort_order) || 0,
        currency: "ILS",
      } as never);
      if (error) throw error;
      toast.success("מדרגה חדשה נוספה");
      setDraft(emptyDraft());
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "יצירה נכשלה");
    } finally {
      setCreating(false);
    }
  };

  const removeRule = async (id: string) => {
    if (!(await askConfirm({ title: "מחיקת מדרגה", description: "למחוק את המדרגה? פעולה זו אינה משנה חיובים קיימים.", confirmLabel: "מחיקה", destructive: true }))) return;
    setBusyId(id);
    try {
      const { error } = await supabase
        .from("platform_fees" as never)
        .delete()
        .eq("id" as never, id as never);
      if (error) throw error;
      toast.success("המדרגה נמחקה");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "מחיקה נכשלה");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <MobileShell>
      <AdminPageHeader
        title="דמי השתתפות"
        description="מדרגות מחיר עסקה → דמי השתתפות. שינוי הסכומים ללא שינוי קוד."
      />

      <div className="px-5 lg:px-8 py-4 space-y-4 max-w-3xl" dir="rtl">
        <CategoryParticipationFees />

        <div className="bg-white border border-[#ECEEF2] rounded-[14px] p-4 space-y-3">

          <div className="flex items-center gap-2 font-extrabold text-[15px] text-[#0F172A]">
            <Plus className="h-4 w-4 text-[#0E6B5A]" />
            מדרגה חדשה
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">שם לתצוגה</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="לדוגמה: 2,001–10,000 ₪"
              />
            </div>
            <div>
              <Label className="text-xs">מחיר עסקה מ־</Label>
              <Input
                type="number"
                value={draft.min_deal_price}
                onChange={(e) => setDraft({ ...draft, min_deal_price: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">עד (ריק = ללא תקרה)</Label>
              <Input
                type="number"
                value={draft.max_deal_price}
                onChange={(e) => setDraft({ ...draft, max_deal_price: e.target.value })}
                placeholder="ללא הגבלה"
              />
            </div>
            <div>
              <Label className="text-xs">דמי השתתפות (₪)</Label>
              <Input
                type="number"
                value={draft.fee_amount}
                onChange={(e) => setDraft({ ...draft, fee_amount: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">סדר תצוגה</Label>
              <Input
                type="number"
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
              />
            </div>
          </div>
          <Button
            onClick={() => void createRule()}
            disabled={creating}
            className="w-full h-11 rounded-xl bg-[#0E6B5A] font-extrabold"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "הוסף מדרגה"}
          </Button>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#0E6B5A]" />
          </div>
        ) : (
          <div className="space-y-3">
            {rules.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">אין מדרגות מוגדרות</div>
            )}
            {rules.map((rule) => (
              <FeeRuleCard
                key={rule.id}
                rule={rule}
                busy={busyId === rule.id}
                onToggle={() => void toggleActive(rule)}
                onSave={(patch) => void saveRule(rule, patch)}
                onDelete={() => void removeRule(rule.id)}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}

function FeeRuleCard({
  rule,
  busy,
  onToggle,
  onSave,
  onDelete,
}: {
  rule: PlatformFeeRule;
  busy: boolean;
  onToggle: () => void;
  onSave: (patch: Partial<Draft>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(rule.name ?? "");
  const [min, setMin] = useState(String(rule.min_deal_price));
  const [max, setMax] = useState(rule.max_deal_price == null ? "" : String(rule.max_deal_price));
  const [fee, setFee] = useState(String(rule.fee_amount));

  useEffect(() => {
    setName(rule.name ?? "");
    setMin(String(rule.min_deal_price));
    setMax(rule.max_deal_price == null ? "" : String(rule.max_deal_price));
    setFee(String(rule.fee_amount));
  }, [rule]);

  return (
    <div className={"bg-white border rounded-[14px] p-4 space-y-3 " + (rule.is_active ? "border-[#ECEEF2]" : "border-dashed border-[#D1D5DB] opacity-80")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-extrabold text-[14px] text-[#0F172A]">{formatFeeBandLabel(rule)}</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">
            דמי השתתפות: <span className="font-bold text-[#0E6B5A]">{formatILS(rule.fee_amount)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className="tap-target flex items-center gap-1 text-[12px] font-bold text-[#0E6B5A] disabled:opacity-50"
        >
          {rule.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
          {rule.is_active ? "פעיל" : "כבוי"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-xs">שם</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">מינ׳ מחיר עסקה</Label>
          <Input type="number" value={min} onChange={(e) => setMin(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">מקס׳ מחיר עסקה</Label>
          <Input type="number" value={max} onChange={(e) => setMax(e.target.value)} placeholder="ללא תקרה" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">דמי השתתפות (₪)</Label>
          <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button
          type="button"
          disabled={busy}
          onClick={() => onSave({ name, min_deal_price: min, max_deal_price: max, fee_amount: fee })}
          className="h-10 rounded-xl bg-[#0E6B5A] font-bold"
        >
          <Save className="h-3.5 w-3.5 ml-1" /> שמור
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onDelete}
          className="h-10 rounded-xl font-bold text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 ml-1" /> מחק
        </Button>
      </div>
    </div>
  );
}
