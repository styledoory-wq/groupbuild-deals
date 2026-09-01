import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Search, Save, Users } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  fetchParticipationFeeMode,
  setParticipationFeeMode,
  PARTICIPATION_MODE_LABEL,
  PARTICIPATION_MODE_DESCRIPTION,
  type ParticipationFeeMode,
} from "@/lib/participationMode";

type DealRow = {
  id: string;
  title: string;
  status: string;
  participation_fee_override_mode: "inherit" | "enabled" | "disabled" | null;
  participation_fee_override_amount: number | null;
  participation_fee_amount: number | null;
};

type Mode = "inherit" | "enabled" | "disabled";

export default function AdminDealParticipationFees() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { mode: Mode; amount: string }>>({});
  const [globalMode, setGlobalMode] = useState<ParticipationFeeMode | null>(null);
  const [globalModeError, setGlobalModeError] = useState(false);
  const [pendingGlobalMode, setPendingGlobalMode] = useState<ParticipationFeeMode | null>(null);
  const [globalReason, setGlobalReason] = useState("");
  const [savingGlobalMode, setSavingGlobalMode] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("deals") as any)
        .select("id,title,status,participation_fee_override_mode,participation_fee_override_amount,participation_fee_amount")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as DealRow[];
      setDeals(rows);
      const next: Record<string, { mode: Mode; amount: string }> = {};
      rows.forEach((d) => {
        const mode = (d.participation_fee_override_mode ?? "inherit") as Mode;
        next[d.id] = {
          mode,
          amount: mode === "enabled"
            ? String(d.participation_fee_override_amount ?? d.participation_fee_amount ?? "")
            : "",
        };
      });
      setDrafts(next);
    } catch (e) {
      console.error("[AdminDealParticipationFees]", e);
      toast.error(e instanceof Error ? e.message : "טעינת ההצעות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void (async () => {
      try {
        setGlobalMode(await fetchParticipationFeeMode(null));
        setGlobalModeError(false);
      } catch {
        setGlobalMode(null);
        setGlobalModeError(true);
      }
    })();
  }, []);

  const saveGlobalMode = async () => {
    if (!pendingGlobalMode) return;
    if (globalReason.trim().length < 5) {
      toast.error("יש לפרט סיבה לשינוי (לפחות 5 תווים)");
      return;
    }
    setSavingGlobalMode(true);
    try {
      await setParticipationFeeMode(pendingGlobalMode, globalReason.trim());
      setGlobalMode(pendingGlobalMode);
      setPendingGlobalMode(null);
      setGlobalReason("");
      setGlobalModeError(false);
      toast.success(pendingGlobalMode === "disabled" ? "כל דמי ההצטרפות בוטלו" : "מצב התשלומים הכללי עודכן");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "עדכון המצב הכללי נכשל");
    } finally {
      setSavingGlobalMode(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter((d) => d.title.toLowerCase().includes(q));
  }, [deals, query]);

  const save = async (deal: DealRow) => {
    const draft = drafts[deal.id] ?? { mode: "inherit" as Mode, amount: "" };
    let amount: number | null = null;
    if (draft.mode === "enabled") {
      amount = Number(draft.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("יש להזין סכום חיובי");
        return;
      }
    }
    setSavingId(deal.id);
    try {
      const { error } = await (supabase.rpc as any)("admin_set_deal_participation_fee", {
        _deal_id: deal.id,
        _mode: draft.mode,
        _amount: amount,
      });
      if (error) throw error;
      toast.success(
        draft.mode === "disabled"
          ? "התשלום בוטל לעסקה זו"
          : draft.mode === "enabled"
            ? `דמי ההשתתפות נקבעו ל־${amount} ₪`
            : "העסקה חזרה לתמחור האוטומטי",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "השמירה נכשלה");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <MobileShell>
      <AdminPageHeader
        title="דמי הצטרפות לפי עסקה"
        description="שינוי סכום או ביטול תשלום לעסקה מסוימת בלבד. שאר העסקאות נשארות לפי התמחור הרגיל."
      />
      <div className="px-5 lg:px-8 py-4 space-y-4 max-w-3xl" dir="rtl">
        <section className="bg-white border border-[#ECEEF2] rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Users className="h-5 w-5 mt-0.5 text-[#B08D3C]" />
            <div>
              <div className="font-extrabold text-[15px] text-[#0F172A]">שליטה ראשית על כל התשלומים</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">הגדרה זו גוברת על כל סכום שנקבע להצעה ספציפית.</div>
            </div>
          </div>
          {globalModeError && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-[12px] font-semibold flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              לא ניתן לקרוא את מצב התשלומים. ההצטרפות נשארת חסומה מטעמי בטיחות.
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {(["enabled", "disabled", "maintenance"] as ParticipationFeeMode[]).map((mode) => (
              <button key={mode} type="button" onClick={() => { if (mode === globalMode) return; setPendingGlobalMode(mode); setGlobalReason(""); }}
                className={`min-h-12 rounded-xl border px-2 py-2 text-[11px] font-bold transition ${globalMode === mode ? (mode === "disabled" ? "bg-emerald-700 text-white border-emerald-700" : "bg-[#0F172A] text-white border-[#0F172A]") : "bg-white text-[#475569] border-[#E2E8F0]"}`}>
                {mode === "enabled" ? "תשלומים פעילים" : mode === "disabled" ? "ללא תשלום לכולם" : "עצירת הצטרפות"}
              </button>
            ))}
          </div>
          {globalMode === "disabled" && !pendingGlobalMode && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-2 text-[12px] font-semibold">
              כל ההצטרפויות חינמיות כרגע. גם הצעה עם סכום ידני לא תחויב.
            </div>
          )}
          {pendingGlobalMode && (
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 space-y-3">
              <div className="text-[12px] font-bold text-[#0F172A]">שינוי ל־{PARTICIPATION_MODE_LABEL[pendingGlobalMode]}</div>
              <div className="text-[11px] text-muted-foreground">{PARTICIPATION_MODE_DESCRIPTION[pendingGlobalMode]}</div>
              <Input value={globalReason} onChange={(e) => setGlobalReason(e.target.value)} placeholder="סיבת השינוי, לדוגמה: תקופת השקה" />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setPendingGlobalMode(null)} disabled={savingGlobalMode}>ביטול</Button>
                <Button onClick={() => void saveGlobalMode()} disabled={savingGlobalMode}>
                  {savingGlobalMode ? <Loader2 className="h-4 w-4 animate-spin" /> : "אישור"}
                </Button>
              </div>
            </div>
          )}
        </section>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש עסקה..." className="pr-9" />
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">לא נמצאו עסקאות</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((deal) => {
              const draft = drafts[deal.id] ?? { mode: "inherit" as Mode, amount: "" };
              const busy = savingId === deal.id;
              return (
                <div key={deal.id} className="bg-white border border-[#ECEEF2] rounded-2xl p-4 space-y-3">
                  <div>
                    <div className="font-extrabold text-[15px] text-[#0F172A]">{deal.title}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">סטטוס: {deal.status}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ["inherit", "אוטומטי"],
                      ["enabled", "סכום ידני"],
                      ["disabled", "ללא תשלום"],
                    ] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDrafts((prev) => ({ ...prev, [deal.id]: { ...draft, mode } }))}
                        className={`h-10 rounded-xl border text-[12px] font-bold transition ${draft.mode === mode ? "bg-[#0F172A] text-white border-[#0F172A]" : "bg-white text-[#475569] border-[#E2E8F0]"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {draft.mode === "enabled" && (
                    <div>
                      <Label className="text-xs">דמי הצטרפות (₪)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={draft.amount}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [deal.id]: { ...draft, amount: e.target.value } }))}
                        placeholder="לדוגמה 49"
                      />
                    </div>
                  )}

                  {draft.mode === "disabled" && (
                    <div className="rounded-xl bg-emerald-50 text-emerald-800 px-3 py-2 text-[12px] font-semibold">
                      המצטרפים לעסקה זו יעברו הצטרפות ישירה ללא מסך אשראי.
                    </div>
                  )}

                  <Button onClick={() => void save(deal)} disabled={busy} className="w-full h-10 rounded-xl">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 ml-1" /> שמירה</>}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}
