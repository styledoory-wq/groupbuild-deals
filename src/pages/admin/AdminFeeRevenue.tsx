import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminKpiRow } from "@/components/admin/AdminKpiRow";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatILS } from "@/store/AppStore";
import { toast } from "sonner";

type FeeRow = {
  id: string;
  deal_id: string;
  supplier_id: string | null;
  user_id: string;
  amount: number;
  platform_fee_amount: number | null;
  deal_price_snapshot: number | null;
  status: string;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
  payment_kind: string;
};

type DealMap = Record<string, { title: string; supplier_id: string | null }>;
type SupplierMap = Record<string, { business_name: string }>;

export default function AdminFeeRevenue() {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [deals, setDeals] = useState<DealMap>({});
  const [suppliers, setSuppliers] = useState<SupplierMap>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "deal" | "supplier" | "month">("overview");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deposits")
        .select(
          "id,deal_id,supplier_id,user_id,amount,platform_fee_amount,deal_price_snapshot,status,paid_at,refunded_at,created_at,payment_kind",
        )
        .eq("is_deleted", false)
        .eq("payment_kind" as never, "participation_fee" as never)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as unknown as FeeRow[];
      setRows(list);

      const dealIds = [...new Set(list.map((r) => r.deal_id).filter(Boolean))];
      const { data: dealRows } = dealIds.length
        ? await supabase.from("deals").select("id,title,supplier_id").in("id", dealIds)
        : { data: [] as { id: string; title: string; supplier_id: string | null }[] };
      const dmap: DealMap = {};
      (dealRows ?? []).forEach((d) => {
        dmap[d.id] = { title: d.title, supplier_id: d.supplier_id };
      });
      setDeals(dmap);

      const supplierIds = [
        ...new Set(
          [
            ...list.map((r) => r.supplier_id),
            ...Object.values(dmap).map((d) => d.supplier_id),
          ].filter(Boolean) as string[],
        ),
      ];
      const { data: supRows } = supplierIds.length
        ? await supabase.from("suppliers").select("id,business_name").in("id", supplierIds)
        : { data: [] as { id: string; business_name: string }[] };
      const smap: SupplierMap = {};
      (supRows ?? []).forEach((s) => {
        smap[s.id] = { business_name: s.business_name };
      });
      setSuppliers(smap);
    } catch (e) {
      console.error("[AdminFeeRevenue]", e);
      toast.error(e instanceof Error ? e.message : "טעינת דוחות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const feeOf = (r: FeeRow) => Number(r.platform_fee_amount ?? r.amount ?? 0);

  const paidRows = useMemo(
    () => rows.filter((r) => r.status === "paid"),
    [rows],
  );
  const totalCollected = paidRows.reduce((s, r) => s + feeOf(r), 0);
  const totalRefunded = rows
    .filter((r) => r.status === "refunded")
    .reduce((s, r) => s + feeOf(r), 0);
  const pendingCount = rows.filter((r) => r.status === "pending" || r.status === "awaiting_confirmation").length;

  const byDeal = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of paidRows) {
      map.set(r.deal_id, (map.get(r.deal_id) ?? 0) + feeOf(r));
    }
    return [...map.entries()]
      .map(([dealId, total]) => ({
        dealId,
        title: deals[dealId]?.title ?? "עסקה שנמחקה",
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [paidRows, deals]);

  const bySupplier = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of paidRows) {
      const sid = r.supplier_id || deals[r.deal_id]?.supplier_id || "unknown";
      map.set(sid, (map.get(sid) ?? 0) + feeOf(r));
    }
    return [...map.entries()]
      .map(([supplierId, total]) => ({
        supplierId,
        name: suppliers[supplierId]?.business_name ?? "ספק לא ידוע",
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [paidRows, deals, suppliers]);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of paidRows) {
      const d = new Date(r.paid_at ?? r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + feeOf(r));
    }
    return [...map.entries()]
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [paidRows]);

  const refund = async (id: string) => {
    if (!confirm("להחזיר את דמי ההשתתפות? הסטטוס יסומן כהוחזר.")) return;
    setBusyId(id);
    try {
      const { error } = await supabase
        .from("deposits")
        .update({ status: "refunded", refunded_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("דמי ההשתתפות סומנו כהוחזרו");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "החזר נכשל");
    } finally {
      setBusyId(null);
    }
  };

  const tabs = [
    { key: "overview" as const, label: "סקירה" },
    { key: "deal" as const, label: "לפי עסקה" },
    { key: "supplier" as const, label: "לפי ספק" },
    { key: "month" as const, label: "לפי חודש" },
  ];

  return (
    <MobileShell>
      <AdminPageHeader
        title="הכנסות מדמי השתתפות"
        description="סך גבייה, פילוח לפי עסקה / ספק / חודש, והחזרים"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} className="rounded-xl">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        }
      />

      <AdminKpiRow
        items={[
          { label: "סך שנגבו", value: formatILS(totalCollected), tone: "positive" },
          { label: "הוחזרו", value: formatILS(totalRefunded), tone: "neutral" },
          { label: "ממתינים", value: pendingCount.toLocaleString("he-IL"), tone: "warning" },
          { label: "תשלומים ששולמו", value: paidRows.length.toLocaleString("he-IL") },
        ]}
      />

      <div className="px-5 lg:px-8 py-4 space-y-4 max-w-4xl" dir="rtl">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                "px-3 h-8 rounded-full text-[12px] font-bold transition-colors " +
                (tab === t.key ? "bg-[#0E6B5A] text-white" : "bg-muted text-muted-foreground")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#0E6B5A]" />
          </div>
        ) : tab === "overview" ? (
          <div className="space-y-2">
            {rows.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-10">אין עדיין דמי השתתפות</div>
            )}
            {rows.map((r) => (
              <div key={r.id} className="bg-white border border-[#ECEEF2] rounded-[14px] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-extrabold text-[14px] truncate">
                      {deals[r.deal_id]?.title ?? "עסקה שנמחקה"}
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">
                      {r.status === "paid"
                        ? `שולם ${r.paid_at ? new Date(r.paid_at).toLocaleDateString("he-IL") : ""}`
                        : r.status === "refunded"
                          ? `הוחזר ${r.refunded_at ? new Date(r.refunded_at).toLocaleDateString("he-IL") : ""}`
                          : "ממתין לתשלום"}
                      {r.deal_price_snapshot != null
                        ? ` · מחיר עסקה ${formatILS(Number(r.deal_price_snapshot))}`
                        : ""}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="font-extrabold text-[#0E6B5A]">{formatILS(feeOf(r))}</div>
                  </div>
                </div>
                {(r.status === "paid" || r.status === "pending" || r.status === "awaiting_confirmation") && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyId === r.id}
                    onClick={() => void refund(r.id)}
                    className="mt-3 w-full h-9 rounded-xl text-xs font-bold"
                  >
                    {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "החזר תשלום"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : tab === "deal" ? (
          <ReportList
            items={byDeal.map((x) => ({ key: x.dealId, title: x.title, total: x.total }))}
            empty="אין הכנסות לפי עסקה"
          />
        ) : tab === "supplier" ? (
          <ReportList
            items={bySupplier.map((x) => ({ key: x.supplierId, title: x.name, total: x.total }))}
            empty="אין הכנסות לפי ספק"
          />
        ) : (
          <ReportList
            items={byMonth.map((x) => ({
              key: x.month,
              title: new Date(`${x.month}-01`).toLocaleDateString("he-IL", {
                year: "numeric",
                month: "long",
              }),
              total: x.total,
            }))}
            empty="אין הכנסות חודשיות"
          />
        )}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}

function ReportList({
  items,
  empty,
}: {
  items: Array<{ key: string; title: string; total: number }>;
  empty: string;
}) {
  if (!items.length) {
    return <div className="text-sm text-muted-foreground text-center py-10">{empty}</div>;
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="bg-white border border-[#ECEEF2] rounded-[14px] px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="font-bold text-[13px] truncate">{item.title}</div>
          <div className="font-extrabold text-[#0E6B5A] shrink-0">{formatILS(item.total)}</div>
        </div>
      ))}
    </div>
  );
}
