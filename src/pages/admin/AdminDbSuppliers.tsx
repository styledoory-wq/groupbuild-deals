import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader2, Plus, Search, MoreHorizontal, Eye, Pencil, Check, X, Pause, Trash2, Inbox, MapPin,
} from "lucide-react";
import { CategoryMultiPicker } from "@/components/categories/CategoryMultiPicker";
import { computeCompleteness, type SupplierCompleteness } from "@/lib/supplierCompleteness";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { AdminTabsBar, type AdminTab } from "@/components/admin/AdminTabsBar";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AreasCombobox, type AreasComboboxValue } from "@/components/areas/AreasCombobox";
import { useApp } from "@/store/AppStore";
import { ArrowRight } from "lucide-react";

interface Row {
  id: string;
  business_name: string;
  approval_status: string;
  is_active: boolean;
  logo_url: string | null;
  serves_all_country: boolean;
  service_areas: string[];
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  categories: string[];
  short_description: string | null;
  description: string | null;
  created_at: string | null;
  completeness?: SupplierCompleteness;
}

interface NewForm {
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  short_description: string;
  categoryIds: string[];
  approval_status: "approved" | "pending" | "rejected";
  is_active: boolean;
}

const emptyForm: NewForm = {
  business_name: "", contact_name: "", phone: "", email: "",
  short_description: "", categoryIds: [],
  approval_status: "pending", is_active: true,
};

