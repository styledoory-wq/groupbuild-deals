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

type Provider = "grow" | "cardcom";

export default function AdminPaymentSettings() {
  const [id, setId] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("grow");
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [commission, setCommission] = useState<number>(0);
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
        setProvider((data.active_payment_provider as Provider) ?? "grow");
        setDepositAmount(Number(data.deposit_default_amount));
        setCommission(Number(data.commission_percent));
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .update({
        active_payment_provider: provider,
        deposit_default_amount: depositAmount,
        commission_percent: commission,
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
              <div className="grid grid-cols-2 gap-2">
                {(["grow", "cardcom"] as Provider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-smooth text-center",
                      provider === p
                        ? "border-gold bg-gradient-to-b from-gold/10 to-transparent"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="text-base font-bold">
                      {p === "grow" ? "Grow" : "Cardcom"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {p === "grow" ? "Meshulam Pay" : "Cardcom Solutions"}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                לאחר בחירת הספק, הוסיפו את מפתחות ה-API המתאימים בהגדרות הסודות של Lovable Cloud
                ({provider === "grow" ? "GROW_API_KEY, GROW_PAGE_CODE, GROW_USER_ID" : "CARDCOM_TERMINAL_NUMBER, CARDCOM_API_NAME"}).
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
