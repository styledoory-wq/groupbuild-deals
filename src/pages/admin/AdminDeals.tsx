import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminTabsBar, type AdminTab } from "@/components/admin/AdminTabsBar";
import { LoadingState } from "@/components/ds";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ImageIcon, Inbox, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { DealActionsMenu } from "@/components/deals/DealActionsMenu";
import { Input } from "@/components/ui/input";
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

const statusMeta: Record<string, { label: string; cls: string; dot: string }> = {
  active:   { label: "פעילה",   cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  pending:  { label: "ממתינה",  cls: "bg-amber-50 text-amber-700",     dot: "bg-amber-500" },
  draft:    { label: "טיוטה",   cls: "bg-slate-100 text-slate-600",    dot: "bg-slate-400" },
  closed:   { label: "הסתיימה", cls: "bg-sky-50 text-sky-700",         dot: "bg-sky-500" },
  redeemed: { label: "מומשה",   cls: "bg-violet-50 text-violet-700",   dot: "bg-violet-500" },
  inactive: { label: "בוטלה",   cls: "bg-red-50 text-red-700",         dot: "bg-red-500" },
};

type TabKey = "all" | "active" | "draft" | "no_image" | "closed" | "inactive";
const VALID_TABS: TabKey[] = ["all", "active", "draft", "no_image", "closed", "inactive"];

export default function AdminDeals() {
  const navigate = useNavigate();
  const { categories, projects } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deals, setDeals] = useState<DbDeal[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [allSuppliers, setAllSuppliers] = useState<{ id: string; business_name: string }[]>([]);
  const [counts, setCounts] = useState<Record<string, DealCounts>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSupplierId, setPickerSupplierId] = useState<string>("");
  const [pickerQuery, setPickerQuery] = useState("");

  const urlTab = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey = urlTab && VALID_TABS.includes(urlTab) ? urlTab : "all";
  const setActiveTab = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === "all") next.delete("tab");
    else next.set("tab", key);
    setSearchParams(next, { replace: true });
  };

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
          .from("suppliers").select("id,business_name").in("id", supplierIds);
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

  const tabCounts = useMemo(() => ({
    all: deals.length,
    active: deals.filter((d) => d.status === "active").length,
    draft: deals.filter((d) => d.status === "draft" || d.status === "pending").length,
    no_image: deals.filter((d) => !d.cover_image_url).length,
    closed: deals.filter((d) => d.status === "closed" || d.status === "redeemed").length,
    inactive: deals.filter((d) => d.status === "inactive").length,
  }), [deals]);

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    let res = deals;
    if (activeTab === "active") res = res.filter((d) => d.status === "active");
    else if (activeTab === "draft") res = res.filter((d) => d.status === "draft" || d.status === "pending");
    else if (activeTab === "no_image") res = res.filter((d) => !d.cover_image_url);
    else if (activeTab === "closed") res = res.filter((d) => d.status === "closed" || d.status === "redeemed");
    else if (activeTab === "inactive") res = res.filter((d) => d.status === "inactive");
    if (q) {
      res = res.filter((d) => {
        const s = suppliers[d.supplier_id] ?? "";
        const p = projects.find((pr) => pr.id === d.project_id)?.name ?? "";
        return [d.title, s, p].some((v) => (v ?? "").toLowerCase().includes(q));
      });
    }
    return res;
  }, [deals, activeTab, query, suppliers, projects]);

  const priceFor = (d: DbDeal): number => {
    if (d.offer_type === "price_comparison" && d.discounted_price != null) return Number(d.discounted_price);
    if (d.offer_type === "percentage" && d.original_price != null && d.discount_percentage != null) {
      return Number(d.original_price) * (1 - Number(d.discount_percentage) / 100);
    }
    return Number(d.base_price ?? d.original_price ?? 0);
  };

  const tabs: AdminTab[] = [
    { key: "all", label: "כולן", count: tabCounts.all },
    { key: "active", label: "פעילות", count: tabCounts.active },
    { key: "draft", label: "טיוטות", count: tabCounts.draft },
    { key: "no_image", label: "ללא תמונה", count: tabCounts.no_image },
    { key: "closed", label: "הסתיימו", count: tabCounts.closed },
    { key: "inactive", label: "בוטלו", count: tabCounts.inactive },
  ];

  const emptyLabel: Record<TabKey, string> = {
    all: "אין הצעות עדיין.",
    active: "אין הצעות פעילות כרגע.",
    draft: "אין טיוטות ממתינות.",
    no_image: "כל ההצעות כוללות תמונת שער.",
    closed: "אין הצעות שהסתיימו.",
    inactive: "אין הצעות שבוטלו.",
  };

  return (
    <MobileShell>
      <div dir="rtl" className="min-h-screen bg-[#F7F8FA] pb-32">
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => navigate(-1)}
              aria-label="חזרה"
              className="h-9 w-9 -mr-1 rounded-full flex items-center justify-center text-[#0F172A]/70 hover:bg-white transition"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => { setPickerSupplierId(""); setPickerQuery(""); setPickerOpen(true); }}
              className="h-9 px-3.5 rounded-full bg-[#0F172A] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Plus className="h-4 w-4" />
              הצעה חדשה
            </button>
          </div>
          <h1 className="text-[26px] font-bold text-[#0F172A] tracking-tight leading-tight">
            הצעות
            <span className="ms-2 text-[15px] font-semibold text-[#8B94A3] tabular-nums">
              {tabCounts.all}
            </span>
          </h1>

          <div className="relative mt-4">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#8B94A3] pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי כותרת, ספק או פרויקט…"
              className="h-10 pr-9 text-[14px] rounded-xl bg-white border-[#EEF0F4] focus-visible:ring-1 focus-visible:ring-[#0F172A]/10"
            />
          </div>
        </header>

        {/* Tabs */}
        <div className="px-5 pb-3 overflow-x-auto scrollbar-none">
          <AdminTabsBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Grid */}
        <main className="px-4 pt-1">
          {loading ? (
            <LoadingState fullHeight={false} />
          ) : filteredDeals.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-white border border-[#EEF0F4] p-10 text-center flex flex-col items-center gap-2">
              <div className="h-11 w-11 rounded-full bg-[#F4F6FA] flex items-center justify-center">
                <Inbox className="h-5 w-5 text-[#8B94A3]" />
              </div>
              <p className="text-[14px] font-semibold text-[#0F172A]">
                {query ? "לא נמצאו הצעות תואמות" : emptyLabel[activeTab]}
              </p>
              {query && <p className="text-[12px] text-[#8B94A3]">נסה חיפוש אחר או בחר טאב אחר</p>}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {filteredDeals.map((d) => {
                const c = counts[d.id] ?? { paid: 0, deposits: 0 };
                const target = d.target_participants ?? 0;
                const pct = target > 0 ? Math.min(100, Math.round((c.paid / target) * 100)) : 0;
                const meta = statusMeta[d.status] ?? { label: d.status, cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
                const supplierName = suppliers[d.supplier_id] ?? "—";
                const categoryName = categories.find((cat) => cat.id === d.category_id)?.name ?? null;

                return (
                  <li key={d.id}>
                    <div className="group relative h-full bg-white rounded-2xl border border-[#EEF0F4] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 hover:border-[#E1E5EC] hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.15)] overflow-hidden">
                      {/* Cover */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/admin/offers/${d.id}/edit`)}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate(`/admin/offers/${d.id}/edit`); }}
                        className="relative w-full aspect-[4/3] bg-[#F4F6FA] block overflow-hidden cursor-pointer"
                        aria-label={`פתח ${d.title}`}
                      >
                        {d.cover_image_url ? (
                          <SmartImg src={d.cover_image_url} size="thumb" alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-[#CBD3DC]" />
                          </div>
                        )}
                        <span className={cn("absolute top-2 right-2 inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md shadow-sm", meta.cls)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                          {meta.label}
                        </span>
                        <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                          <DealActionsMenu dealId={d.id} status={d.status} onChanged={load} editPath={`/admin/offers/${d.id}/edit`} />
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-3 flex flex-col gap-1.5">
                        <button
                          onClick={() => navigate(`/admin/offers/${d.id}/edit`)}
                          className="text-right"
                        >
                          <h3 className="font-bold text-[13.5px] text-[#0F172A] leading-tight line-clamp-2 min-h-[2.2em]">
                            {d.title}
                          </h3>
                          <div className="mt-1 text-[11px] text-[#8B94A3] truncate">
                            {supplierName}
                            {categoryName && <> <span className="text-[#E5E7EB]">·</span> {categoryName}</>}
                          </div>
                        </button>

                        {/* Progress + metric */}
                        <div className="mt-1">
                          <div className="flex items-center justify-between text-[10.5px] mb-1">
                            <span className="font-semibold text-[#374151] tabular-nums">
                              {target ? `${c.paid}/${target} מצטרפים` : `${c.paid} מצטרפים`}
                            </span>
                            <span className="font-bold text-[#0E6B5A] tabular-nums">
                              {priceFor(d) > 0 ? formatILS(priceFor(d)) : "—"}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-[#F1F3F7] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#0E6B5A] transition-all"
                              style={{ width: `${target ? pct : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>

        {/* Supplier picker dialog */}
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
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
