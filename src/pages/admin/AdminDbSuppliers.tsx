import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Search, Phone, Calendar, MapPin, Eye } from "lucide-react";
import { computeCompleteness, type SupplierCompleteness } from "@/lib/supplierCompleteness";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AreasCombobox, type AreasComboboxValue } from "@/components/areas/AreasCombobox";
import { useApp } from "@/store/AppStore";

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
  created_at: string | null;
  dealsCount?: number;
  leadsCount?: number;
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

export default function AdminDbSuppliers() {
  const navigate = useNavigate();
  const { categories } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<"all" | "active" | "pending" | "no-deals" | "new" | "top">("all");

  // Create
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewForm>(emptyForm);
  const [areas, setAreas] = useState<AreasComboboxValue>({
    servesAllCountry: false, regionIds: [], cityIds: [],
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id,business_name,approval_status,is_active,logo_url,serves_all_country,service_areas,contact_name,phone,email,categories,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("שגיאה בטעינת ספקים");
    const base = (data as Row[]) ?? [];

    const [{ data: dls }, { data: ints }] = await Promise.all([
      supabase.from("deals").select("id,supplier_id,status,is_deleted"),
      supabase.from("deal_interests").select("deal_id,is_deleted"),
    ]);
    const dealsBySupplier = new Map<string, number>();
    const dealToSupplier = new Map<string, string>();
    (dls ?? []).forEach((d: { id: string; supplier_id: string; status: string; is_deleted: boolean }) => {
      dealToSupplier.set(d.id, d.supplier_id);
      if (d.status === "active" && !d.is_deleted) {
        dealsBySupplier.set(d.supplier_id, (dealsBySupplier.get(d.supplier_id) ?? 0) + 1);
      }
    });
    const leadsBySupplier = new Map<string, number>();
    (ints ?? []).forEach((i: { deal_id: string; is_deleted: boolean }) => {
      if (i.is_deleted) return;
      const sid = dealToSupplier.get(i.deal_id);
      if (!sid) return;
      leadsBySupplier.set(sid, (leadsBySupplier.get(sid) ?? 0) + 1);
    });

    setRows(base.map((r) => ({
      ...r,
      dealsCount: dealsBySupplier.get(r.id) ?? 0,
      leadsCount: leadsBySupplier.get(r.id) ?? 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.business_name.trim()) return toast.error("שם עסק הוא שדה חובה");
    if (form.categoryIds.length === 0) return toast.error("יש לבחור לפחות קטגוריה אחת");
    if (!areas.servesAllCountry && areas.regionIds.length === 0 && areas.cityIds.length === 0) {
      return toast.error("יש לבחור אזורי שירות (או 'כל הארץ')");
    }
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

  const filteredRows = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let res = !q ? rows : rows.filter((r) => {
      const catNames = r.categories?.map((cid) => categories.find((c) => c.id === cid)?.name ?? "").join(" ") ?? "";
      return [r.business_name, r.email, r.phone, catNames].some((v) => (v ?? "").toLowerCase().includes(q));
    });
    if (quickFilter === "active") res = res.filter((r) => r.is_active && r.approval_status === "approved");
    else if (quickFilter === "pending") res = res.filter((r) => r.approval_status === "pending");
    else if (quickFilter === "no-deals") res = res.filter((r) => (r.dealsCount ?? 0) === 0);
    else if (quickFilter === "new") res = res.filter((r) => r.created_at && new Date(r.created_at).getTime() >= sevenDaysAgo);
    else if (quickFilter === "top") res = [...res].sort((a, b) => (b.leadsCount ?? 0) - (a.leadsCount ?? 0)).filter((r) => (r.leadsCount ?? 0) > 0);
    return res;
  }, [rows, supplierSearch, quickFilter, categories]);

  const pendingCount = rows.filter((r) => r.approval_status === "pending").length;

  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <PageHeader title="ניהול ספקים" subtitle={`${rows.length} ספקים · ${pendingCount} ממתינים`} back />

      <div className="px-4 -mt-2 mb-3 space-y-2.5">
        <div className="relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={supplierSearch}
            onChange={(e) => setSupplierSearch(e.target.value)}
            placeholder="חיפוש ספק…"
            className="h-9 pr-9 text-fs-sm rounded-xl"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 scrollbar-none">
          {([
            ["all", `הכל (${rows.length})`],
            ["pending", `ממתינים (${pendingCount})`],
            ["active", "פעילים"],
            ["no-deals", "ללא הצעות"],
            ["new", "חדשים"],
            ["top", "מובילים"],
          ] as const).map(([k, lbl]) => {
            const active = quickFilter === k;
            return (
              <button
                key={k}
                onClick={() => setQuickFilter(k)}
                className={
                  "shrink-0 h-7 px-3 rounded-full text-fs-xs font-bold border transition-all " +
                  (active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-[#0E6B5A]/40")
                }
              >
                {lbl}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-32">
        {filteredRows.length === 0 ? (
          <div className="gb-card p-6 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? "אין ספקים רשומים עדיין." : "לא נמצאו ספקים תואמים"}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredRows.map((r) => (
              <SupplierGridCard key={r.id} row={r} onOpen={() => navigate(`/admin/suppliers/${r.id}`)} categories={categories} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setForm(emptyForm); setAreas({ servesAllCountry: false, regionIds: [], cityIds: [] }); setOpen(true); }}
        className="fixed z-40 left-5 bottom-24 h-14 w-14 rounded-full bg-[#0E6B5A] text-white shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)] flex items-center justify-center active:scale-95 transition-transform"
        aria-label="הוסף ספק חדש"
      >
        <Plus className="h-6 w-6" strokeWidth={2.6} />
      </button>

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
              <Label className="text-sm font-bold">קטגוריות *</Label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto mt-2">
                {categories.map((c) => {
                  const active = form.categoryIds.includes(c.id);
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setForm((f) => ({
                        ...f,
                        categoryIds: active ? f.categoryIds.filter((x) => x !== c.id) : [...f.categoryIds, c.id],
                      }))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-smooth ${active ? "bg-[#0E6B5A] text-white border-[#1F2937] font-bold" : "bg-card border-border text-foreground hover:border-[#0E6B5A]/50"}`}>
                      {c.icon} {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t">
              <Label className="text-sm font-bold">אזורי שירות *</Label>
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
            <p className="text-fs-xs text-muted-foreground">
              💡 פרטים נוספים (לוגו, קטלוג, קישורים, חיוב) — לאחר יצירה, במסך הפרטים של הספק.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-[#0E6B5A] text-white font-bold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "צור ספק"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function SupplierGridCard({ row, onOpen, categories }: {
  row: Row;
  onOpen: () => void;
  categories: { id: string; name: string; icon: string }[];
}) {
  const isNational = row.serves_all_country || row.service_areas?.includes("כל הארץ");
  const rejected = row.approval_status === "rejected";
  const blocked = !row.is_active;
  const pending = row.approval_status === "pending";
  const approved = row.approval_status === "approved" && row.is_active;
  const statusBadge = rejected
    ? { emoji: "🔴", label: "נדחה", cls: "bg-red-50 text-red-700 border-red-200" }
    : blocked
    ? { emoji: "⚫", label: "חסום", cls: "bg-neutral-100 text-neutral-700 border-neutral-200" }
    : pending
    ? { emoji: "🟡", label: "ממתין", cls: "bg-amber-50 text-amber-800 border-amber-200" }
    : approved
    ? { emoji: "🟢", label: "פעיל", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    : { emoji: "⚪", label: "לא פעיל", cls: "bg-muted text-muted-foreground border-border" };

  const primaryCategory = row.categories?.[0]
    ? categories.find((c) => c.id === row.categories[0])?.name ?? null
    : null;
  const extraCategories = Math.max(0, (row.categories?.length ?? 0) - 1);
  const areaLabel = isNational ? "כל הארץ" : row.service_areas?.[0] ?? "—";
  const missing: string[] = [];
  if (!row.phone) missing.push("טלפון");
  if (!row.categories || row.categories.length === 0) missing.push("תחום");
  if (!isNational && (!row.service_areas || row.service_areas.length === 0)) missing.push("אזור");

  const created = row.created_at ? new Date(row.created_at) : null;
  const createdLabel = created
    ? created.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" })
    : "—";

  return (
    <button
      onClick={onOpen}
      className="gb-card p-3 text-right flex flex-col gap-2 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${statusBadge.cls}`}>
          <span aria-hidden>{statusBadge.emoji}</span>
          {statusBadge.label}
        </span>
        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
          <Calendar className="h-2.5 w-2.5" />
          {createdLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <SupplierLogo name={row.business_name} logoUrl={row.logo_url} size="sm" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-fs-sm truncate leading-tight">{row.business_name}</h3>
          <p className="text-fs-xs text-primary font-semibold truncate">
            {primaryCategory ?? <span className="text-amber-700">ללא תחום</span>}
            {extraCategories > 0 && ` +${extraCategories}`}
          </p>
        </div>
      </div>

      <div className="grid gap-1 text-fs-xs text-foreground/85">
        <div className="flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate">{areaLabel}</span>
        </div>
        {row.phone && (
          <div className="flex items-center gap-1 truncate">
            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate" dir="ltr">{row.phone}</span>
          </div>
        )}
      </div>

      {missing.length > 0 && (
        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold self-start">
          ⚠️ חסר: {missing.join(" · ")}
        </div>
      )}

      <div
        className={
          "mt-1 h-8 rounded-lg text-fs-xs font-bold flex items-center justify-center gap-1 " +
          (pending
            ? "bg-amber-500 text-white"
            : "bg-muted text-foreground")
        }
      >
        <Eye className="h-3.5 w-3.5" />
        {pending ? "בדיקה" : "פתח פרטים"}
      </div>
    </button>
  );
}
