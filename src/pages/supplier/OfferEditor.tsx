import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OfferTier, OfferType } from "@/lib/offerPricing";

type SupplierLite = {
  id: string;
  business_name: string;
  approval_status: string;
  categories: string[] | null;
};

// UI-side tier rows (strings so empty inputs are easy to manage)
type TierRow = {
  minParticipants: string;
  maxParticipants: string;
  discount_percentage: string;
  original_price: string;
  discounted_price: string;
  label: string;
};

const emptyTier = (overrides: Partial<TierRow> = {}): TierRow => ({
  minParticipants: "",
  maxParticipants: "",
  discount_percentage: "",
  original_price: "",
  discounted_price: "",
  label: "",
  ...overrides,
});

const defaultPercentageTiers = (): TierRow[] => [
  emptyTier({ minParticipants: "1", maxParticipants: "4", discount_percentage: "5", label: "מדרגה ראשונה" }),
  emptyTier({ minParticipants: "5", maxParticipants: "9", discount_percentage: "10", label: "מדרגה שנייה" }),
  emptyTier({ minParticipants: "10", maxParticipants: "19", discount_percentage: "15", label: "מדרגה שלישית" }),
  emptyTier({ minParticipants: "20", maxParticipants: "", discount_percentage: "20", label: "המחיר הטוב ביותר" }),
];

const defaultPriceTiers = (): TierRow[] => [
  emptyTier({ minParticipants: "1", maxParticipants: "4", original_price: "5000", discounted_price: "4750", label: "מדרגה ראשונה" }),
  emptyTier({ minParticipants: "5", maxParticipants: "9", original_price: "5000", discounted_price: "4500", label: "מדרגה שנייה" }),
  emptyTier({ minParticipants: "10", maxParticipants: "", original_price: "5000", discounted_price: "4200", label: "המחיר הטוב ביותר" }),
];

