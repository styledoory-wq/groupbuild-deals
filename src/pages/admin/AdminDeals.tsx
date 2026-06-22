import { useCallback, useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminKpiRow } from "@/components/admin/AdminKpiRow";
import { AdminTable, StatusPill, type Column } from "@/components/admin/AdminTable";
import { LoadingState } from "@/components/ds";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { Search, ImageIcon, Lock } from "lucide-react";
import { toast } from "sonner";
import { DealActionsMenu } from "@/components/deals/DealActionsMenu";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type DbDeal = {
  id: string;
  title: string;
  status: string;
  category_id: string | null;
  supplier_id: string;
  project_id: string | null;
  cover_image_url: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  offer_type: string | null;
  target_participants: number | null;
  auto_closed_at: string | null;
  deposit_amount: number;
};

type DealCounts = { paid: number; deposits: number };

const STATUS_OPTIONS = [
  { value: "all", label: "כל הסטטוסים" },
  { value: "active", label: "פעילה" },
  { value: "closed", label: "נסגרה" },
  { value: "redeemed", label: "מומשה" },
  { value: "inactive", label: "מושבתת" },
  { value: "draft", label: "טיוטה" },
];

export default function AdminDeals() {
  const { categories, projects } = useApp();
  const [deals, setDeals] = useState<DbDeal[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, DealCounts>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deals")
        .select("id,title,status,category_id,supplier_id,project_id,cover_image_url,original_price,discounted_price,discount_percentage,base_price,offer_type,target_participants,auto_closed_at,deposit_amount")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as DbDeal[];
      setDeals(list);

      const supplierIds = Array.from(new Set(list.map((d) => d.supplier_id))).filter(Boolean);
      if (supplierIds.length) {
        const { data: srows } = await supabase
          .from("suppliers")
          .select("id,business_name")
          .in("id", supplierIds);
        const m: Record<string, string> = {};
        (srows ?? []).forEach((s: { id: string; business_name: string }) => { m[s.id] = s.business_name; });
        setSuppliers(m);
      }

      // Fetch all paid deposits in one query and aggregate locally — much faster
      const dealIds = list.map((d) => d.id);
      const { data: deps } = await supabase
        .from("deposits")
        .select("deal_id,amount")
        .in("deal_id", dealIds)
        .eq("status", "paid")
        .eq("is_deleted", false);
      const c: Record<string, DealCounts> = {};
      list.forEach((d) => { c[d.id] = { paid: 0, deposits: 0 }; });
      (deps ?? []).forEach((d: { deal_id: string; amount: number }) => {
        if (!c[d.deal_id]) c[d.deal_id] = { paid: 0, deposits: 0 };
        c[d.deal_id].paid += 1;
        c[d.deal_id].deposits += Number(d.amount ?? 0);
      });
      setCounts(c);
    } catch (err) {
      console.error("[AdminDeals]", err);
      toast.error(err instanceof Error ? err.message : "טעינת ההצעות נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const supplierOptions = useMemo(
    () => Object.entries(suppliers).sort((a, b) => a[1].localeCompare(b[1], "he")),
    [suppliers],
  );

  const visibleDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (projectFilter !== "all" && d.project_id !== projectFilter) return false;
      if (supplierFilter !== "all" && d.supplier_id !== supplierFilter) return false;
      if (categoryFilter !== "all" && d.category_id !== categoryFilter) return false;
      if (q) {
        const supplier = suppliers[d.supplier_id] ?? "";
        const project = projects.find((p) => p.id === d.project_id)?.name ?? "";
        if (![d.title, supplier, project].some((s) => (s ?? "").toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [deals, query, statusFilter, projectFilter, supplierFilter, categoryFilter, suppliers, projects]);

  const priceFor = (d: DbDeal): number => {
    if (d.offer_type === "price_comparison" && d.discounted_price != null) return Number(d.discounted_price);
    if (d.offer_type === "percentage" && d.original_price != null && d.discount_percentage != null) {
      return Number(d.original_price) * (1 - Number(d.discount_percentage) / 100);
    }
    return Number(d.base_price ?? d.original_price ?? 0);
  };

  const kpi = useMemo(() => {
    const active = deals.filter((d) => d.status === "active").length;
    const pending = deals.filter((d) => d.status === "draft" || d.status === "pending").length;
    let participants = 0;
    let deposits = 0;
    let expected = 0;
    deals.forEach((d) => {
      const c = counts[d.id];
      if (!c) return;
      participants += c.paid;
      deposits += c.deposits;
      expected += c.paid * priceFor(d);
    });
    return { active, pending, participants, deposits, expected };
  }, [deals, counts]);

  const statusPill = (d: DbDeal) => {
    if (d.status === "closed" || d.auto_closed_at) return <StatusPill tone="positive">נסגרה</StatusPill>;
    if (d.status === "redeemed") return <StatusPill tone="positive">מומשה</StatusPill>;
    if (d.status === "active") return <StatusPill tone="positive">פעילה</StatusPill>;
    if (d.status === "draft" || d.status === "pending") return <StatusPill tone="warning">ממתינה</StatusPill>;
    return <StatusPill tone="neutral">{d.status}</StatusPill>;
  };

  const columns: Column<DbDeal>[] = [
    {
      key: "deal",
      header: "הצעה",
      width: "30%",
      cell: (d) => (
        <div className="flex items-center gap-3 min-w-0">
          {d.cover_image_url ? (
            <img src={d.cover_image_url} alt="" className="h-10 w-10 rounded-[10px] object-cover bg-[#F4F6FA] shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-[10px] bg-[#F4F6FA] flex items-center justify-center shrink-0">
              <ImageIcon className="h-4 w-4 text-[#9CA3AF]" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-[13px] truncate flex items-center gap-1.5">
              {d.title}
              {d.auto_closed_at && <Lock className="h-3 w-3 text-[#B45309]" />}
            </div>
            <div className="text-[11px] text-[#9CA3AF] truncate">
              {categories.find((c) => c.id === d.category_id)?.name ?? "—"}
            </div>
          </div>
        </div>
      ),
    },
    { key: "supplier", header: "ספק", cell: (d) => <span className="text-[12px] text-[#1F2937] truncate block">{suppliers[d.supplier_id] ?? "—"}</span> },
    { key: "project", header: "פרויקט", cell: (d) => <span className="text-[12px] text-[#6B7280] truncate block">{projects.find((p) => p.id === d.project_id)?.name ?? "—"}</span> },
    {
      key: "progress",
      header: "מצטרפים / יעד",
      cell: (d) => {
        const c = counts[d.id] ?? { paid: 0, deposits: 0 };
        const target = d.target_participants ?? 0;
        const pct = target > 0 ? Math.min(100, Math.round((c.paid / target) * 100)) : 0;
        return (
          <div className="min-w-[120px]">
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="font-bold text-[#0F172A]">{c.paid}{target ? `/${target}` : ""}</span>
              {target > 0 && <span className="text-[11px] text-[#6B7280]">{pct}%</span>}
            </div>
            {target > 0 && (
              <div className="mt-1 h-1.5 rounded-full bg-[#F1F3F7] overflow-hidden">
                <div className="h-full bg-[#0E6B5A]" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        );
      },
    },
    { key: "deposits", header: "פיקדונות", cell: (d) => <span className="text-[12px] font-bold text-[#0E6B5A]">{formatILS(counts[d.id]?.deposits ?? 0)}</span> },
    { key: "status", header: "סטטוס", cell: (d) => statusPill(d) },
    {
      key: "actions",
      header: "",
      width: "48px",
      cell: (d) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DealActionsMenu dealId={d.id} status={d.status} onChanged={load} />
        </div>
      ),
    },
  ];

  return (
    <MobileShell>
      <AdminPageHeader
        title="ניהול הצעות"
        description={`${visibleDeals.length} מוצגות מתוך ${deals.length}`}
      />
      <AdminKpiRow
        items={[
          { label: "פעילות", value: kpi.active, tone: "positive" },
          { label: "ממתינות לאישור", value: kpi.pending, tone: kpi.pending > 0 ? "warning" : "neutral" },
          { label: "סה״כ מצטרפים", value: kpi.participants },
          { label: "פיקדונות שנאספו", value: formatILS(kpi.deposits), tone: "positive" },
          { label: "הכנסה צפויה", value: formatILS(kpi.expected) },
        ]}
      />

      {/* Filters */}
      <div dir="rtl" className="bg-white border-b border-[#ECEEF2] px-5 lg:px-8 py-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם הצעה, ספק או פרויקט"
            className="h-9 pr-9 text-[13px] border-[#ECEEF2]"
          />
        </div>
        <FilterSelect value={projectFilter} onChange={setProjectFilter} placeholder="פרויקט"
          options={[{ value: "all", label: "כל הפרויקטים" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
        <FilterSelect value={supplierFilter} onChange={setSupplierFilter} placeholder="ספק"
          options={[{ value: "all", label: "כל הספקים" }, ...supplierOptions.map(([id, name]) => ({ value: id, label: name }))]} />
        <FilterSelect value={categoryFilter} onChange={setCategoryFilter} placeholder="קטגוריה"
          options={[{ value: "all", label: "כל הקטגוריות" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="סטטוס" options={STATUS_OPTIONS} />
      </div>

      <div className="p-5 lg:p-8">
        {loading ? <LoadingState fullHeight={false} /> : (
          <AdminTable columns={columns} rows={visibleDeals} empty="לא נמצאו הצעות התואמות לסינון" />
        )}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}

function FilterSelect({
  value, onChange, placeholder, options,
}: { value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[140px] text-[12px] border-[#ECEEF2] bg-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white z-50 max-h-[300px]">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[12px]">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
