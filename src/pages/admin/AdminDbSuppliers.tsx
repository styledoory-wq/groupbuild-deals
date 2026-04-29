import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ImageIcon, ShieldCheck, Loader2, ExternalLink, Plus, Trash2, Search, CheckCircle2, XCircle, Pencil } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { supabase } from "@/integrations/supabase/client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
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
import { useRegions } from "@/hooks/useRegions";

interface Row {
  id: string;
  business_name: string;
  approval_status: string;
  is_active: boolean;
  logo_url: string | null;
  serves_all_country: boolean;
  short_description: string | null;
  phone: string | null;
  email: string | null;
  categories: string[];
  service_areas: string[];
  regionCount?: number;
  cityCount?: number;
}

interface NewForm {
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  short_description: string;
  description: string;
  website_url: string;
  whatsapp_url: string;
  instagram_url: string;
  facebook_url: string;
  logo_url: string;
  catalog_url: string;
  approval_status: "approved" | "pending" | "rejected";
  is_active: boolean;
  categoryIds: string[];
}

const emptyForm: NewForm = {
  business_name: "",
  contact_name: "",
  phone: "",
  email: "",
  short_description: "",
  description: "",
  website_url: "",
  whatsapp_url: "",
  instagram_url: "",
  facebook_url: "",
  logo_url: "",
  catalog_url: "",
  approval_status: "approved",
  is_active: true,
  categoryIds: [],
};

interface MatchProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  region: string | null;
  region_id: string | null;
  city_id: string | null;
}