export default function OfferEditor() {
  const navigate = useNavigate();
  const { categories } = useApp();

  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<SupplierLite | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [depositRequired, setDepositRequired] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [saving, setSaving] = useState(false);

  const [offerType, setOfferType] = useState<OfferType>("percentage");
  const [tiers, setTiers] = useState<TierRow[]>(defaultPercentageTiers());

  // When offer type changes, swap to sensible defaults if user hasn't customized.
  const switchOfferType = (next: OfferType) => {
    if (next === offerType) return;
    setOfferType(next);
    setTiers(next === "percentage" ? defaultPercentageTiers() : defaultPriceTiers());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          if (!cancelled) {
            setBootError("יש להתחבר כספק כדי ליצור הצעה.");
            setBootLoading(false);
          }
          return;
        }

        const email = session.user.email ?? "";
        const byUser = await supabase
          .from("suppliers")
          .select("id, business_name, approval_status, categories")
          .eq("user_id", session.user.id)
          .maybeSingle();

        let s: SupplierLite | null = (byUser.data as SupplierLite | null) ?? null;
        if (!s && email) {
          const byEmail = await supabase
            .from("suppliers")
            .select("id, business_name, approval_status, categories")
            .ilike("email", email)
            .maybeSingle();
          s = (byEmail.data as SupplierLite | null) ?? null;
        }

        if (!cancelled) {
          setSupplier(s);
          if (s?.categories?.length && categories.find((c) => c.id === s!.categories![0])) {
            setCategoryId(s.categories[0]);
          } else if (categories.length) {
            setCategoryId(categories[0].id);
          }
          setBootLoading(false);
        }
      } catch (e) {
        console.error("[OfferEditor] boot error", e);
        if (!cancelled) {
          setBootError(e instanceof Error ? e.message : "שגיאה בטעינה");
          setBootLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [categories]);

  const updateTier = (i: number, patch: Partial<TierRow>) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };
  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const nextMin = last?.maxParticipants ? String(Number(last.maxParticipants) + 1) : "";
    setTiers((prev) => [...prev, emptyTier({ minParticipants: nextMin, label: `מדרגה ${prev.length + 1}` })]);
  };
  const removeTier = (i: number) => {
    setTiers((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  };

  const save = async () => {
    if (saving) return;
    if (!supplier?.id) {
      toast.error("לא נמצא פרופיל ספק. השלם את פרטי הספק לפני יצירת הצעה.");
      return;
    }
    if (supplier.approval_status !== "approved" && supplier.approval_status !== "active") {
      toast.error("ניתן לפרסם הצעות רק לאחר אישור הספק על ידי מנהל המערכת.");
      return;
    }
    if (!title.trim()) {
      toast.error("יש להזין שם להצעה");
      return;
    }
    if (!categoryId) {
      toast.error("יש לבחור קטגוריה");
      return;
    }
    if (!tiers.length) {
      toast.error("יש להוסיף לפחות מדרגה אחת");
      return;
    }

    // Validate & build tier payload
    const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
    const cleanTiers: OfferTier[] = [];
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const min = num(t.minParticipants);
      if (!Number.isFinite(min) || min < 1) {
        toast.error(`מדרגה ${i + 1}: מינימום מצטרפים חייב להיות 1 ומעלה`);
        return;
      }
      let max: number | null = null;
      if (t.maxParticipants.trim() !== "") {
        const m = num(t.maxParticipants);
        if (!Number.isFinite(m) || m < min) {
          toast.error(`מדרגה ${i + 1}: מקסימום מצטרפים חייב להיות גדול או שווה למינימום`);
          return;
        }
        max = m;
      }

      if (offerType === "percentage") {
        const pct = num(t.discount_percentage);
        if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
          toast.error(`מדרגה ${i + 1}: אחוז הנחה חייב להיות בין 1 ל-100`);
          return;
        }
        cleanTiers.push({
          minParticipants: min,
          maxParticipants: max,
          discount_percentage: pct,
          label: t.label.trim() || null,
        });
      } else {
        const before = num(t.original_price);
        const after = num(t.discounted_price);
        if (!Number.isFinite(before) || before <= 0) {
          toast.error(`מדרגה ${i + 1}: מחיר לפני חייב להיות מספר חיובי`);
          return;
        }
        if (!Number.isFinite(after) || after <= 0) {
          toast.error(`מדרגה ${i + 1}: מחיר אחרי חייב להיות מספר חיובי`);
          return;
        }
        if (after >= before) {
          toast.error(`מדרגה ${i + 1}: המחיר אחרי חייב להיות קטן מהמחיר לפני`);
          return;
        }
        cleanTiers.push({
          minParticipants: min,
          maxParticipants: max,
          original_price: before,
          discounted_price: after,
          label: t.label.trim() || null,
        });
      }
    }

    // Sort by min, ensure at least the lowest is for new offers
    cleanTiers.sort((a, b) => a.minParticipants - b.minParticipants);
    const firstTier = cleanTiers[0];

    type Json = import("@/integrations/supabase/types").Json;
    const payload: Record<string, unknown> = {
      supplier_id: supplier.id,
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      offer_type: offerType,
      deposit_required: depositRequired,
      deposit_amount: depositRequired ? depositAmount : 0,
      tiers: cleanTiers as unknown as Json,
      highlights: ["מחיר מיוחד", "אחריות מלאה"] as unknown as Json,
      status: "active",
      ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    };

    // Mirror first-tier values into top-level fields for backward compatibility & sorting.
    if (offerType === "percentage") {
      payload.discount_percentage = firstTier.discount_percentage ?? null;
      payload.base_price = null;
      payload.original_price = 0;
      payload.discounted_price = null;
    } else {
      payload.original_price = firstTier.original_price ?? 0;
      payload.discounted_price = firstTier.discounted_price ?? null;
      payload.discount_percentage =
        firstTier.original_price && firstTier.discounted_price
          ? Math.round(((firstTier.original_price - firstTier.discounted_price) / firstTier.original_price) * 100)
          : null;
      payload.base_price = null;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("deals").insert([payload as never]);
      if (error) {
        console.error("[OfferEditor] insert error", error);
        const msg = error.message?.includes("row-level")
          ? "אין הרשאה ליצור הצעה. ודא שהספק אושר על ידי מנהל המערכת."
          : `שמירת ההצעה נכשלה: ${error.message}`;
        toast.error(msg);
        return;
      }
      toast.success("ההצעה נשמרה בהצלחה!");
      navigate("/supplier/offers", { replace: true });
    } catch (err: unknown) {
      console.error("[OfferEditor] save exception", err);
      toast.error("אירעה שגיאה בשמירת ההצעה. נסה שוב.");
    } finally {
      setSaving(false);
    }
  };

  if (bootLoading) {
    return (
      <MobileShell>
        <PageHeader title="הצעה חדשה" subtitle="טוען…" back />
        <div className="px-5 mt-10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  if (bootError) {
    return (
      <MobileShell>
        <PageHeader title="הצעה חדשה" back />
        <div className="px-5 mt-6">
          <div className="gb-card p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="font-bold text-base mb-1">שגיאה</h2>
            <p className="text-xs text-muted-foreground mb-4">{bootError}</p>
            <Button onClick={() => navigate("/supplier", { replace: true })} className="w-full h-11 rounded-xl">
              חזרה לדשבורד
            </Button>
          </div>
        </div>
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  if (!supplier) {
    return (
      <MobileShell>
        <PageHeader title="הצעה חדשה" back />
        <div className="px-5 mt-6">
          <div className="gb-card p-6 text-center">
            <h2 className="font-bold text-base mb-2">חסר פרופיל ספק</h2>
            <p className="text-xs text-muted-foreground mb-4">
              לא נמצא פרופיל ספק עבור החשבון שלך. השלם את הפרטים כדי להתחיל לפרסם הצעות.
            </p>
            <Button onClick={() => navigate("/supplier/profile/edit")} className="w-full h-11 rounded-xl">
              השלמת פרטי ספק
            </Button>
          </div>
        </div>
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  if (!categories.length) {
    return (
      <MobileShell>
        <PageHeader title="הצעה חדשה" subtitle="לא ניתן ליצור הצעה כרגע" back />
        <div className="px-5 mt-6 space-y-3">
          <div className="gb-card p-4 text-sm text-muted-foreground text-center">
            חסרות קטגוריות במערכת. פנה למנהל המערכת.
          </div>
          <Button onClick={() => navigate("/supplier", { replace: true })} className="w-full h-12 rounded-2xl">
            חזרה לדשבורד הספק
          </Button>
        </div>
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <PageHeader title="הצעה חדשה" subtitle="הגדירו מדרגות הנחה לפי כמות מצטרפים" back />

      <div className="px-5 -mt-4 relative z-10 space-y-4">
        <div className="gb-card p-4 space-y-3">
          <Field label="שם ההצעה">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="לדוגמה: שדרוג מטבח פרימיום" className="h-11 rounded-xl" />
          </Field>
          <Field label="תיאור">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="תארו את ההצעה..." className="rounded-xl min-h-[80px]" />
          </Field>
          <Field label="קטגוריה">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </Field>
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={depositRequired}
                onChange={(e) => setDepositRequired(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-bold text-foreground">דורש פיקדון להצטרפות</span>
            </label>
            {depositRequired && (
              <div>
                <div className="text-[11px] font-bold text-muted-foreground mb-1">סכום הפיקדון (₪)</div>
                <Input
                  type="number"
                  min={1}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(+e.target.value)}
                  className="h-11 rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  בשלב זה הפיקדון מהווה התחייבות בלבד — לא תתבצע גבייה בפועל.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Offer type selector */}
        <div className="gb-card p-4 space-y-3">
          <h3 className="font-bold text-sm">סוג הצעה</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchOfferType("percentage")}
              className={`h-12 rounded-xl border-2 text-sm font-bold transition-smooth ${
                offerType === "percentage"
                  ? "border-gold bg-gradient-to-l from-gold/10 to-transparent text-primary"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              אחוז הנחה
            </button>
            <button
              type="button"
              onClick={() => switchOfferType("price_comparison")}
              className={`h-12 rounded-xl border-2 text-sm font-bold transition-smooth ${
                offerType === "price_comparison"
                  ? "border-gold bg-gradient-to-l from-gold/10 to-transparent text-primary"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              מחיר לפני ואחרי
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            ככל שיותר דיירים מצטרפים — ההנחה גדלה.
          </p>
        </div>

        {/* Tiers builder */}
        <div className="gb-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">מדרגות לפי כמות מצטרפים</h3>
            <span className="text-[10px] text-muted-foreground">{tiers.length} מדרגות</span>
          </div>

          <div className="space-y-3">
            {tiers.map((t, i) => (
              <div key={i} className="rounded-2xl border-2 border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <Input
                    value={t.label}
                    onChange={(e) => updateTier(i, { label: e.target.value })}
                    placeholder={`מדרגה ${i + 1}`}
                    className="h-9 rounded-lg flex-1 bg-card text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => removeTier(i)}
                    disabled={tiers.length <= 1}
                    className="h-9 w-9 shrink-0 rounded-lg bg-card border border-border flex items-center justify-center text-destructive disabled:opacity-30"
                    aria-label="הסר מדרגה"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Mini label="מינ׳ מצטרפים">
                    <Input
                      type="number"
                      value={t.minParticipants}
                      onChange={(e) => updateTier(i, { minParticipants: e.target.value })}
                      className="h-9 rounded-lg"
                      placeholder="1"
                    />
                  </Mini>
                  <Mini label="מקס׳ מצטרפים (אופציונלי)">
                    <Input
                      type="number"
                      value={t.maxParticipants}
                      placeholder="∞"
                      onChange={(e) => updateTier(i, { maxParticipants: e.target.value })}
                      className="h-9 rounded-lg"
                    />
                  </Mini>
                </div>

                {offerType === "percentage" ? (
                  <Mini label="אחוז הנחה (1-100)">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={t.discount_percentage}
                      onChange={(e) => updateTier(i, { discount_percentage: e.target.value })}
                      className="h-9 rounded-lg"
                      placeholder="10"
                    />
                  </Mini>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Mini label="מחיר לפני (₪)">
                      <Input
                        type="number"
                        value={t.original_price}
                        onChange={(e) => updateTier(i, { original_price: e.target.value })}
                        className="h-9 rounded-lg"
                        placeholder="5000"
                      />
                    </Mini>
                    <Mini label="מחיר אחרי (₪)">
                      <Input
                        type="number"
                        value={t.discounted_price}
                        onChange={(e) => updateTier(i, { discounted_price: e.target.value })}
                        className="h-9 rounded-lg"
                        placeholder="4500"
                      />
                    </Mini>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={addTier}
            variant="outline"
            className="w-full h-11 rounded-xl border-dashed border-2"
          >
            <Plus className="h-4 w-4 ml-2" />
            הוסף מדרגה
          </Button>
        </div>

        <Button onClick={save} disabled={saving} className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-soft text-primary-foreground font-bold shadow-card">
          {saving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
          {saving ? "שומר..." : "שמירת ההצעה"}
        </Button>
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}
