import { useEffect, useMemo, useState } from "react";
import { Loader2, Layers, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CatFee = {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
  participation_fee_mode: "price_based" | "fixed";
  participation_fee_amount: number | null;
};

/**
 * Admin control for how the participation fee is decided per category.
 * The supplier never influences this — the system decides automatically:
 *  - "price_based": use the admin price bands (only when the deal has an
 *    unambiguous final price).
 *  - "fixed": always charge the category's fixed amount.
 * A deal without an unambiguous price always falls back to the fixed amount.
 */
export function CategoryParticipationFees() {
  const [cats, setCats] = useState<CatFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,level,parent_id,participation_fee_mode,participation_fee_amount")
        .eq("is_deleted", false)
        .eq("level", 1)
        .order("display_order", { ascending: true });
      if (error) throw error;
      const rows = ((data ?? []) as unknown as CatFee[]).map((c) => ({
        ...c,
        participation_fee_mode: (c.participation_fee_mode ?? "price_based") as CatFee["participation_fee_mode"],
        participation_fee_amount:
          c.participation_fee_amount == null ? null : Number(c.participation_fee_amount),
      }));
      setCats(rows);
      setDrafts(
        Object.fromEntries(
          rows.map((c) => [c.id, c.participation_fee_amount == null ? "" : String(c.participation_fee_amount)]),
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "טעינת קטגוריות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return cats;
    return cats.filter((c) => c.name.toLowerCase().includes(s));
  }, [cats, search]);

  const save = async (c: CatFee, patch: Partial<Pick<CatFee, "participation_fee_mode" | "participation_fee_amount">>) => {
    setBusyId(c.id);
    try {
      const { error } = await supabase
        .from("categories")
        .update(patch as never)
        .eq("id", c.id);
      if (error) throw error;
      setCats((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...patch } : x)));
      toast.success("נשמר");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שמירה נכשלה");
    } finally {
      setBusyId(null);
    }
  };

  const saveAmount = async (c: CatFee) => {
    const raw = (drafts[c.id] ?? "").trim();
    const amount = raw === "" ? null : Number(raw);
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
      toast.error("סכום לא תקין");
      return;
    }
    await save(c, { participation_fee_amount: amount });
  };

  return (
    <div className="bg-white border border-[#ECEEF2] rounded-[14px] p-4 space-y-3">
      <div className="flex items-center gap-2 font-extrabold text-[15px] text-[#0F172A]">
        <Layers className="h-4 w-4 text-[#0E6B5A]" />
        דמי השתתפות לפי קטגוריה
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        המערכת מחליטה אוטומטית: עסקה עם מחיר סופי חד-משמעי מחויבת לפי מדרגות המחיר,
        וכל עסקה ללא מחיר חד-משמעי (הנחה באחוזים, מחיר לפי דגם/מידה/מפרט) מחויבת בסכום
        הקבוע של הקטגוריה. לספק אין כל השפעה על הסכום.
      </p>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש קטגוריה"
          className="pr-9"
        />
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#0E6B5A]" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">לא נמצאו קטגוריות</div>
          )}
          {filtered.map((c) => (
            <div key={c.id} className="rounded-xl border border-[#ECEEF2] p-3 space-y-2">
              <div className="font-bold text-[14px] text-[#0F172A]">{c.name}</div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["price_based", "לפי מחיר העסקה"],
                  ["fixed", "סכום קבוע"],
                ] as Array<[CatFee["participation_fee_mode"], string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => void save(c, { participation_fee_mode: value })}
                    className={cn(
                      "h-10 rounded-xl border text-[12px] font-bold transition-smooth",
                      c.participation_fee_mode === value
                        ? "border-[#0E6B5A] bg-[#E8F3F0] text-[#0E6B5A]"
                        : "border-[#ECEEF2] bg-white text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">סכום קבוע לקטגוריה (₪)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={drafts[c.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                    placeholder="לדוגמה: 49"
                  />
                </div>
                <Button
                  type="button"
                  disabled={busyId === c.id}
                  onClick={() => void saveAmount(c)}
                  className="h-10 rounded-xl bg-[#0E6B5A] font-extrabold px-4"
                >
                  {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור"}
                </Button>
              </div>
              {c.participation_fee_mode === "fixed" && !(Number(c.participation_fee_amount) > 0) && (
                <div className="text-[12px] font-bold text-[#B91C1C]">
                  חסר סכום קבוע — הצטרפות לעסקאות בקטגוריה זו תיחסם.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
