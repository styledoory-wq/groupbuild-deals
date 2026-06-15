import { useState } from "react";
import { Calculator, Sparkles, TrendingDown } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Result = {
  total_min: number;
  total_max: number;
  discount_min: number;
  discount_max: number;
  categories: { name: string; min: number; max: number }[];
};

const ils = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;

export default function BudgetPlanner() {
  const [form, setForm] = useState({
    apartmentSize: 90,
    renovationType: "standard" as "basic" | "standard" | "luxury",
    rooms: 4,
    flooringType: "פורצלן",
    newKitchen: true,
    bathrooms: 2,
    city: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.city.trim()) { toast.error("נא למלא עיר"); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("budget-planner", { body: form });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setResult(data as Result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בחישוב");
    } finally {
      setLoading(false);
    }
  };

  const maxCat = result ? Math.max(...result.categories.map((c) => c.max)) : 1;

  return (
    <MobileShell>
      <PageHeader title="מחשבון תקציב שיפוץ" subtitle="הערכת עלות חכמה לפי הנתונים שלך — מבוסס AI" />
      <div className="px-5 pb-28 space-y-5">
        <form onSubmit={submit} className="bg-white rounded-3xl p-5 space-y-4 border border-[#ECEEF2]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>גודל דירה (מ"ר)</Label>
              <Input type="number" min={20} value={form.apartmentSize}
                onChange={(e) => setForm({ ...form, apartmentSize: Number(e.target.value) })} />
            </div>
            <div>
              <Label>מספר חדרים</Label>
              <Input type="number" min={1} value={form.rooms}
                onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) })} />
            </div>
            <div>
              <Label>סוג שיפוץ</Label>
              <Select value={form.renovationType} onValueChange={(v) => setForm({ ...form, renovationType: v as typeof form.renovationType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">בסיסי</SelectItem>
                  <SelectItem value="standard">סטנדרטי</SelectItem>
                  <SelectItem value="luxury">יוקרתי</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סוג ריצוף</Label>
              <Select value={form.flooringType} onValueChange={(v) => setForm({ ...form, flooringType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="פורצלן">פורצלן</SelectItem>
                  <SelectItem value="שיש">שיש</SelectItem>
                  <SelectItem value="ויניל">ויניל</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>מספר חדרי רחצה</Label>
              <Input type="number" min={1} value={form.bathrooms}
                onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })} />
            </div>
            <div>
              <Label>עיר</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="לדוגמה: תל אביב" />
            </div>
          </div>
          <div className="flex items-center justify-between bg-[#F4F6FA] rounded-xl p-3">
            <Label className="m-0">מטבח חדש</Label>
            <Switch checked={form.newKitchen} onCheckedChange={(v) => setForm({ ...form, newKitchen: v })} />
          </div>
          <Button type="submit" disabled={loading} variant="premium" className="w-full h-12 gap-2">
            {loading ? "מחשב..." : (<><Sparkles className="h-4 w-4" /> חשב תקציב משוער</>)}
          </Button>
        </form>

        {result && (
          <div className="bg-white rounded-3xl p-5 space-y-5 border border-[#ECEEF2]">
            <div className="text-center">
              <div className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">הערכת עלות כוללת</div>
              <div className="text-[28px] font-extrabold text-[#0A1F3D] mt-1">
                {ils(result.total_min)} – {ils(result.total_max)}
              </div>
              <div
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-extrabold text-[13px]"
                style={{ background: "linear-gradient(145deg, #FFF8E1, #FBEFC4)", color: "#8A6A1C", border: "1px solid #E8D89A" }}
              >
                <TrendingDown className="h-4 w-4" />
                חיסכון משוער דרך GroupBuild: {ils(result.discount_min)} – {ils(result.discount_max)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[13px] font-bold text-[#0A1F3D]">פירוט לפי קטגוריות</div>
              {result.categories.map((c) => {
                const pct = Math.max(8, Math.round((c.max / maxCat) * 100));
                return (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-[#0A1F3D]">{c.name}</span>
                      <span className="text-[#6B7280] font-medium">{ils(c.min)} – {ils(c.max)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F4F6FA] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B8923F]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-[#9CA3AF] text-center">
              * ההערכה מבוססת AI ואינה הצעת מחיר מחייבת. למחיר סופי קבלו הצעות מספקים.
            </p>
          </div>
        )}

        {!result && !loading && (
          <div className="bg-white/60 rounded-2xl p-6 text-center border border-dashed border-[#ECEEF2]">
            <Calculator className="h-10 w-10 mx-auto mb-2 text-[#9CA3AF]" strokeWidth={1.6} />
            <p className="text-[13px] text-[#6B7280]">מלאו את הטופס וקבלו הערכת עלות מפורטת תוך שניות.</p>
          </div>
        )}
      </div>
      <BottomNav role="resident" />
    </MobileShell>
  );
}
