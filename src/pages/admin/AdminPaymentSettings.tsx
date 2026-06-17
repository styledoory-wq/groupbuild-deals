import { useEffect, useState } from "react";
import { CreditCard, Wallet, Percent, Save } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Provider = "grow_make" | "grow" | "cardcom" | "stripe";
type FeeAbsorber = "resident" | "supplier" | "groupbuild";

const providerSecrets: Record<Provider, string> = {
  grow_make: "MAKE_CREATE_PAYMENT_LINK_WEBHOOK_URL, MAKE_CALLBACK_SECRET, GROW_MAKE_SUCCESS_URL, GROW_MAKE_CANCEL_URL",
  grow: "GROW_API_KEY, GROW_PAGE_CODE, GROW_USER_ID",
  cardcom: "CARDCOM_TERMINAL_NUMBER, CARDCOM_API_NAME",
  stripe: "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET",
};

export default function AdminPaymentSettings() {
  const [id, setId] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("grow_make");
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [depositMinAmount, setDepositMinAmount] = useState<string>("");
  const [depositMaxAmount, setDepositMaxAmount] = useState<string>("");
  const [commission, setCommission] = useState<number>(0);
  const [feeAbsorber, setFeeAbsorber] = useState<FeeAbsorber>("groupbuild");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setId(data.id);
        setProvider((data.active_payment_provider as Provider) ?? "grow_make");
        setDepositAmount(Number(data.deposit_default_amount));
        setDepositMinAmount(data.deposit_min_amount == null ? "" : String(data.deposit_min_amount));
        setDepositMaxAmount(data.deposit_max_amount == null ? "" : String(data.deposit_max_amount));
        setCommission(Number(data.commission_percent));
        setFeeAbsorber((data.payment_fee_absorber as FeeAbsorber) ?? "groupbuild");
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!id) return;
    const minAmount = depositMinAmount.trim() === "" ? null : Number(depositMinAmount);
    const maxAmount = depositMaxAmount.trim() === "" ? null : Number(depositMaxAmount);
    if (minAmount !== null && (!Number.isFinite(minAmount) || minAmount <= 0)) {
      toast.error("סכום מינימום חייב להיות מספר חיובי");
      return;
    }
    if (maxAmount !== null && (!Number.isFinite(maxAmount) || maxAmount <= 0)) {
      toast.error("סכום מקסימום חייב להיות מספר חיובי");
      return;
    }
    if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
      toast.error("סכום מינימום לא יכול להיות גבוה מהמקסימום");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .update({
        active_payment_provider: provider,
        deposit_default_amount: depositAmount,
        deposit_min_amount: minAmount,
        deposit_max_amount: maxAmount,
        commission_percent: commission,
        payment_fee_absorber: feeAbsorber,
      })
      .eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("ההגדרות נשמרו");
  };

  return (
    <MobileShell>
      <PageHeader title="הגדרות תשלום" subtitle="ספק סליקה וברירות מחדל" back />
      <div className="px-5 -mt-4 relative z-10 space-y-4">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-10">טוען…</div>
        ) : (
          <>
            <section className="gb-card p-5">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 gb-gold-text" />
                ספק סליקה פעיל
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(["grow_make", "grow", "cardcom", "stripe"] as Provider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-smooth text-center",
                      provider === p
                        ? "border-[#1F2937] bg-[#F4F6FA]"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="text-base font-bold">
                      {p === "grow_make" ? "Grow Make" : p === "grow" ? "Grow API" : p === "cardcom" ? "Cardcom" : "Stripe"}
                    </div>
                    <div className="text-fs-xs text-muted-foreground mt-1">
                      {p === "grow_make" ? "Make.com + Grow" : p === "grow" ? "Direct API disabled" : p === "cardcom" ? "Cardcom disabled" : "Stripe disabled"}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-fs-xs text-muted-foreground mt-3 leading-relaxed">
                לאחר בחירת הספק, הוסיפו את מפתחות ה-API המתאימים בהגדרות הסודות של Lovable Cloud
                ({providerSecrets[provider]}).
              </p>
            </section>

            <section className="gb-card p-5 space-y-4">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Wallet className="h-4 w-4 gb-gold-text" />
                ברירות מחדל
              </h2>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">סכום פיקדון ברירת מחדל (₪)</Label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="h-12 rounded-2xl"
                  min={0}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">מינימום פיקדון אופציונלי</Label>
                  <Input
                    type="number"
                    value={depositMinAmount}
                    onChange={(e) => setDepositMinAmount(e.target.value)}
                    className="h-12 rounded-2xl"
                    min={0}
                    step="0.01"
                    placeholder="ללא"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">מקסימום פיקדון אופציונלי</Label>
                  <Input
                    type="number"
                    value={depositMaxAmount}
                    onChange={(e) => setDepositMaxAmount(e.target.value)}
                    className="h-12 rounded-2xl"
                    min={0}
                    step="0.01"
                    placeholder="ללא"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5" />
                  אחוז עמלה לפלטפורמה
                </Label>
                <Input
                  type="number"
                  value={commission}
                  onChange={(e) => setCommission(Number(e.target.value))}
                  className="h-12 rounded-2xl"
                  min={0}
                  max={100}
                  step={0.5}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">מי סופג כלכלית את עמלת הסליקה</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    ["resident", "דייר"],
                    ["supplier", "ספק"],
                    ["groupbuild", "GroupBuild"],
                  ] as Array<[FeeAbsorber, string]>).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFeeAbsorber(value)}
                      className={cn(
                        "h-10 rounded-xl border text-xs font-bold transition-smooth",
                        feeAbsorber === value ? "border-gold bg-[#FFF8E1] text-primary" : "border-border bg-card text-muted-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="rounded-xl bg-muted/40 p-3 text-fs-xs text-muted-foreground leading-relaxed">
                  {feeAbsorber === "resident" && "הדייר משלם את הפיקדון בתוספת עמלת הסליקה. הספק מקבל זיכוי/ניכוי לפי סכום הפיקדון נטו אחרי עמלה."}
                  {feeAbsorber === "supplier" && "הדייר משלם את סכום הפיקדון בלבד. עמלת הסליקה מקטינה את סכום הזיכוי/ניכוי של הספק."}
                  {feeAbsorber === "groupbuild" && "הדייר משלם את סכום הפיקדון בלבד. הספק מקבל זיכוי/ניכוי לפי ברוטו, ו-GroupBuild סופגת את עמלת הסליקה."}
                </div>
              </div>
            </section>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "שומר…" : "שמירת הגדרות"}
            </Button>
          </>
        )}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}