type TabKey = "all" | "active" | "pending" | "rejected" | "new";
const VALID_TABS: TabKey[] = ["all", "active", "pending", "rejected", "new"];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function AdminDbSuppliers() {
  const navigate = useNavigate();
  const { categories } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);

  const urlTab = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey = urlTab && VALID_TABS.includes(urlTab) ? urlTab : "all";

  const setActiveTab = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === "all") next.delete("tab");
    else next.set("tab", key);
    setSearchParams(next, { replace: true });
  };

  // Create dialog state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewForm>(emptyForm);
  const [areas, setAreas] = useState<AreasComboboxValue>({
    servesAllCountry: false, regionIds: [], cityIds: [],
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id,business_name,approval_status,is_active,logo_url,serves_all_country,service_areas,contact_name,phone,email,categories,short_description,description,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("שגיאה בטעינת ספקים");
    const base = (data as Row[]) ?? [];

    const [{ data: regs }, { data: cits }] = await Promise.all([
      supabase.from("supplier_regions").select("supplier_id"),
      supabase.from("supplier_cities").select("supplier_id"),
    ]);
    const regionsBySupplier = new Map<string, number>();
    (regs ?? []).forEach((r: { supplier_id: string }) => {
      regionsBySupplier.set(r.supplier_id, (regionsBySupplier.get(r.supplier_id) ?? 0) + 1);
    });
    const citiesBySupplier = new Map<string, number>();
    (cits ?? []).forEach((c: { supplier_id: string }) => {
      citiesBySupplier.set(c.supplier_id, (citiesBySupplier.get(c.supplier_id) ?? 0) + 1);
    });

    setRows(base.map((r) => ({
      ...r,
      completeness: computeCompleteness({
        business_name: r.business_name,
        phone: r.phone,
        email: r.email,
        categories: r.categories,
        serves_all_country: r.serves_all_country,
        regionsCount: regionsBySupplier.get(r.id) ?? 0,
        citiesCount: citiesBySupplier.get(r.id) ?? 0,
        short_description: r.short_description,
        description: r.description,
      }),
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.business_name.trim()) return toast.error("שם עסק הוא שדה חובה");
    setSaving(true);
    try {
      const { data, error } = await supabase.from("suppliers").insert({
        business_name: form.business_name.trim(),
        contact_name: form.contact_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        short_description: form.short_description.trim() || null,
        serves_all_country: areas.servesAllCountry,
        service_areas: areas.servesAllCountry ? ["כל הארץ"] : [],
        approval_status: form.approval_status,
        is_active: form.is_active,
        categories: form.categoryIds,
      }).select("id").single();
      if (error) throw error;
      const newId = data?.id;
      if (newId && !areas.servesAllCountry) {
        if (areas.regionIds.length > 0) {
          await supabase.from("supplier_regions").insert(
            areas.regionIds.map((region_id) => ({ supplier_id: newId, region_id }))
          );
        }
        if (areas.cityIds.length > 0) {
          await supabase.from("supplier_cities").insert(
            areas.cityIds.map((city_id) => ({ supplier_id: newId, city_id }))
          );
        }
      }
      toast.success("הספק נוצר בהצלחה");
      setOpen(false);
      setForm(emptyForm);
      setAreas({ servesAllCountry: false, regionIds: [], cityIds: [] });
      if (newId) navigate(`/admin/suppliers/${newId}`);
      else await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "יצירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  // Quick actions
  const patchRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const doApprove = async (r: Row) => {
    const prev = { approval_status: r.approval_status, is_active: r.is_active };
    patchRow(r.id, { approval_status: "approved", is_active: true });
    const { error } = await supabase.from("suppliers")
      .update({ approval_status: "approved", is_active: true }).eq("id", r.id);
    if (error) { patchRow(r.id, prev); toast.error("אישור נכשל"); }
    else toast.success(`${r.business_name} אושר`);
  };
  const doReject = async (r: Row) => {
    const prev = { approval_status: r.approval_status };
    patchRow(r.id, { approval_status: "rejected" });
    const { error } = await supabase.from("suppliers")
      .update({ approval_status: "rejected" }).eq("id", r.id);
    if (error) { patchRow(r.id, prev); toast.error("דחייה נכשלה"); }
    else toast.success(`${r.business_name} נדחה`);
  };
  const doSuspend = async (r: Row) => {
    const prev = { is_active: r.is_active };
    patchRow(r.id, { is_active: !r.is_active });
    const { error } = await supabase.from("suppliers")
      .update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { patchRow(r.id, prev); toast.error("פעולה נכשלה"); }
    else toast.success(!r.is_active ? "הופעל" : "הושעה");
  };
  const doDelete = async (r: Row) => {
    const backup = rows;
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    const { error } = await supabase.from("suppliers").delete().eq("id", r.id);
    if (error) { setRows(backup); toast.error("מחיקה נכשלה"); }
    else toast.success(`${r.business_name} נמחק`);
    setConfirmDelete(null);
  };

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      all: rows.length,
      active: rows.filter((r) => r.is_active && r.approval_status === "approved").length,
      pending: rows.filter((r) => r.approval_status === "pending").length,
      rejected: rows.filter((r) => r.approval_status === "rejected").length,
      new: rows.filter((r) => r.created_at && new Date(r.created_at).getTime() >= now - WEEK_MS).length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    const now = Date.now();
    let res = rows;
    if (activeTab === "active") res = res.filter((r) => r.is_active && r.approval_status === "approved");
    else if (activeTab === "pending") res = res.filter((r) => r.approval_status === "pending");
    else if (activeTab === "rejected") res = res.filter((r) => r.approval_status === "rejected");
    else if (activeTab === "new") res = res.filter((r) => r.created_at && new Date(r.created_at).getTime() >= now - WEEK_MS);
    if (q) {
      res = res.filter((r) => {
        const catNames = r.categories?.map((cid) => categories.find((c) => c.id === cid)?.name ?? "").join(" ") ?? "";
        return [r.business_name, r.email, r.phone, catNames].some((v) => (v ?? "").toLowerCase().includes(q));
      });
    }
    return res;
  }, [rows, supplierSearch, activeTab, categories]);

  const tabs: AdminTab[] = [
    { key: "all", label: "כולם", count: counts.all },
    { key: "active", label: "פעילים", count: counts.active },
    { key: "pending", label: "ממתינים", count: counts.pending },
    { key: "rejected", label: "נדחו", count: counts.rejected },
    { key: "new", label: "חדשים", count: counts.new },
  ];

  const emptyLabel: Record<TabKey, string> = {
    all: "אין ספקים רשומים עדיין.",
    active: "אין ספקים פעילים כרגע.",
    pending: "אין ספקים הממתינים לאישור.",
    rejected: "אין ספקים שנדחו.",
    new: "לא נוספו ספקים חדשים השבוע.",
  };

  return (
    <MobileShell>
      <div dir="rtl" className="min-h-screen bg-[#F7F8FA] pb-32">
        {/* Header — clean, not sticky */}
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
              onClick={() => { setForm(emptyForm); setAreas({ servesAllCountry: false, regionIds: [], cityIds: [] }); setOpen(true); }}
              className="h-9 px-3.5 rounded-full bg-[#0F172A] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Plus className="h-4 w-4" />
              הוסף ספק
            </button>
          </div>
          <h1 className="text-[26px] font-bold text-[#0F172A] tracking-tight leading-tight">
            ספקים
            <span className="ms-2 text-[15px] font-semibold text-[#8B94A3] tabular-nums">
              {counts.all}
            </span>
          </h1>

          <div className="relative mt-4">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#8B94A3] pointer-events-none" />
            <Input
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              placeholder="חיפוש לפי שם, תחום, טלפון…"
              className="h-10 pr-9 text-[14px] rounded-xl bg-white border-[#EEF0F4] focus-visible:ring-1 focus-visible:ring-[#0F172A]/10"
            />
          </div>
        </header>

        {/* Tabs — small, clean, scrollable horizontally */}
        <div className="px-5 pb-3 overflow-x-auto scrollbar-none">
          <AdminTabsBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* List */}
        <main className="px-4 pt-1">
          {loading ? (
            <div className="min-h-[40vh] flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#8B94A3]" />
            </div>
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title={supplierSearch ? "לא נמצאו ספקים תואמים" : emptyLabel[activeTab]}
              hint={supplierSearch ? "נסה חיפוש אחר או בחר טאב אחר" : undefined}
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {filteredRows.map((r) => (
                <SupplierTile
                  key={r.id}
                  row={r}
                  categories={categories}
                  onOpen={() => navigate(`/admin/suppliers/${r.id}`)}
                  onEdit={() => navigate(`/admin/suppliers/${r.id}`)}
                  onApprove={() => doApprove(r)}
                  onReject={() => doReject(r)}
                  onToggleActive={() => doSuspend(r)}
                  onDelete={() => setConfirmDelete(r)}
                />
              ))}
            </ul>

          )}
        </main>

        {/* Create dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>ספק חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>שם עסק *</Label>
                <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>איש קשר</Label>
                  <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div>
                  <Label>טלפון</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>אימייל</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>תיאור קצר</Label>
                <Textarea rows={2} value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
              </div>
              <div className="pt-2 border-t">
                <Label className="text-sm font-bold">קטגוריות</Label>
                <p className="text-fs-xs text-muted-foreground mt-1 mb-2">אופציונלי — אפשר להשלים בהמשך</p>
                <CategoryMultiPicker
                  categories={categories}
                  value={form.categoryIds}
                  onChange={(next) => setForm((f) => ({ ...f, categoryIds: next }))}
                />
              </div>
              <div className="pt-2 border-t">
                <Label className="text-sm font-bold">אזורי שירות</Label>
                <p className="text-fs-xs text-muted-foreground mt-1 mb-2">אופציונלי — אפשר להשלים בהמשך</p>
                <div className="mt-2">
                  <AreasCombobox value={areas} onChange={setAreas} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm pt-2 border-t">
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 accent-primary" />
                פעיל
              </label>
              <div>
                <Label>סטטוס אישור</Label>
                <select value={form.approval_status}
                  onChange={(e) => setForm({ ...form, approval_status: e.target.value as NewForm["approval_status"] })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="approved">מאושר</option>
                  <option value="pending">ממתין</option>
                  <option value="rejected">נדחה</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-[#0E6B5A] text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "צור ספק"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>למחוק את הספק?</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו תמחק את <b>{confirmDelete?.business_name}</b> לצמיתות. לא ניתן לשחזר.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => confirmDelete && doDelete(confirmDelete)}
              >
                מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

/* ---------- Row (compact square card, refined) ---------- */

function SupplierRow({
  row, categories, onOpen, onEdit, onApprove, onReject, onToggleActive, onDelete,
}: {
  row: Row;
  categories: { id: string; name: string; icon: string }[];
  onOpen: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const isPending = row.approval_status === "pending";
  const isRejected = row.approval_status === "rejected";
  const isBlocked = !row.is_active && row.approval_status !== "rejected";
  const isNational = row.serves_all_country || row.service_areas?.includes("כל הארץ");

  const primaryCategory = row.categories?.[0]
    ? categories.find((c) => c.id === row.categories[0])?.name ?? null
    : null;
  const areaLabel = isNational ? "כל הארץ" : row.service_areas?.[0] ?? "—";
  const created = row.created_at ? new Date(row.created_at) : null;
  const joinLabel = created
    ? created.toLocaleDateString("he-IL", { day: "2-digit", month: "short", year: "2-digit" })
    : "—";

  const statusPill = isRejected
    ? { label: "נדחה", cls: "bg-red-50 text-red-700", dot: "bg-red-500" }
    : isPending
      ? { label: "ממתין", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" }
      : isBlocked
        ? { label: "מושהה", cls: "bg-neutral-100 text-neutral-600", dot: "bg-neutral-400" }
        : { label: "פעיל", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };

  return (
    <li>
      <div
        className={`group relative overflow-hidden bg-white rounded-2xl border ${
          isPending ? "border-amber-100" : "border-[#EEF0F4]"
        } shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 hover:border-[#E1E5EC] hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]`}
      >
        {isPending && row.completeness && (
          <div className="absolute top-0 right-0 left-0 h-[3px] bg-amber-50">
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${row.completeness.percent}%` }}
            />
          </div>
        )}

        <div className="p-3.5 flex items-center gap-3">
          <button onClick={onOpen} className="shrink-0" aria-label={`פתח ${row.business_name}`}>
            <SupplierLogo name={row.business_name} logoUrl={row.logo_url} size="md" />
          </button>

          <button onClick={onOpen} className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-bold text-[14.5px] text-[#0F172A] leading-tight truncate">
                {row.business_name}
              </h3>
              <span className={`shrink-0 inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md ${statusPill.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusPill.dot}`} />
                {statusPill.label}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2.5 text-[11.5px] text-[#8B94A3] min-w-0">
              <span className="truncate">
                {primaryCategory ?? <span className="text-amber-700">ללא תחום</span>}
              </span>
              <span className="text-[#E5E7EB]">·</span>
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{areaLabel}</span>
              </span>
              {!isPending && (
                <>
                  <span className="text-[#E5E7EB]">·</span>
                  <span className="tabular-nums shrink-0">{joinLabel}</span>
                </>
              )}
              {isPending && row.completeness && (
                <>
                  <span className="text-[#E5E7EB]">·</span>
                  <span className="tabular-nums font-semibold text-amber-700 shrink-0">{row.completeness.percent}%</span>
                </>
              )}
            </div>
          </button>

          {isPending ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onApprove}
                aria-label="אישור"
                className="h-9 w-9 rounded-xl bg-[#0E6B5A] text-white inline-flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(14,107,90,0.4)] active:scale-95 transition-transform"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={onReject}
                aria-label="דחייה"
                className="h-9 w-9 rounded-xl bg-white border border-[#EEF0F4] text-[#6B7280] inline-flex items-center justify-center hover:text-red-600 hover:border-red-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
              <RowMenu
                onOpen={onOpen}
                onEdit={onEdit}
                onApprove={onApprove}
                onReject={onReject}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
                isActive={row.is_active}
                isRejected={isRejected}
              />
            </div>
          ) : (
            <RowMenu
              onOpen={onOpen}
              onEdit={onEdit}
              onApprove={onApprove}
              onReject={onReject}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
              isActive={row.is_active}
              isRejected={isRejected}
            />
          )}
        </div>
      </div>
    </li>
  );
}



function RowMenu({
  onOpen, onEdit, onApprove, onReject, onToggleActive, onDelete, isActive, isRejected,
}: {
  onOpen: () => void; onEdit: () => void; onApprove: () => void; onReject: () => void;
  onToggleActive: () => void; onDelete: () => void; isActive: boolean; isRejected: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-8 w-8 shrink-0 rounded-lg text-[#8B94A3] hover:bg-[#F4F6FA] hover:text-[#0F172A] transition inline-flex items-center justify-center"
          aria-label="פעולות"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onOpen}>
          <Eye className="h-4 w-4 me-2" /> צפייה בפרופיל
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4 me-2" /> עריכה
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isRejected ? (
          <DropdownMenuItem onClick={onApprove}>
            <Check className="h-4 w-4 me-2 text-emerald-600" /> אישור
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={onApprove}>
              <Check className="h-4 w-4 me-2 text-emerald-600" /> אישור
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReject}>
              <X className="h-4 w-4 me-2 text-red-600" /> דחייה
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleActive}>
              <Pause className="h-4 w-4 me-2" /> {isActive ? "השעיה" : "הפעלה"}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4 me-2" /> מחיקה
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------- Empty ---------- */

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mt-8 rounded-2xl bg-white border border-[#EEF0F4] p-10 text-center flex flex-col items-center gap-2">
      <div className="h-11 w-11 rounded-full bg-[#F4F6FA] flex items-center justify-center">
        <Inbox className="h-5 w-5 text-[#8B94A3]" />
      </div>
      <p className="text-[14px] font-semibold text-[#0F172A]">{title}</p>
      {hint && <p className="text-[12px] text-[#8B94A3]">{hint}</p>}
    </div>
  );
}
