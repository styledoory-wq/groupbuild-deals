import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Save } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useApp } from "@/store/AppStore";
import { toast } from "sonner";
import type { Deal, PricingTier } from "@/types";

export default function OfferEditor() {
  const navigate = useNavigate();
  const { categories, projects, suppliers, deals, setDeals, user } = useApp();
  const supplier = suppliers.find((s) => s.ownerName === user?.name) || suppliers[0];

  const safeCategoryId = categories[0]?.id ?? "";
  const safeProjectId = projects[0]?.id ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(safeCategoryId);
  const [projectId, setProjectId] = useState(safeProjectId);
  const [originalPrice, setOriginalPrice] = useState(50000);
  const [depositAmount, setDepositAmount] = useState(1000);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<PricingTier[]>([
    { minParticipants: 1, maxParticipants: 4, price: 45000, label: "מחיר מחירון" },
    { minParticipants: 5, maxParticipants: 9, price: 40000, label: "הנחה ראשונה" },
    { minParticipants: 10, maxParticipants: 19, price: 35000, label: "הנחה שנייה" },
    { minParticipants: 20, maxParticipants: null, price: 30000, label: "המחיר הטוב ביותר" },
  ]);

  const updateTier = (i: number, patch: Partial<PricingTier>) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (!supplier?.id) {
        toast.error("לא נמצא פרופיל ספק פעיל. השלם את פרטי הספק לפני יצירת הצעה.");
        setSaving(false);
        return;
      }
      if (!categoryId) {
        toast.error("יש לבחור קטגוריה");
        setSaving(false);
        return;
      }
      if (!projectId) {
        toast.error("יש לבחור פרויקט");
        setSaving(false);
        return;
      }
      if (!title.trim()) {
        toast.error("יש להזין שם להצעה");
        setSaving(false);
        return;
      }

      const newDeal: Deal = {
        id: `d_${Date.now()}`,
        title: title.trim(),
        categoryId,
        projectId,
        supplierId: supplier.id,
        description: description.trim() || "תיאור ההצעה",
        originalPrice,
        tiers,
        paidParticipants: 0,
        joinedParticipants: 0,
        status: "active",
        depositAmount,
        endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        highlights: ["מחיר מיוחד", "התקנה כלולה", "אחריות מלאה"],
      };
      setDeals([newDeal, ...deals]);
      toast.success("ההצעה נשמרה בהצלחה!");
      navigate("/supplier", { replace: true });
    } catch (err: any) {
      console.error("OfferEditor save error", err);
      toast.error("אירעה שגיאה בשמירת ההצעה. נסה שוב.");
    } finally {
      setSaving(false);
    }
  };

  // Empty-state guard so the page never crashes if mock data is missing
  if (!categories.length || !projects.length) {
    return (
      <MobileShell>
        <PageHeader title="הצעה חדשה" subtitle="לא ניתן ליצור הצעה כרגע" back />
        <div className="px-5 mt-6 space-y-3">
          <div className="gb-card p-4 text-sm text-muted-foreground">
            חסרים נתוני קטגוריות או פרויקטים. פנה למנהל המערכת.
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
      <PageHeader title="הצעה חדשה" subtitle="הגדירו פרטים ודרגות מחיר דינמיות" />

      <div className="px-5 -mt-4 relative z-10 space-y-4">
        <div className="gb-card p-4 space-y-3">
          <Field label="שם ההצעה">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="לדוגמה: שדרוג מטבח פרימיום" className="h-11 rounded-xl" />
          </Field>
          <Field label="תיאור">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="תארו את ההצעה..." className="rounded-xl min-h-[80px]" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="קטגוריה">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </Field>
            <Field label="פרויקט">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
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
          <Save className="h-4 w-4 ml-2" /> {saving ? "שומר..." : "שמירת ההצעה"}
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
