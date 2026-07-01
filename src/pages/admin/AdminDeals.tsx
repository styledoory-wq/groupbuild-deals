import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminKpiRow } from "@/components/admin/AdminKpiRow";
import { LoadingState } from "@/components/ds";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { Search, ImageIcon, Plus, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { DealActionsMenu } from "@/components/deals/DealActionsMenu";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SmartImg } from "@/components/ui/SmartImg";

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
  { value: "pending", label: "ממתינה" },
  { value: "closed", label: "נסגרה" },
  { value: "redeemed", label: "מומשה" },
  { value: "inactive", label: "בטלה" },
  { value: "draft", label: "טיוטה" },
];

const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  active:   { label: "פעילה",   bg: "bg-[#DCFCE7]", text: "text-[#166534]" },
  pending:  { label: "בהמתנה",  bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  draft:    { label: "טיוטה",   bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  closed:   { label: "נסגרה",   bg: "bg-[#E0F2FE]", text: "text-[#075985]" },
  redeemed: { label: "מומשה",   bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]" },
  inactive: { label: "בטלה",    bg: "bg-[#FEE2E2]", text: "text-[#B91C1C]" },
};

const PAGE_SIZE = 12;

export default function AdminDeals() {
  const navigate = useNavigate();
  const { categories, projects } = useApp();
  const [deals, setDeals] = useState<DbDeal[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [allSuppliers, setAllSuppliers] = useState<{ id: string; business_name: string }[]>([]);
  const [counts, setCounts] = useState<Record<string, DealCounts>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSupplierId, setPickerSupplierId] = useState<string>("");
  const [pickerQuery, setPickerQuery] = useState("");

  useEffect(() => {
    supabase
      .from("suppliers")
      .select("id,business_name,approval_status")
      .eq("is_active", true)
      .order("business_name", { ascending: true })
      .then(({ data }) => {
        const rows = (data ?? []) as { id: string; business_name: string; approval_status: string }[];
        setAllSuppliers(rows.filter((s) => s.approval_status === "approved" || s.approval_status === "active"));
      });
  }, []);

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
  useEffect(() => { setPage(1); }, [query, projectFilter, supplierFilter, categoryFilter, statusFilter]);

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

  const totalPages = Math.max(1, Math.ceil(visibleDeals.length / PAGE_SIZE));
  const pageDeals = useMemo(
    () => visibleDeals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleDeals, page],
  );
  const rangeStart = visibleDeals.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, visibleDeals.length);

  return (
    <MobileShell>
      <AdminPageHeader
        title="ניהול הצעות"
        description={`${deals.length} הצעות`}
        actions={
          <button
            onClick={() => { setPickerSupplierId(""); setPickerQuery(""); setPickerOpen(true); }}
            className="h-9 px-3 rounded-[10px] bg-[#0E6B5A] text-white text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#0a574a] transition-colors"
          >
            <Plus className="h-4 w-4" /> הצעה חדשה
          </button>
        }
      />
      <AdminKpiRow
        items={[
          { label: "הצעות פעילות", value: kpi.active, tone: "positive" },
          { label: "פיקדונות שאספו", value: formatILS(kpi.deposits), tone: "positive" },
          { label: "הכנסות צפויות", value: formatILS(kpi.expected) },
          { label: "מצטרפים סהכ", value: kpi.participants.toLocaleString() },
          { label: "ממתינות לאישור", value: kpi.pending, tone: kpi.pending > 0 ? "warning" : "neutral" },
        ]}
      />

      {/* Filters */}
      <div dir="rtl" className="bg-white border-b border-[#ECEEF2] px-4 lg:px-8 py-2.5 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש הצעה, ספק או פרויקט…"
            className="h-9 pr-9 text-[13px] border-[#ECEEF2]"
          />
        </div>
        <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="סינון" options={STATUS_OPTIONS} />
        <FilterSelect value={projectFilter} onChange={setProjectFilter} placeholder="פרויקט"
          options={[{ value: "all", label: "כל הפרויקטים" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
        <FilterSelect value={supplierFilter} onChange={setSupplierFilter} placeholder="ספק"
          options={[{ value: "all", label: "כל הספקים" }, ...supplierOptions.map(([id, name]) => ({ value: id, label: name }))]} />
        <FilterSelect value={categoryFilter} onChange={setCategoryFilter} placeholder="קטגוריה"
          options={[{ value: "all", label: "כל הקטגוריות" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
      </div>

      <div className="p-3 lg:p-6">
        {loading ? (
          <LoadingState fullHeight={false} />
        ) : visibleDeals.length === 0 ? (
          <div className="bg-white border border-[#ECEEF2] rounded-[14px] px-6 py-12 text-center text-[13px] text-[#6B7280] font-medium">
            לא נמצאו הצעות התואמות לסינון
          </div>
        ) : (
          <div dir="rtl" className="bg-white border border-[#ECEEF2] rounded-[14px] overflow-hidden">
            {/* Header — desktop only */}
            <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_120px_110px_110px_110px_90px_44px] gap-3 px-4 py-2.5 border-b border-[#ECEEF2] bg-[#F8F9FB] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              <div>הצעה</div>
              <div>ספק</div>
              <div>פרויקט</div>
              <div>מצטרפים / יעד</div>
              <div>התקדמות</div>
              <div>פיקדונות</div>
              <div>הכנסה צפויה</div>
              <div>סטטוס</div>
              <div />
            </div>

            <ul className="divide-y divide-[#F1F3F7]">
              {pageDeals.map((d) => {
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
                  <li key={d.id} className="hover:bg-[#FAFBFC] transition-colors">
                    {/* Desktop row */}
                    <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_120px_110px_110px_110px_90px_44px] gap-3 px-4 py-2 items-center">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-[8px] overflow-hidden bg-[#F4F6FA] shrink-0">
                          {d.cover_image_url ? (
                            <SmartImg src={d.cover_image_url} size="thumb" alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-3.5 w-3.5 text-[#9CA3AF]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[13px] text-[#0F172A] truncate">{d.title}</div>
                          <div className="text-[11px] text-[#9CA3AF] truncate">{categoryName}</div>
                        </div>
                      </div>
                      <div className="text-[12px] text-[#0F172A] truncate">{supplierName}</div>
                      <div className="text-[12px] text-[#0F172A] truncate">{projectName}</div>
                      <div className="text-[12px] font-bold text-[#0F172A] tabular-nums">
                        {target ? `${c.paid} / ${target}` : c.paid}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="text-[12px] font-extrabold w-9 tabular-nums" style={{ color: pctTone }}>{target ? `${pct}%` : "—"}</div>
                        <div className="flex-1 h-1 rounded-full bg-[#F1F3F7] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${target ? pct : 0}%`, backgroundColor: pctTone }} />
                        </div>
                      </div>
                      <div className="text-[12px] font-extrabold text-[#0E6B5A] tabular-nums">{formatILS(c.deposits)}</div>
                      <div className="text-[12px] font-bold text-[#0F172A] tabular-nums">{formatILS(expected)}</div>
                      <div>
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap", meta.bg, meta.text)}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <DealActionsMenu dealId={d.id} status={d.status} onChanged={load} editPath={`/admin/offers/${d.id}/edit`} />
                      </div>
                    </div>

                    {/* Mobile row — ultra dense, ~64px */}
                    <div className="lg:hidden px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-[8px] overflow-hidden bg-[#F4F6FA] shrink-0">
                          {d.cover_image_url ? (
                            <SmartImg src={d.cover_image_url} size="thumb" alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-3.5 w-3.5 text-[#9CA3AF]" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="font-bold text-[12.5px] text-[#0F172A] truncate flex-1 min-w-0">{d.title}</div>
                            <span className={cn("shrink-0 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold whitespace-nowrap", meta.bg, meta.text)}>
                              {meta.label}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-[#6B7280] truncate mt-0.5">
                            {supplierName} <span className="text-[#D1D5DB]">·</span> {projectName}
                          </div>
                        </div>
                        <DealActionsMenu dealId={d.id} status={d.status} onChanged={load} editPath={`/admin/offers/${d.id}/edit`} />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 pr-[44px]">
                        <div className="flex-1 h-1 rounded-full bg-[#F1F3F7] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${target ? pct : 0}%`, backgroundColor: pctTone }} />
                        </div>
                        <span className="text-[10px] font-extrabold tabular-nums w-8 text-left" style={{ color: pctTone }}>
                          {target ? `${pct}%` : "—"}
                        </span>
                        <span className="text-[10.5px] font-bold tabular-nums text-[#0F172A] whitespace-nowrap">
                          {target ? `${c.paid}/${target}` : c.paid}
                        </span>
                        <span className="text-[#D1D5DB] text-[10px]">·</span>
                        <span className="text-[10.5px] font-extrabold tabular-nums text-[#0E6B5A] whitespace-nowrap">
                          {formatILS(c.deposits)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#ECEEF2] bg-[#FAFBFC] text-[12px] text-[#6B7280]">
              <div>הצגת {rangeStart}-{rangeEnd} מתוך {visibleDeals.length} הצעות</div>
              <div className="flex items-center gap-1">
                <PageBtn disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="הקודם">
                  <ChevronRight className="h-3.5 w-3.5" />
                </PageBtn>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const n = start + i;
                  if (n > totalPages) return null;
                  return (
                    <button key={n} onClick={() => setPage(n)}
                      className={cn(
                        "h-7 min-w-[28px] px-2 rounded-md text-[12px] font-bold transition-colors",
                        n === page ? "bg-[#0E6B5A] text-white" : "bg-white text-[#1F2937] border border-[#ECEEF2] hover:bg-[#F4F6FA]",
                      )}>
                      {n}
                    </button>
                  );
                })}
                <PageBtn disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="הבא">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </PageBtn>
              </div>
            </div>
          </div>
        )}
      </div>
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent dir="rtl" className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>הצעה חדשה — בחירת ספק</DialogTitle>
            <DialogDescription>בחר את הספק שעבורו תיווצר ההצעה.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="חיפוש ספק…"
              className="h-9 text-[13px]"
            />
            <div className="max-h-[320px] overflow-y-auto border border-[#ECEEF2] rounded-[10px] divide-y divide-[#F1F3F7]">
              {allSuppliers.length === 0 ? (
                <div className="px-3 py-6 text-center text-[12px] text-[#6B7280]">טוען ספקים…</div>
              ) : (
                allSuppliers
                  .filter((s) => !pickerQuery.trim() || s.business_name.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
                  .slice(0, 100)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setPickerSupplierId(s.id)}
                      className={cn(
                        "w-full text-right px-3 py-2 text-[13px] hover:bg-[#F4F6FA] transition-colors",
                        pickerSupplierId === s.id && "bg-[#E8F4F1] font-bold text-[#0E6B5A]",
                      )}
                    >
                      {s.business_name}
                    </button>
                  ))
              )}
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
            <Button
              disabled={!pickerSupplierId}
              onClick={() => {
                setPickerOpen(false);
                navigate(`/admin/offers/new?supplierId=${pickerSupplierId}`);
              }}
              className="bg-[#0E6B5A] hover:bg-[#0a574a] text-white"
            >
              המשך ליצירת הצעה
            </Button>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BottomNav role="admin" />
    </MobileShell>
  );
}


function PageBtn({ children, disabled, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-7 w-7 rounded-md bg-white border border-[#ECEEF2] flex items-center justify-center hover:bg-[#F4F6FA] disabled:opacity-40 disabled:cursor-not-allowed"
      {...rest}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  value, onChange, placeholder, options,
}: { value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[130px] text-[12px] border-[#ECEEF2] bg-white">
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
