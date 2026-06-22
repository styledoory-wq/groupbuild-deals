import { useCallback, useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminKpiRow } from "@/components/admin/AdminKpiRow";
import { LoadingState } from "@/components/ds";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, ImageIcon, Lock, Users, Wallet, Building2, Tag,
  TrendingUp, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { DealActionsMenu } from "@/components/deals/DealActionsMenu";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  active:   { label: "פעילה",   bg: "bg-[#DCFCE7]", text: "text-[#166534]" },
  closed:   { label: "נסגרה",   bg: "bg-[#E0F2FE]", text: "text-[#075985]" },
  redeemed: { label: "מומשה",   bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]" },
  draft:    { label: "טיוטה",   bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  pending:  { label: "ממתינה",  bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  inactive: { label: "מושבתת",  bg: "bg-[#F3F4F6]", text: "text-[#374151]" },
};

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
    let participants = 0, deposits = 0, expected = 0;
    deals.forEach((d) => {
      const c = counts[d.id];
      if (!c) return;
      participants += c.paid;
      deposits += c.deposits;
      expected += c.paid * priceFor(d);
    });
    return { active, pending, participants, deposits, expected };
  }, [deals, counts]);

  return (
    <MobileShell>
      <AdminPageHeader
        title="ניהול הצעות"
        description={`${visibleDeals.length} מוצגות מתוך ${deals.length}`}
      />
      <AdminKpiRow
        items={[
          { label: "פעילות", value: kpi.active, tone: "positive" },
          { label: "ממתינות", value: kpi.pending, tone: kpi.pending > 0 ? "warning" : "neutral" },
          { label: "מצטרפים", value: kpi.participants },
          { label: "פיקדונות", value: formatILS(kpi.deposits), tone: "positive" },
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

      <div className="p-3 lg:p-6">
        {loading ? (
          <LoadingState fullHeight={false} />
        ) : visibleDeals.length === 0 ? (
          <div className="bg-white border border-[#ECEEF2] rounded-[14px] px-6 py-12 text-center text-[13px] text-[#6B7280] font-medium">
            לא נמצאו הצעות התואמות לסינון
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleDeals.map((d) => {
              const c = counts[d.id] ?? { paid: 0, deposits: 0 };
              const target = d.target_participants ?? 0;
              const pct = target > 0 ? Math.min(100, Math.round((c.paid / target) * 100)) : 0;
              const pctTone = pct >= 80 ? "#0E6B5A" : pct >= 40 ? "#0E6B5A" : pct > 0 ? "#D97706" : "#9CA3AF";
              const meta = statusMeta[d.status] ?? { label: d.status, bg: "bg-[#F3F4F6]", text: "text-[#374151]" };
              const supplierName = suppliers[d.supplier_id] ?? "—";
              const projectName = projects.find((p) => p.id === d.project_id)?.name ?? "—";
              const categoryName = categories.find((cat) => cat.id === d.category_id)?.name ?? "—";
              const expected = c.paid * priceFor(d);

              return (
                <article
                  key={d.id}
                  dir="rtl"
                  className="bg-white border border-[#ECEEF2] rounded-[14px] overflow-hidden flex flex-col hover:shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] hover:border-[#0E6B5A]/30 transition-all"
                >
                  {/* Cover */}
                  <div className="relative h-32 bg-[#F4F6FA] overflow-hidden">
                    {d.cover_image_url ? (
                      <img src={d.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-[#9CA3AF]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

                    {/* Status pill */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", meta.bg, meta.text)}>
                        {meta.label}
                      </span>
                      {d.auto_closed_at && (
                        <span className="px-1.5 py-0.5 rounded-full bg-white/95 text-[#B45309] text-[10px] font-bold flex items-center gap-0.5">
                          <Lock className="h-2.5 w-2.5" /> נעולה
                        </span>
                      )}
                    </div>

                    {/* Category chip */}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-full bg-white/95 text-[#0F172A] text-[10px] font-bold">
                        {categoryName}
                      </span>
                    </div>

                    {/* Title overlay */}
                    <div className="absolute bottom-2 right-2.5 left-2.5 text-white">
                      <h3 className="font-extrabold text-[15px] leading-tight line-clamp-1">{d.title}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] opacity-90 mt-0.5">
                        <Tag className="h-3 w-3" />
                        <span className="truncate">{supplierName}</span>
                      </div>
                    </div>

                    {/* Actions menu */}
                    <div className="absolute bottom-2 left-2" onClick={(e) => e.stopPropagation()}>
                      <div className="bg-white/95 rounded-full">
                        <DealActionsMenu dealId={d.id} status={d.status} onChanged={load} />
                      </div>
                    </div>
                  </div>

                  {/* Project chip */}
                  <div className="px-3 pt-2.5 pb-1">
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7280]">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{projectName}</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="px-3 pt-1">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#6B7280] tracking-wide">
                        <Users className="h-3 w-3" /> מצטרפים
                      </span>
                      <span className="text-[12px] font-extrabold" style={{ color: pctTone }}>
                        {c.paid}{target ? `/${target}` : ""}{target ? ` · ${pct}%` : ""}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#F1F3F7] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${target > 0 ? pct : 0}%`, backgroundColor: pctTone }} />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-1.5 px-3 pt-3 pb-3">
                    <div className="rounded-[10px] bg-gradient-to-l from-[#0E6B5A]/10 to-[#0E6B5A]/3 border border-[#0E6B5A]/15 px-2.5 py-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-[#0E6B5A]">
                        <Wallet className="h-3 w-3" /> פיקדונות
                      </div>
                      <div className="text-[14px] font-extrabold text-[#0E6B5A] leading-tight mt-0.5">
                        {formatILS(c.deposits)}
                      </div>
                    </div>
                    <div className="rounded-[10px] bg-[#F8F9FB] px-2.5 py-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-[#6B7280]">
                        <TrendingUp className="h-3 w-3" /> צפי הכנסה
                      </div>
                      <div className="text-[14px] font-extrabold text-[#0F172A] leading-tight mt-0.5">
                        {formatILS(expected)}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
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