export default function AdminDbSuppliers() {
  const navigate = useNavigate();
  const { categories } = useApp();
  const { regions, cities } = useRegions();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [areas, setAreas] = useState<AreasComboboxValue>({
    servesAllCountry: false,
    regionIds: [],
    cityIds: [],
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCatalog, setUploadingCatalog] = useState(false);

  // ---- Edit state ----
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NewForm>(emptyForm);
  const [editAreas, setEditAreas] = useState<AreasComboboxValue>({
    servesAllCountry: false,
    regionIds: [],
    cityIds: [],
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [uploadingEditLogo, setUploadingEditLogo] = useState(false);
  const [uploadingEditCatalog, setUploadingEditCatalog] = useState(false);

  const uploadEditFile = async (
    file: File,
    bucket: "supplier-logos" | "supplier-catalogs",
    setBusy: (v: boolean) => void,
    field: "logo_url" | "catalog_url",
  ) => {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setEditForm((f) => ({ ...f, [field]: data.publicUrl }));
      toast.success("הקובץ הועלה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = async (supplierId: string) => {
    setEditId(supplierId);
    setEditOpen(true);
    setEditLoading(true);
    try {
      const [{ data: s, error }, { data: sregs }, { data: scits }] = await Promise.all([
        supabase
          .from("suppliers")
          .select("*")
          .eq("id", supplierId)
          .single(),
        supabase.from("supplier_regions").select("region_id").eq("supplier_id", supplierId),
        supabase.from("supplier_cities").select("city_id").eq("supplier_id", supplierId),
      ]);
      if (error || !s) throw error ?? new Error("לא נמצא ספק");
      setEditForm({
        business_name: s.business_name ?? "",
        contact_name: s.contact_name ?? "",
        phone: s.phone ?? "",
        email: s.email ?? "",
        short_description: s.short_description ?? "",
        description: s.description ?? "",
        website_url: s.website_url ?? "",
        whatsapp_url: s.whatsapp_url ?? "",
        instagram_url: s.instagram_url ?? "",
        facebook_url: s.facebook_url ?? "",
        logo_url: s.logo_url ?? "",
        catalog_url: s.catalog_url ?? "",
        approval_status: (s.approval_status as NewForm["approval_status"]) ?? "pending",
        is_active: !!s.is_active,
        categoryIds: s.categories ?? [],
      });
      setEditAreas({
        servesAllCountry: !!s.serves_all_country,
        regionIds: (sregs ?? []).map((r) => r.region_id as string),
        cityIds: (scits ?? []).map((c) => c.city_id as string),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת הספק נכשלה");
      setEditOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editId) return;
    if (!editForm.business_name.trim()) {
      toast.error("שם עסק הוא שדה חובה");
      return;
    }
    if (editForm.categoryIds.length === 0) {
      toast.error("יש לבחור לפחות קטגוריה אחת");
      return;
    }
    if (!editAreas.servesAllCountry && editAreas.regionIds.length === 0 && editAreas.cityIds.length === 0) {
      toast.error("יש לבחור אזורי שירות (או 'כל הארץ')");
      return;
    }
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({
          business_name: editForm.business_name.trim(),
          contact_name: editForm.contact_name.trim() || null,
          phone: editForm.phone.trim() || null,
          email: editForm.email.trim() || null,
          short_description: editForm.short_description.trim() || null,
          description: editForm.description.trim() || null,
          website_url: editForm.website_url.trim() || null,
          whatsapp_url: editForm.whatsapp_url.trim() || null,
          instagram_url: editForm.instagram_url.trim() || null,
          facebook_url: editForm.facebook_url.trim() || null,
          logo_url: editForm.logo_url.trim() || null,
          catalog_url: editForm.catalog_url.trim() || null,
          serves_all_country: editAreas.servesAllCountry,
          service_areas: editAreas.servesAllCountry ? ["כל הארץ"] : [],
          approval_status: editForm.approval_status,
          is_active: editForm.is_active,
          categories: editForm.categoryIds,
        })
        .eq("id", editId);
      if (error) throw error;

      // Replace region/city links
      await Promise.all([
        supabase.from("supplier_regions").delete().eq("supplier_id", editId),
        supabase.from("supplier_cities").delete().eq("supplier_id", editId),
      ]);
      if (!editAreas.servesAllCountry) {
        if (editAreas.regionIds.length > 0) {
          await supabase.from("supplier_regions").insert(
            editAreas.regionIds.map((region_id) => ({ supplier_id: editId, region_id })),
          );
        }
        if (editAreas.cityIds.length > 0) {
          await supabase.from("supplier_cities").insert(
            editAreas.cityIds.map((city_id) => ({ supplier_id: editId, city_id })),
          );
        }
      }
      toast.success("הספק עודכן בהצלחה");
      setEditOpen(false);
      setEditId(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "עדכון נכשל");
    } finally {
      setEditSaving(false);
    }
  };


  const uploadFile = async (
    file: File,
    bucket: "supplier-logos" | "supplier-catalogs",
    setBusy: (v: boolean) => void,
    field: "logo_url" | "catalog_url",
  ) => {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setForm((f) => ({ ...f, [field]: data.publicUrl }));
      toast.success("הקובץ הועלה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  // Match-checker state
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchSupplier, setMatchSupplier] = useState<Row | null>(null);
  const [residents, setResidents] = useState<MatchProfile[]>([]);
  const [residentSearch, setResidentSearch] = useState("");
  const [selectedResident, setSelectedResident] = useState<MatchProfile | null>(null);
  const [matchResult, setMatchResult] = useState<{
    visible: boolean;
    reasons: string[];
  } | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id,business_name,approval_status,is_active,logo_url,serves_all_country,service_areas,short_description,phone,email,categories")
      .order("business_name");
    if (error) toast.error("שגיאה בטעינת ספקים");
    const base = (data as Row[]) ?? [];

    // Pull region/city counts in parallel
    const [{ data: regs }, { data: cits }] = await Promise.all([
      supabase.from("supplier_regions").select("supplier_id"),
      supabase.from("supplier_cities").select("supplier_id"),
    ]);
    const regCount = new Map<string, number>();
    const cityCount = new Map<string, number>();
    (regs ?? []).forEach((r: { supplier_id: string }) => regCount.set(r.supplier_id, (regCount.get(r.supplier_id) ?? 0) + 1));
    (cits ?? []).forEach((r: { supplier_id: string }) => cityCount.set(r.supplier_id, (cityCount.get(r.supplier_id) ?? 0) + 1));
    setRows(base.map((r) => ({ ...r, regionCount: regCount.get(r.id) ?? 0, cityCount: cityCount.get(r.id) ?? 0 })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.business_name.trim()) {
      toast.error("שם עסק הוא שדה חובה");
      return;
    }
    if (form.categoryIds.length === 0) {
      toast.error("יש לבחור לפחות קטגוריה אחת");
      return;
    }
    if (!areas.servesAllCountry && areas.regionIds.length === 0 && areas.cityIds.length === 0) {
      toast.error("יש לבחור אזורי שירות (או 'כל הארץ')");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          business_name: form.business_name.trim(),
          contact_name: form.contact_name.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          short_description: form.short_description.trim() || null,
          description: form.description.trim() || null,
          website_url: form.website_url.trim() || null,
          whatsapp_url: form.whatsapp_url.trim() || null,
          instagram_url: form.instagram_url.trim() || null,
          facebook_url: form.facebook_url.trim() || null,
          logo_url: form.logo_url.trim() || null,
          catalog_url: form.catalog_url.trim() || null,
          serves_all_country: areas.servesAllCountry,
          service_areas: areas.servesAllCountry ? ["כל הארץ"] : [],
          approval_status: form.approval_status,
          is_active: form.is_active,
          categories: form.categoryIds,
        })
        .select("id")
        .single();
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
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "יצירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", deleteId);
    if (error) toast.error("מחיקה נכשלה");
    else {
      toast.success("הספק נמחק");
      await load();
    }
    setDeleteId(null);
  };

  // ---- Match checker ----
  const openMatch = async (supplier: Row) => {
    setMatchSupplier(supplier);
    setMatchOpen(true);
    setSelectedResident(null);
    setMatchResult(null);
    setResidentSearch("");
    if (residents.length === 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email,city,region,region_id,city_id")
        .eq("user_type", "resident");
      setResidents((data as MatchProfile[]) ?? []);
    }
  };

  const runMatch = async (resident: MatchProfile) => {
    setSelectedResident(resident);
    if (!matchSupplier) return;
    const reasons: string[] = [];
    let visible = true;

    if (!matchSupplier.is_active) {
      visible = false;
      reasons.push("❌ הספק מסומן כלא פעיל (is_active = false)");
    }
    if (matchSupplier.approval_status !== "approved") {
      visible = false;
      reasons.push(`❌ סטטוס אישור = "${matchSupplier.approval_status}" (נדרש "approved")`);
    }
    if (!matchSupplier.categories || matchSupplier.categories.length === 0) {
      visible = false;
      reasons.push("❌ הספק אינו משויך לאף קטגוריה — לא יוצג בשום קטגוריה");
    } else {
      const catNames = matchSupplier.categories
        .map((cid) => categories.find((c) => c.id === cid)?.name ?? cid)
        .join(", ");
      reasons.push(`✅ משויך לקטגוריות: ${catNames}`);
    }

    // Area check
    if (matchSupplier.serves_all_country) {
      reasons.push("✅ ספק מוגדר 'כל הארץ' — יוצג לכל הדיירים");
    } else {
      // Resolve resident region/city ids
      let residentRegionId = resident.region_id;
      let residentCityId = resident.city_id;
      if (!residentRegionId && resident.region) {
        residentRegionId = regions.find((r) => r.slug === resident.region || r.name_he === resident.region)?.id ?? null;
      }
      if (!residentCityId && resident.city) {
        residentCityId = cities.find((c) => c.name_he === resident.city)?.id ?? null;
      }

      const [{ data: sregs }, { data: scits }] = await Promise.all([
        supabase.from("supplier_regions").select("region_id").eq("supplier_id", matchSupplier.id),
        supabase.from("supplier_cities").select("city_id").eq("supplier_id", matchSupplier.id),
      ]);
      const sRegionIds = new Set((sregs ?? []).map((x) => x.region_id));
      const sCityIds = new Set((scits ?? []).map((x) => x.city_id));

      if (sRegionIds.size === 0 && sCityIds.size === 0) {
        visible = false;
        reasons.push("❌ לא הוגדרו לספק אזורי שירות כלל ולא 'כל הארץ' — לא יוצג לאף דייר");
      } else {
        if (residentRegionId && sRegionIds.has(residentRegionId)) {
          reasons.push(`✅ אזור הדייר (${regions.find((r) => r.id === residentRegionId)?.name_he}) כלול באזורי השירות של הספק`);
        } else if (residentCityId && sCityIds.has(residentCityId)) {
          reasons.push(`✅ עיר הדייר (${cities.find((c) => c.id === residentCityId)?.name_he}) כלולה בערי השירות של הספק`);
        } else if (!residentRegionId && !residentCityId) {
          reasons.push("⚠️ לדייר אין אזור/עיר בפרופיל — הסינון 'כל האזורים' יראה אותו, אבל סינון ספציפי לא");
          visible = false;
        } else {
          visible = false;
          reasons.push(
            `❌ הדייר באזור "${regions.find((r) => r.id === residentRegionId)?.name_he ?? "—"}" / עיר "${cities.find((c) => c.id === residentCityId)?.name_he ?? "—"}" — אך הספק לא מכסה אזור/עיר זו`
          );
        }
      }
    }

    setMatchResult({ visible, reasons });
  };

  const filteredResidents = useMemo(() => {
    const q = residentSearch.trim().toLowerCase();
    if (!q) return residents.slice(0, 30);
    return residents
      .filter((r) =>
        (r.full_name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [residents, residentSearch]);

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
      <PageHeader title="ניהול ספקים" subtitle={`${rows.length} ספקים רשומים`} back />

      <div className="px-5 -mt-2 mb-4">
        <Button
          onClick={() => { setForm(emptyForm); setAreas({ servesAllCountry: false, regionIds: [], cityIds: [] }); setOpen(true); }}
          className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold"
        >
          <Plus className="h-4 w-4 ml-1.5" /> הוסף ספק חדש
        </Button>
      </div>

      <div className="px-5 space-y-3 pb-24">
        {rows.length === 0 && (
          <div className="gb-card p-6 text-center text-sm text-muted-foreground">
            אין ספקים רשומים עדיין. הוסף ספק חדש כדי להתחיל.
          </div>
        )}
        {rows.map((r) => {
          const catNames = r.categories?.map((cid) => categories.find((c) => c.id === cid)?.name).filter(Boolean) ?? [];
          const isNational = r.serves_all_country || r.service_areas?.includes("כל הארץ") || ((r.regionCount ?? 0) === 0 && (r.cityCount ?? 0) === 0);
          const noAreas = false;
          const noCats = !r.categories || r.categories.length === 0;
          const hidden = noAreas || noCats || !r.is_active || r.approval_status !== "approved";

          return (
            <div key={r.id} className="gb-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <SupplierLogo name={r.business_name} logoUrl={r.logo_url} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold truncate">{r.business_name}</h3>
                    {r.approval_status === "approved" && <ShieldCheck className="h-4 w-4 text-gold shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isNational ? "כל הארץ" : `${r.regionCount ?? 0} אזורים · ${r.cityCount ?? 0} ערים`} · {r.is_active ? "פעיל" : "לא פעיל"} · {r.approval_status}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    קטגוריות: {catNames.length ? catNames.join(", ") : <span className="text-destructive">אין</span>}
                  </p>
                  {hidden && (
                    <p className="text-[11px] text-destructive mt-1 font-bold flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      מוסתר מדיירים: {[
                        !r.is_active && "לא פעיל",
                        r.approval_status !== "approved" && "לא מאושר",
                        noCats && "אין קטגוריה",
                        noAreas && "אין אזורי שירות",
                      ].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setDeleteId(r.id)}
                  className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"
                  aria-label="מחק"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => openEdit(r.id)}
                className="w-full h-10 rounded-xl bg-gradient-gold text-primary text-sm font-bold flex items-center justify-center gap-1.5 shadow-gold"
              >
                <Pencil className="h-4 w-4" /> עריכת ספק
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(`/admin/suppliers/${r.id}/media`)}
                  className="h-9 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center gap-1"
                >
                  <ImageIcon className="h-3.5 w-3.5" /> מדיה
                </button>
                <button
                  onClick={() => navigate(`/admin/suppliers/${r.id}/areas`)}
                  className="h-9 rounded-xl bg-gold/10 text-primary border border-gold/30 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <MapPin className="h-3.5 w-3.5" /> אזורים
                </button>
                <button
                  onClick={() => openMatch(r)}
                  className="h-9 rounded-xl bg-primary/10 text-primary border border-primary/30 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Search className="h-3.5 w-3.5" /> בדוק התאמה
                </button>
                <button
                  onClick={() => navigate(`/suppliers/${r.id}`)}
                  className="h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> תצוגה
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
            <div>
              <Label>תיאור מלא</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="תיאור מפורט שיוצג בעמוד הספק" />
            </div>

            {/* Logo upload */}
            <div className="pt-2 border-t">
              <Label className="text-sm font-bold">לוגו</Label>
              <div className="flex items-center gap-3 mt-1.5">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="לוגו" className="h-14 w-14 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center text-[10px] text-muted-foreground">אין</div>
                )}
                <div className="flex-1 space-y-1.5">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFile(f, "supplier-logos", setUploadingLogo, "logo_url");
                    }}
                    className="text-xs"
                    disabled={uploadingLogo}
                  />
                  {form.logo_url && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}
                      className="text-[11px] text-destructive underline"
                    >
                      הסר לוגו
                    </button>
                  )}
                  {uploadingLogo && <p className="text-[11px] text-muted-foreground">מעלה...</p>}
                </div>
              </div>
            </div>

            {/* Catalog upload */}
            <div className="pt-2 border-t">
              <Label className="text-sm font-bold">קטלוג (PDF)</Label>
              <div className="space-y-1.5 mt-1.5">
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile(f, "supplier-catalogs", setUploadingCatalog, "catalog_url");
                  }}
                  className="text-xs"
                  disabled={uploadingCatalog}
                />
                {form.catalog_url && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted">
                    <a href={form.catalog_url} target="_blank" rel="noreferrer noopener" className="text-[11px] text-primary underline truncate">
                      צפייה בקטלוג שהועלה
                    </a>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, catalog_url: "" }))}
                      className="text-[11px] text-destructive underline shrink-0"
                    >
                      הסר
                    </button>
                  </div>
                )}
                {uploadingCatalog && <p className="text-[11px] text-muted-foreground">מעלה...</p>}
              </div>
            </div>

            {/* Links */}
            <div className="pt-2 border-t space-y-2">
              <Label className="text-sm font-bold">קישורים</Label>
              <div>
                <Label className="text-xs">אתר אינטרנט</Label>
                <Input dir="ltr" placeholder="https://" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">וואטסאפ (קישור wa.me)</Label>
                <Input dir="ltr" placeholder="https://wa.me/972..." value={form.whatsapp_url} onChange={(e) => setForm({ ...form, whatsapp_url: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">אינסטגרם</Label>
                <Input dir="ltr" placeholder="https://instagram.com/..." value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">פייסבוק</Label>
                <Input dir="ltr" placeholder="https://facebook.com/..." value={form.facebook_url} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} />
              </div>
            </div>

            {/* Categories — REQUIRED */}
            <div className="pt-2 border-t">
              <Label className="text-sm font-bold">קטגוריות *</Label>
              <p className="text-[11px] text-muted-foreground mb-2">בחר לפחות אחת — אחרת הספק לא יוצג לדיירים</p>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {categories.map((c) => {
                  const active = form.categoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm((f) => ({
                        ...f,
                        categoryIds: active
                          ? f.categoryIds.filter((x) => x !== c.id)
                          : [...f.categoryIds, c.id],
                      }))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-smooth ${
                        active
                          ? "bg-gold text-primary border-gold font-bold"
                          : "bg-card border-border text-foreground hover:border-gold/50"
                      }`}
                    >
                      {c.icon} {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t">
              <Label className="text-sm font-bold">אזורי שירות *</Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                חפש ובחר אזורים, ערים, או "כל הארץ"
              </p>
              <AreasCombobox value={areas} onChange={setAreas} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              פעיל
            </label>
            <div>
              <Label>סטטוס אישור</Label>
              <select
                value={form.approval_status}
                onChange={(e) => setForm({ ...form, approval_status: e.target.value as NewForm["approval_status"] })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="approved">מאושר</option>
                <option value="pending">ממתין</option>
                <option value="rejected">נדחה</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-gradient-gold text-primary font-bold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "צור ספק"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit supplier dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditId(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת ספק</DialogTitle>
          </DialogHeader>
          {editLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>שם עסק *</Label>
                <Input value={editForm.business_name} onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>שם בעל העסק</Label>
                  <Input value={editForm.contact_name} onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })} />
                </div>
                <div>
                  <Label>טלפון</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>אימייל</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <Label>תיאור קצר</Label>
                <Textarea rows={2} value={editForm.short_description} onChange={(e) => setEditForm({ ...editForm, short_description: e.target.value })} />
              </div>
              <div>
                <Label>תיאור מלא</Label>
                <Textarea rows={4} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>

              {/* Logo */}
              <div className="pt-2 border-t">
                <Label className="text-sm font-bold">לוגו</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  {editForm.logo_url ? (
                    <img src={editForm.logo_url} alt="לוגו" className="h-14 w-14 rounded-xl object-cover border border-border" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center text-[10px] text-muted-foreground">אין</div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadEditFile(f, "supplier-logos", setUploadingEditLogo, "logo_url");
                      }}
                      className="text-xs"
                      disabled={uploadingEditLogo}
                    />
                    {editForm.logo_url && (
                      <button type="button" onClick={() => setEditForm((f) => ({ ...f, logo_url: "" }))} className="text-[11px] text-destructive underline">
                        הסר לוגו
                      </button>
                    )}
                    {uploadingEditLogo && <p className="text-[11px] text-muted-foreground">מעלה...</p>}
                  </div>
                </div>
              </div>

              {/* Catalog */}
              <div className="pt-2 border-t">
                <Label className="text-sm font-bold">קטלוג (PDF)</Label>
                <div className="space-y-1.5 mt-1.5">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadEditFile(f, "supplier-catalogs", setUploadingEditCatalog, "catalog_url");
                    }}
                    className="text-xs"
                    disabled={uploadingEditCatalog}
                  />
                  {editForm.catalog_url && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted">
                      <a href={editForm.catalog_url} target="_blank" rel="noreferrer noopener" className="text-[11px] text-primary underline truncate">
                        צפייה בקטלוג שהועלה
                      </a>
                      <button type="button" onClick={() => setEditForm((f) => ({ ...f, catalog_url: "" }))} className="text-[11px] text-destructive underline shrink-0">
                        הסר
                      </button>
                    </div>
                  )}
                  {uploadingEditCatalog && <p className="text-[11px] text-muted-foreground">מעלה...</p>}
                </div>
              </div>

              {/* Links */}
              <div className="pt-2 border-t space-y-2">
                <Label className="text-sm font-bold">קישורים</Label>
                <div>
                  <Label className="text-xs">אתר אינטרנט</Label>
                  <Input dir="ltr" placeholder="https://" value={editForm.website_url} onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">וואטסאפ</Label>
                  <Input dir="ltr" placeholder="https://wa.me/972..." value={editForm.whatsapp_url} onChange={(e) => setEditForm({ ...editForm, whatsapp_url: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">אינסטגרם</Label>
                  <Input dir="ltr" placeholder="https://instagram.com/..." value={editForm.instagram_url} onChange={(e) => setEditForm({ ...editForm, instagram_url: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">פייסבוק</Label>
                  <Input dir="ltr" placeholder="https://facebook.com/..." value={editForm.facebook_url} onChange={(e) => setEditForm({ ...editForm, facebook_url: e.target.value })} />
                </div>
              </div>

              {/* Categories */}
              <div className="pt-2 border-t">
                <Label className="text-sm font-bold">קטגוריות *</Label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto mt-2">
                  {categories.map((c) => {
                    const active = editForm.categoryIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditForm((f) => ({
                          ...f,
                          categoryIds: active
                            ? f.categoryIds.filter((x) => x !== c.id)
                            : [...f.categoryIds, c.id],
                        }))}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-smooth ${
                          active ? "bg-gold text-primary border-gold font-bold" : "bg-card border-border text-foreground hover:border-gold/50"
                        }`}
                      >
                        {c.icon} {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Areas */}
              <div className="pt-2 border-t">
                <Label className="text-sm font-bold">אזורי שירות *</Label>
                <div className="mt-2">
                  <AreasCombobox value={editAreas} onChange={setEditAreas} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm pt-2 border-t">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                פעיל
              </label>
              <div>
                <Label>סטטוס אישור</Label>
                <select
                  value={editForm.approval_status}
                  onChange={(e) => setEditForm({ ...editForm, approval_status: e.target.value as NewForm["approval_status"] })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="approved">מאושר</option>
                  <option value="pending">ממתין</option>
                  <option value="rejected">נדחה</option>
                </select>
              </div>

              <p className="text-[11px] text-muted-foreground pt-2 border-t">
                💡 לניהול גלריית תמונות, סגרו את החלון ובחרו "מדיה" בכרטיס הספק.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>ביטול</Button>
            <Button onClick={handleEditSave} disabled={editSaving || editLoading} className="bg-gradient-gold text-primary font-bold">
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match checker dialog */}
      <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>בדוק התאמה לדייר</DialogTitle>
          </DialogHeader>
          {matchSupplier && (
            <div className="space-y-3">
              <div className="gb-card p-3 bg-muted/40">
                <p className="text-xs text-muted-foreground">בודק את הספק:</p>
                <p className="font-bold">{matchSupplier.business_name}</p>
              </div>

              <div>
                <Label>בחר דייר</Label>
                <Input
                  placeholder="חפש לפי שם / אימייל / עיר"
                  value={residentSearch}
                  onChange={(e) => setResidentSearch(e.target.value)}
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-1">
                {filteredResidents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">לא נמצאו דיירים</p>
                )}
                {filteredResidents.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => runMatch(r)}
                    className={`w-full text-right px-3 py-2 rounded-lg text-xs hover:bg-muted transition-smooth ${
                      selectedResident?.id === r.id ? "bg-gold/10 border border-gold/30" : ""
                    }`}
                  >
                    <div className="font-bold">{r.full_name ?? r.email ?? "ללא שם"}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {r.city ?? "—"} · {r.region ?? "ללא אזור"}
                    </div>
                  </button>
                ))}
              </div>

              {matchResult && selectedResident && (
                <div className={`gb-card p-4 space-y-2 ${matchResult.visible ? "border-green-500/40" : "border-destructive/40"}`}>
                  <div className="flex items-center gap-2">
                    {matchResult.visible ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <p className="font-bold text-sm">
                      {matchResult.visible
                        ? "הספק יוצג לדייר זה"
                        : "הספק לא יוצג לדייר זה"}
                    </p>
                  </div>
                  <ul className="text-xs space-y-1 leading-relaxed">
                    {matchResult.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchOpen(false)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את הספק?</AlertDialogTitle>
            <AlertDialogDescription>פעולה זו לא ניתנת לביטול.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
