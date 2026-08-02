import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Clock, Loader2, Smartphone, Building2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BackHeader, LoadingState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DepositRow {
  id: string;
  amount: number;
  status: string;
  declared_paid_at: string | null;
  declared_payment_method: string | null;
  created_at: string;
  deal_id: string;
  user_id: string;
  deal_title?: string | null;
  resident_name?: string | null;
  resident_phone?: string | null;
}

const ils = (v: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v);

export default function SupplierDeposits() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) {
        setRows([]);
        return;
      }
      // RLS limits to this supplier's deposits.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("deposits") as any)
        .select("id,amount,status,declared_paid_at,declared_payment_method,created_at,deal_id,user_id")
        .eq("is_deleted", false)
        .in("status", ["awaiting_confirmation", "pending"])
        .order("declared_paid_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      const list = (data ?? []) as DepositRow[];

      // Enrich with deal title + resident profile.
      const dealIds = Array.from(new Set(list.map((r) => r.deal_id)));
      const userIds = Array.from(new Set(list.map((r) => r.user_id)));
      const [{ data: deals }, { data: profs }] = await Promise.all([
        dealIds.length ? supabase.from("deals").select("id,title").in("id", dealIds) : Promise.resolve({ data: [] }),
        userIds.length ? supabase.from("profiles").select("id,full_name,phone").in("id", userIds) : Promise.resolve({ data: [] }),
      ]);
      const dealMap = new Map((deals ?? []).map((d) => [String(d.id), d.title as string]));
      const profMap = new Map((profs ?? []).map((p) => [p.id as string, p as { full_name: string | null; phone: string | null }]));
      setRows(
        list.map((r) => ({
          ...r,
          deal_title: dealMap.get(r.deal_id) ?? null,
          resident_name: profMap.get(r.user_id)?.full_name ?? null,
          resident_phone: profMap.get(r.user_id)?.phone ?? null,
        })),
      );
    } catch (e) {
      console.error("[SupplierDeposits] load", e);
      toast.error("טעינת הפיקדונות נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirm = async (id: string) => {
    setConfirmingId(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("confirm_deposit_received", { _deposit_id: id });
      if (error) throw error;
      toast.success("דמי ההשתתפות אושרו");
      setRows((rs) => rs.filter((r) => r.id !== id));
    } catch (e) {
      console.error("[confirm_deposit_received]", e);
      toast.error(e instanceof Error ? e.message : "האישור נכשל");
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <LoadingState />
      </MobileShell>
    );
  }

  const awaiting = rows.filter((r) => r.status === "awaiting_confirmation");
  const pending = rows.filter((r) => r.status === "pending");

  return (
    <MobileShell>
      <BackHeader title="פיקדונות" subtitle="אישור קבלת תשלום ידני" />

      <div className="px-5 pb-8 space-y-5">
        <section className="space-y-2">
          <h2 className="text-[14px] font-bold text-[#0F172A]">ממתינים לאישור ({awaiting.length})</h2>
          {awaiting.length === 0 ? (
            <div className="rounded-2xl bg-white border border-border p-5 text-center text-[13px] text-muted-foreground">
              אין פיקדונות שמחכים לאישור.
            </div>
          ) : (
            awaiting.map((r) => (
              <DepositCard key={r.id} row={r} onConfirm={confirm} confirming={confirmingId === r.id} />
            ))
          )}
        </section>

        {pending.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[14px] font-bold text-[#0F172A]">דיירים שטרם דיווחו על העברה ({pending.length})</h2>
            {pending.map((r) => (
              <DepositCard key={r.id} row={r} onConfirm={confirm} confirming={confirmingId === r.id} />
            ))}
          </section>
        )}
      </div>
    </MobileShell>
  );
}

function DepositCard({
  row,
  onConfirm,
  confirming,
}: {
  row: DepositRow;
  onConfirm: (id: string) => void;
  confirming: boolean;
}) {
  const isAwaiting = row.status === "awaiting_confirmation";
  return (
    <div className="rounded-2xl bg-white border border-border p-4 space-y-3 shadow-[0_2px_10px_-6px_rgba(10,31,61,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 text-right">
          <div className="text-[14px] font-bold text-[#0F172A] truncate">{row.deal_title ?? "עסקה"}</div>
          <div className="text-[12px] text-muted-foreground truncate mt-0.5">
            {row.resident_name ?? "דייר"} {row.resident_phone ? `· ${row.resident_phone}` : ""}
          </div>
        </div>
        <div className="text-left shrink-0">
          <div className="text-[16px] font-extrabold text-[#0F172A]">{ils(Number(row.amount))}</div>
          <div className="flex items-center gap-1 text-[10px] font-semibold mt-0.5 justify-end">
            {isAwaiting ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-[#0E6B5A]" />
                <span className="text-[#0E6B5A]">סומן שולם</span>
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 text-[#EA6A3A]" />
                <span className="text-[#EA6A3A]">ממתין</span>
              </>
            )}
          </div>
        </div>
      </div>

      {row.declared_payment_method && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {row.declared_payment_method === "bit" ? (
            <Smartphone className="h-3.5 w-3.5" />
          ) : (
            <Building2 className="h-3.5 w-3.5" />
          )}
          <span>אמצעי תשלום: {row.declared_payment_method === "bit" ? "ביט" : "העברה בנקאית"}</span>
        </div>
      )}

      <Button
        onClick={() => onConfirm(row.id)}
        disabled={confirming}
        className="w-full h-11 rounded-2xl bg-[#0E6B5A] hover:bg-[#0E6B5A]/95 text-white font-bold text-[13px]"
      >
        {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "אישור קבלה"}
      </Button>
    </div>
  );
}
