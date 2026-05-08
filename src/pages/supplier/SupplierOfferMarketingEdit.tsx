import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, Loader2, Plus, X, ShieldAlert, Sparkles, Lock } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Supplier-restricted offer editor: only marketing fields.
 * Locked: deposit, tiers, pricing, conditions, status — to prevent abuse.
 */
export default function SupplierOfferMarketingEdit() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHl, setNewHl] = useState("");

  useEffect(() => {
    if (!dealId) return;
    (async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("title,description,highlights")
        .eq("id", dealId)
        .maybeSingle();
      if (error) {
        toast.error("טעינה נכשלה");
        setLoading(false);
        return;
      }
      if (data) {
        setTitle(data.title ?? "");
        setDescription(data.description ?? "");
        setHighlights(Array.isArray(data.highlights) ? (data.highlights as string[]) : []);
      }
      setLoading(false);
    })();
  }, [dealId]);

  const addHighlight = () => {
    const v = newHl.trim();
    if (!v) return;
    if (highlights.length >= 8) {
      toast.error("עד 8 נקודות שיווקיות");
      return;
    }
    setHighlights((h) => [...h, v]);
    setNewHl("");
  };

  const handleSave = async () => {
    if (!dealId) return;
    if (!title.trim()) {
      toast.error("כותרת חובה");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("deals")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          highlights: highlights as never,
        })
        .eq("id", dealId);
      if (error) throw error;
      toast.success("השינויים נשמרו");
      navigate(-1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <PageHeader title="עריכת הצעה" subtitle="טוען..." back />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <PageHeader title="עריכה שיווקית" subtitle="ניתן לעדכן רק שדות שיווקיים" back />

      <div className="px-5 -mt-4 relative z-10 space-y-4 pb-32">
        {/* Trust banner */}
        <div className="rounded-2xl bg-gradient-to-l from-gold/10 via-gold/5 to-transparent border border-gold/30 p-3.5 flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gold/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-gold" />
          </div>
          <div className="text-[12px] leading-relaxed">
            <div className="font-bold text-foreground mb-0.5">עריכה בטוחה</div>
            <p className="text-muted-foreground">
              ניתן לעדכן את הטקסט השיווקי, הכותרת והתיאור — נתוני פיקדון, מדרגות ותנאים נעולים לשמירה על ההוגנות לדיירים.
            </p>
          </div>
        </div>

        {/* Editable */}
        <section className="gb-card p-4 space-y-3">
          <div>
            <Label className="text-xs font-bold mb-1.5 block">כותרת ההצעה</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="h-11 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">תיאור / טקסט שיווקי</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={1500}
              className="rounded-xl"
              placeholder="ספר על ההצעה — מה מיוחד בה, מה כלול..."
            />
          </div>
        </section>

        {/* Highlights */}
        <section className="gb-card p-4 space-y-3">
          <Label className="text-xs font-bold">נקודות מפתח (Highlights)</Label>
          <div className="flex gap-2">
            <Input
              value={newHl}
              onChange={(e) => setNewHl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHighlight();
                }
              }}
              placeholder="לדוגמה: אחריות 5 שנים"
              maxLength={60}
              className="h-10 rounded-xl flex-1"
            />
            <Button type="button" onClick={addHighlight} className="h-10 rounded-xl px-3" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {highlights.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {highlights.map((h, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1.5 rounded-full bg-gold/10 text-primary border border-gold/30"
                >
                  {h}
                  <button
                    type="button"
                    onClick={() => setHighlights((arr) => arr.filter((_, idx) => idx !== i))}
                    className="h-4 w-4 rounded-full bg-card border border-border hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Locked fields */}
        <section className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> שדות נעולים לעריכה
          </div>
          <ul className="text-[12px] text-muted-foreground space-y-1 pr-5 list-disc">
            <li>סכום פיקדון ודרישת פיקדון</li>
            <li>מדרגות מחיר / הנחה</li>
            <li>סטטוס ההצעה ותנאי הצטרפות</li>
            <li>קטגוריה ונראות (ציבורי / פרויקט)</li>
          </ul>
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 pt-1">
            <ShieldAlert className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
            לשינויים בשדות אלו יש לפנות למנהל המערכת. נועד למניעת שינויים לאחר שדיירים כבר הצטרפו.
          </p>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[480px] px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background to-background/0 flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1 h-12 rounded-xl">
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground">
            <Save className="h-4 w-4 ml-2" /> {saving ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
