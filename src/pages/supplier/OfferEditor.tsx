import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, AlertCircle, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PricingTier } from "@/types";

type SupplierLite = {
  id: string;
  business_name: string;
  approval_status: string;
  categories: string[] | null;
};

export default function OfferEditor() {
  const navigate = useNavigate();
  const { categories } = useApp();

  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<SupplierLite | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [originalPrice, setOriginalPrice] = useState<number>(50000);
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<PricingTier[]>([
    { minParticipants: 1, maxParticipants: 4, price: 45000, label: "מחיר מחירון" },
    { minParticipants: 5, maxParticipants: 9, price: 40000, label: "הנחה ראשונה" },
    { minParticipants: 10, maxParticipants: 19, price: 35000, label: "הנחה שנייה" },
    { minParticipants: 20, maxParticipants: null, price: 30000, label: "המחיר הטוב ביותר" },
  ]);

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
          // pre-select first matching category if supplier has one
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

  const updateTier = (i: number, patch: Partial<PricingTier>) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
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

    setSaving(true);
    try {
      const payload = {
        supplier_id: supplier.id,
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        original_price: originalPrice,
        deposit_amount: depositAmount,
        tiers: tiers as unknown as object,
        highlights: ["מחיר מיוחד", "התקנה כלולה", "אחריות מלאה"] as unknown as object,
        status: "active",
        ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      };

      const { error } = await supabase.from("deals" as never).insert(payload as never);
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
      <PageHeader title="הצעה חדשה" subtitle="הגדירו פרטים ודרגות מחיר דינמיות" back />

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
          <div className="grid grid-cols-2 gap-3">
            <Field label="מחיר מחירון (₪)">
              <Input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(+e.target.value)} className="h-11 rounded-xl" />
            </Field>
            <Field label="פיקדון (₪)">
              <Input type="number" value={depositAmount} onChange={(e) => setDepositAmount(+e.target.value)} className="h-11 rounded-xl" />
            </Field>
          </div>
        </div>

        <div className="gb-card p-4">
          <h3 className="font-bold text-sm mb-3">דרגות מחיר דינמיות</h3>
          <div className="space-y-2">
            {tiers.map((t, i) => (
              <div key={i} className="rounded-2xl border-2 border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between mb-2">
                  <Input
                    value={t.label}
                    onChange={(e) => updateTier(i, { label: e.target.value })}
                    className="h-9 rounded-lg flex-1 ml-2 bg-card text-sm font-bold"
                  />
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {t.minParticipants}{t.maxParticipants ? `-${t.maxParticipants}` : "+"} משתתפים
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Mini label="מינ׳">
                    <Input type="number" value={t.minParticipants} onChange={(e) => updateTier(i, { minParticipants: +e.target.value })} className="h-9 rounded-lg" />
                  </Mini>
                  <Mini label="מקס׳">
                    <Input
                      type="number"
                      value={t.maxParticipants ?? ""}
                      placeholder="∞"
                      onChange={(e) => updateTier(i, { maxParticipants: e.target.value ? +e.target.value : null })}
                      className="h-9 rounded-lg"
                    />
                  </Mini>
                  <Mini label="מחיר ₪">
                    <Input type="number" value={t.price} onChange={(e) => updateTier(i, { price: +e.target.value })} className="h-9 rounded-lg" />
                  </Mini>
                </div>
              </div>
            ))}
          </div>
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
