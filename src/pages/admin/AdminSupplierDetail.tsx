import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight, MapPin, ImageIcon, Loader2, ExternalLink, Trash2, CheckCircle2, XCircle,
  Target, Phone, Mail, User as UserIcon, Calendar, Tag, Check, X, Pencil,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { supabase } from "@/integrations/supabase/client";
import { resizeToPreset } from "@/lib/imageResize";
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
import { CategoryMultiPicker } from "@/components/categories/CategoryMultiPicker";
import { useApp } from "@/store/AppStore";
import { useRegions } from "@/hooks/useRegions";
import { computeCompleteness } from "@/lib/supplierCompleteness";
import {
  openWhatsAppTo,
  supplierCompletionReminderMessage,
  supplierWelcomeMessage,
} from "@/lib/whatsappMessages";

interface EditForm {
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
  commission_percent: string;
  monthly_subscription: string;
  billing_status: "none" | "active" | "trial" | "suspended";
  billing_notes: string;
}

interface MatchProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  region: string | null;
  region_id: string | null;
  city_id: string | null;
}

const empty: EditForm = {
  business_name: "", contact_name: "", phone: "", email: "",
  short_description: "", description: "",
  website_url: "", whatsapp_url: "", instagram_url: "", facebook_url: "",
  logo_url: "", catalog_url: "",
  approval_status: "pending", is_active: true, categoryIds: [],
  commission_percent: "", monthly_subscription: "", billing_status: "none", billing_notes: "",
};

export default function AdminSupplierDetail() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const { categories } = useApp();
  const { regions, cities } = useRegions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm>(empty);
  const [prevApproval, setPrevApproval] = useState<string>("pending");
  const [areas, setAreas] = useState<AreasComboboxValue>({
    servesAllCountry: false, regionIds: [], cityIds: [],
  });
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCatalog, setUploadingCatalog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Match state
  const [matchOpen, setMatchOpen] = useState(false);
  const [residents, setResidents] = useState<MatchProfile[]>([]);
  const [residentSearch, setResidentSearch] = useState("");
  const [selectedResident, setSelectedResident] = useState<MatchProfile | null>(null);
  const [matchResult, setMatchResult] = useState<{ visible: boolean; reasons: string[] } | null>(null);

  const load = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const [{ data: s, error }, { data: sregs }, { data: scits }, { data: billing }] = await Promise.all([
        supabase.from("suppliers")
          .select("business_name,contact_name,phone,email,short_description,description,website_url,whatsapp_url,instagram_url,facebook_url,logo_url,catalog_url,approval_status,is_active,categories,serves_all_country,created_at")
          .eq("id", supplierId).single(),
        supabase.from("supplier_regions").select("region_id").eq("supplier_id", supplierId),
        supabase.from("supplier_cities").select("city_id").eq("supplier_id", supplierId),
        supabase.rpc("admin_get_supplier_billing", { _supplier_id: supplierId }),
      ]);
      if (error || !s) throw error ?? new Error("לא נמצא ספק");
      const b = (billing && billing[0]) || { commission_percent: null, monthly_subscription: null, billing_status: null, billing_notes: null };
      setForm({
        business_name: s.business_name ?? "", contact_name: s.contact_name ?? "",
        phone: s.phone ?? "", email: s.email ?? "",
        short_description: s.short_description ?? "", description: s.description ?? "",
        website_url: s.website_url ?? "", whatsapp_url: s.whatsapp_url ?? "",
        instagram_url: s.instagram_url ?? "", facebook_url: s.facebook_url ?? "",
        logo_url: s.logo_url ?? "", catalog_url: s.catalog_url ?? "",
        approval_status: (s.approval_status as EditForm["approval_status"]) ?? "pending",
        is_active: !!s.is_active,
        categoryIds: s.categories ?? [],
        commission_percent: b.commission_percent != null ? String(b.commission_percent) : "",
        monthly_subscription: b.monthly_subscription != null ? String(b.monthly_subscription) : "",
        billing_status: ((b.billing_status as EditForm["billing_status"]) ?? "none"),
        billing_notes: b.billing_notes ?? "",
      });
      setPrevApproval((s.approval_status as string) ?? "pending");
      setCreatedAt(s.created_at ?? null);
      setAreas({
        servesAllCountry: !!s.serves_all_country,
        regionIds: (sregs ?? []).map((r) => r.region_id as string),
        cityIds: (scits ?? []).map((c) => c.city_id as string),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת הספק נכשלה");
      navigate("/admin/suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [supplierId]);

  const uploadFile = async (
    file: File, bucket: "supplier-logos" | "supplier-catalogs",
    setBusy: (v: boolean) => void, field: "logo_url" | "catalog_url",
  ) => {
    setBusy(true);
    try {
      const isImage = bucket === "supplier-logos";
      const processed = isImage ? await resizeToPreset(file, "logo") : file;
      const ext = isImage
        ? (processed.type === "image/webp" ? "webp" : "jpg")
        : (file.name.split(".").pop() ?? "bin");
      const path = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, processed, {
        cacheControl: "31536000", upsert: false, contentType: processed.type || undefined,
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

  const save = async () => {
    if (!supplierId) return;
    if (!form.business_name.trim()) return toast.error("שם עסק הוא שדה חובה");
    if (form.categoryIds.length === 0) return toast.error("יש לבחור לפחות קטגוריה אחת");
    if (!areas.servesAllCountry && areas.regionIds.length === 0 && areas.cityIds.length === 0) {
      return toast.error("יש לבחור אזורי שירות (או 'כל הארץ')");
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("suppliers").update({
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
        commission_percent: form.commission_percent.trim() === "" ? 0 : Number(form.commission_percent),
        monthly_subscription: form.monthly_subscription.trim() === "" ? 0 : Number(form.monthly_subscription),
        billing_status: form.billing_status,
        billing_notes: form.billing_notes.trim() || null,
      }).eq("id", supplierId);
      if (error) throw error;

      await Promise.all([
        supabase.from("supplier_regions").delete().eq("supplier_id", supplierId),
        supabase.from("supplier_cities").delete().eq("supplier_id", supplierId),
      ]);
      if (!areas.servesAllCountry) {
        if (areas.regionIds.length > 0) {
          await supabase.from("supplier_regions").insert(
            areas.regionIds.map((region_id) => ({ supplier_id: supplierId, region_id })),
          );
        }
        if (areas.cityIds.length > 0) {
          await supabase.from("supplier_cities").insert(
            areas.cityIds.map((city_id) => ({ supplier_id: supplierId, city_id })),
          );
        }
      }
      toast.success("הספק עודכן בהצלחה");
      if (prevApproval !== "approved" && form.approval_status === "approved") {
        supabase.functions.invoke("send-email", { body: { type: "supplier_approved", supplier_id: supplierId } })
          .catch((e) => console.warn("[email] supplier_approved failed", e));
      }
      setEditing(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "עדכון נכשל");
    } finally {
      setSaving(false);
    }
  };

  const quickApproval = async (next: "approved" | "rejected") => {
    if (!supplierId) return;
    if (next === "approved") {
      const missing: string[] = [];
      if (!form.phone.trim()) missing.push("טלפון");
      if (form.categoryIds.length === 0) missing.push("תחום פעילות");
      if (!areas.servesAllCountry && areas.regionIds.length === 0 && areas.cityIds.length === 0) {
        missing.push("אזור שירות");
      }
      if (missing.length > 0) {
        const ok = window.confirm(
          `⚠️ לספק חסרים פרטים חיוניים:\n\n• ${missing.join("\n• ")}\n\nהוא לא יופיע לדיירים ולא יקבל לידים עד להשלמת הפרטים.\nלאשר בכל זאת?`
        );
        if (!ok) return;
      }
    }
    try {
      const payload: { approval_status: "approved" | "rejected"; is_active?: boolean } = { approval_status: next };
      if (next === "approved") payload.is_active = true;
      const { error } = await supabase.from("suppliers").update(payload).eq("id", supplierId);
      if (error) throw error;
      if (next === "approved") {
        supabase.functions.invoke("send-email", { body: { type: "supplier_approved", supplier_id: supplierId } })
          .catch((e) => console.warn("[email] supplier_approved failed", e));
      }
      toast.success(next === "approved" ? "הספק אושר" : "הספק נדחה");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "עדכון סטטוס נכשל");
    }
  };

  const handleDelete = async () => {
    if (!supplierId) return;
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { toast.error("נדרשת התחברות מחדש כאדמין"); return; }
      const { data, error } = await supabase.functions.invoke("delete-supplier", {
        body: { supplier_id: supplierId },
      });
      if (error) {
        let serverMessage = error.message || "מחיקה נכשלה";
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const text = await ctx.text();
            if (text) {
              try {
                const parsed = JSON.parse(text) as { error?: string };
                if (parsed?.error) serverMessage = parsed.error;
              } catch { serverMessage = text; }
            }
          } catch { /* ignore */ }
        }
        throw new Error(serverMessage);
      }
      if (data && (data as { error?: string }).error) throw new Error((data as { error: string }).error);
      toast.success("הספק נמחק לצמיתות");
      navigate("/admin/suppliers");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "מחיקה נכשלה";
      toast.error(`מחיקה נכשלה: ${msg}`);
    } finally {
      setDeleteOpen(false);
    }
  };

  const openMatch = async () => {
    setMatchOpen(true);
    setSelectedResident(null);
    setMatchResult(null);
    setResidentSearch("");
    if (residents.length === 0) {
      const { data } = await supabase.from("profiles")
        .select("id,full_name,email,city,region,region_id,city_id")
        .eq("user_type", "resident");
      setResidents((data as MatchProfile[]) ?? []);
    }
  };

  const runMatch = async (resident: MatchProfile) => {
    if (!supplierId) return;
    setSelectedResident(resident);
    const reasons: string[] = [];
    let visible = true;
    if (!form.is_active) { visible = false; reasons.push("❌ הספק מסומן כלא פעיל (is_active = false)"); }
    if (form.approval_status !== "approved") {
      visible = false;
      reasons.push(`❌ סטטוס אישור = "${form.approval_status}" (נדרש "approved")`);
    }
    if (form.categoryIds.length === 0) {
      visible = false;
      reasons.push("❌ הספק אינו משויך לאף קטגוריה — לא יוצג בשום קטגוריה");
    } else {
      const catNames = form.categoryIds.map((cid) => categories.find((c) => c.id === cid)?.name ?? cid).join(", ");
      reasons.push(`✅ משויך לקטגוריות: ${catNames}`);
    }
    if (areas.servesAllCountry) {
      reasons.push("✅ ספק מוגדר 'כל הארץ' — יוצג לכל הדיירים");
    } else {
      let residentRegionId = resident.region_id;
      let residentCityId = resident.city_id;
      if (!residentRegionId && resident.region) {
        residentRegionId = regions.find((r) => r.slug === resident.region || r.name_he === resident.region)?.id ?? null;
      }
      if (!residentCityId && resident.city) {
        residentCityId = cities.find((c) => c.name_he === resident.city)?.id ?? null;
      }
      const sRegionIds = new Set(areas.regionIds);
      const sCityIds = new Set(areas.cityIds);
      if (sRegionIds.size === 0 && sCityIds.size === 0) {
        visible = false;
        reasons.push("❌ לא הוגדרו לספק אזורי שירות כלל ולא 'כל הארץ' — לא יוצג לאף דייר");
      } else if (residentRegionId && sRegionIds.has(residentRegionId)) {
        reasons.push(`✅ אזור הדייר (${regions.find((r) => r.id === residentRegionId)?.name_he}) כלול באזורי השירות של הספק`);
      } else if (residentCityId && sCityIds.has(residentCityId)) {
        reasons.push(`✅ עיר הדייר (${cities.find((c) => c.id === residentCityId)?.name_he}) כלולה בערי השירות של הספק`);
      } else if (!residentRegionId && !residentCityId) {
        visible = false;
        reasons.push("⚠️ לדייר אין אזור/עיר בפרופיל — לא ניתן להתאים");
      } else {
        visible = false;
        reasons.push(
          `❌ הדייר באזור "${regions.find((r) => r.id === residentRegionId)?.name_he ?? "—"}" / עיר "${cities.find((c) => c.id === residentCityId)?.name_he ?? "—"}" — אך הספק לא מכסה אזור/עיר זו`
        );
      }
    }
    setMatchResult({ visible, reasons });
  };

  const filteredResidents = useMemo(() => {
    const q = residentSearch.trim().toLowerCase();
    if (!q) return residents.slice(0, 30);
    return residents.filter((r) =>
      (r.full_name ?? "").toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      (r.city ?? "").toLowerCase().includes(q)
    ).slice(0, 30);
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

  const rejected = form.approval_status === "rejected";
  const blocked = !form.is_active;
  const pending = form.approval_status === "pending";
  const approved = form.approval_status === "approved" && form.is_active;
  const statusBadge = rejected
    ? { emoji: "🔴", label: "נדחה", cls: "bg-red-50 text-red-700 border-red-200" }
    : blocked
    ? { emoji: "⚫", label: "חסום", cls: "bg-neutral-100 text-neutral-700 border-neutral-200" }
    : pending
    ? { emoji: "🟡", label: "ממתין לאישור", cls: "bg-amber-50 text-amber-800 border-amber-200" }
    : approved
    ? { emoji: "🟢", label: "פעיל / מאומת", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    : { emoji: "⚪", label: "לא פעיל", cls: "bg-muted text-muted-foreground border-border" };

  const categoryNames = form.categoryIds
    .map((cid) => categories.find((c) => c.id === cid)?.name)
    .filter(Boolean) as string[];

  const areaSummary = areas.servesAllCountry
    ? "כל הארץ"
    : [
        ...areas.regionIds.map((id) => regions.find((r) => r.id === id)?.name_he ?? ""),
        ...areas.cityIds.map((id) => cities.find((c) => c.id === id)?.name_he ?? ""),
      ].filter(Boolean).join(" · ") || "לא הוגדר";

  const createdLabel = createdAt
    ? new Date(createdAt).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  const completeness = computeCompleteness({
    business_name: form.business_name,
    phone: form.phone,
    email: form.email,
    categories: form.categoryIds,
    serves_all_country: areas.servesAllCountry,
    regionsCount: areas.regionIds.length,
    citiesCount: areas.cityIds.length,
    short_description: form.short_description,
    description: form.description,
  });

  return (
    <MobileShell>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => navigate("/admin/suppliers")}
            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted"
            aria-label="חזרה"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-fs-xs text-muted-foreground">פרטי ספק</div>
            <div className="font-bold text-fs-sm truncate">{form.business_name}</div>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="h-9 px-3 rounded-lg bg-muted text-foreground text-fs-xs font-bold flex items-center gap-1 hover:bg-muted/80"
            >
              <Pencil className="h-3.5 w-3.5" /> עריכה
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 pb-32 space-y-3">
        {/* Header card */}
        <div className="gb-card p-4">
          <div className="flex items-start gap-3">
            <SupplierLogo name={form.business_name} logoUrl={form.logo_url} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-fs-xs font-bold ${statusBadge.cls}`}>
                  <span aria-hidden>{statusBadge.emoji}</span>
                  {statusBadge.label}
                </span>
              </div>
              <h2 className="font-extrabold text-fs-lg leading-tight">{form.business_name}</h2>
              {form.short_description && (
                <p className="text-fs-xs text-muted-foreground mt-1 line-clamp-2">{form.short_description}</p>
              )}
              <div className="text-fs-xs text-muted-foreground mt-1.5 inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> נרשם {createdLabel}
              </div>
            </div>
          </div>

          {/* Approve / Reject for pending */}
          {pending && !editing && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50">
              <button
                onClick={() => quickApproval("approved")}
                className="h-10 rounded-xl bg-emerald-600 text-white text-fs-sm font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-700"
              >
                <Check className="h-4 w-4" /> אישור ספק
              </button>
              <button
                onClick={() => quickApproval("rejected")}
                className="h-10 rounded-xl bg-red-600 text-white text-fs-sm font-bold flex items-center justify-center gap-1.5 hover:bg-red-700"
              >
                <X className="h-4 w-4" /> דחייה
              </button>
            </div>
          )}
        </div>

        {/* Contact card */}
        {!editing && (
          <div className="gb-card p-4 space-y-2.5">
            <h3 className="font-bold text-fs-sm">פרטי קשר</h3>
            <div className="grid gap-1.5 text-fs-sm">
              <Row icon={<UserIcon className="h-4 w-4" />} value={form.contact_name || "—"} />
              <Row icon={<Phone className="h-4 w-4" />} value={form.phone || "—"}
                href={form.phone ? `tel:${form.phone}` : undefined} />
              <Row icon={<Mail className="h-4 w-4" />} value={form.email || "—"}
                href={form.email ? `mailto:${form.email}` : undefined} />
              <Row icon={<Tag className="h-4 w-4" />} value={categoryNames.join(" • ") || "ללא תחום"} />
              <Row icon={<MapPin className="h-4 w-4" />} value={areaSummary} />
        </div>

        {/* Profile completeness */}
        <div className={`gb-card p-4 space-y-2 ${completeness.complete ? "" : "border-2 border-amber-300"}`}>
          <div className="flex items-center justify-between">
            <div className="font-bold text-fs-sm inline-flex items-center gap-2">
              {completeness.complete ? "✅" : "⚠️"} השלמת פרופיל
              {!completeness.complete && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                  פרופיל לא הושלם
                </span>
              )}
            </div>
            <span className={`text-fs-md font-extrabold ${completeness.complete ? "text-emerald-700" : "text-amber-700"}`}>
              {completeness.percent}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${completeness.percent}%`,
                background: completeness.complete
                  ? "linear-gradient(90deg,#059669,#10b981)"
                  : "linear-gradient(90deg,#d97706,#f59e0b)",
              }}
            />
          </div>
          {!completeness.complete && (
            <>
              <div className="text-fs-xs text-muted-foreground">
                חסר: <b className="text-amber-800">{completeness.missing.join(" · ")}</b>
              </div>
              <div className="text-fs-xs text-muted-foreground pt-1 border-t border-border/50">
                🔒 הספק חסום מפרסום הצעות, מקבלת לידים, והופעה לדיירים עד להשלמת הפרטים.
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={async () => {
                    if (!supplierId) return;
                    const { data, error } = await supabase.functions.invoke("send-supplier-profile-reminders", {
                      body: { supplier_id: supplierId },
                    });
                    if (error) {
                      let details = error.message;
                      try {
                        const err = error as { context?: { text?: () => Promise<string> } };
                        if (err.context?.text) details = await err.context.text();
                      } catch { /* noop */ }
                      console.error("send reminder failed", details);
                      toast.error(`שליחת התזכורת נכשלה: ${details}`);
                      return;
                    }
                    const res = data as { results?: { status: string; reason?: string }[] } | null;
                    const first = res?.results?.[0];
                    if (first?.status === "sent") toast.success("נשלחה תזכורת לספק במייל");
                    else if (first?.status === "skipped" && first.reason === "no_email") toast.error("לספק אין אימייל — שלח בוואטסאפ");
                    else if (first?.status === "error") toast.error(`שליחה נכשלה: ${first.reason ?? ""}`);
                    else toast.success("הבקשה עובדה");
                  }}
                  className="h-9 rounded-lg bg-amber-500 text-white text-fs-xs font-bold hover:bg-amber-600"
                >
                  ✉️ מייל
                </button>
                <button
                  onClick={() => {
                    const phone = (form.phone ?? "").replace(/\D/g, "");
                    if (!phone) {
                      toast.error("לספק אין מספר טלפון");
                      return;
                    }
                    const intl = phone.startsWith("0") ? `972${phone.slice(1)}` : phone;
                    const url = `${window.location.origin}/supplier/onboarding`;
                    const name = form.business_name || form.contact_name || "";
                    const missingTxt = completeness.missing.join(" · ");
                    const msg =
                      `שלום ${name} 👋\n` +
                      `הפרופיל שלך ב-GroupBuild עדיין לא הושלם (${completeness.percent}%).\n` +
                      (missingTxt ? `חסר: ${missingTxt}\n` : "") +
                      `כדי להתחיל לקבל לידים ולפרסם הצעות, השלם את הפרטים כאן:\n${url}`;
                    const wa = `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
                    window.open(wa, "_blank", "noopener");
                  }}
                  className="h-9 rounded-lg bg-emerald-500 text-white text-fs-xs font-bold hover:bg-emerald-600"
                >
                  💬 וואטסאפ
                </button>
                <button
                  onClick={async () => {
                    const url = `${window.location.origin}/supplier/onboarding`;
                    try {
                      await navigator.clipboard.writeText(url);
                      toast.success("הקישור הועתק");
                    } catch {
                      toast.error("העתקה נכשלה");
                    }
                  }}
                  className="h-9 rounded-lg bg-muted text-foreground text-fs-xs font-bold hover:bg-muted/80"
                >
                  🔗 קישור
                </button>
              </div>
            </>
          )}
        </div>


          </div>
        )}

        {/* Description */}
        {!editing && form.description && (
          <div className="gb-card p-4">
            <h3 className="font-bold text-fs-sm mb-1.5">תיאור מלא</h3>
            <p className="text-fs-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{form.description}</p>
          </div>
        )}

        {/* Quick tools */}
        {!editing && (
          <div className="gb-card p-3">
            <h3 className="font-bold text-fs-sm mb-2 px-1">כלים</h3>
            <div className="grid grid-cols-2 gap-2">
              <ToolBtn onClick={openMatch} icon={<Target className="h-4 w-4" />}>בדוק התאמה</ToolBtn>
              <ToolBtn onClick={() => navigate(`/admin/suppliers/${supplierId}/media`)} icon={<ImageIcon className="h-4 w-4" />}>מדיה וגלריה</ToolBtn>
              <ToolBtn onClick={() => navigate(`/admin/suppliers/${supplierId}/areas`)} icon={<MapPin className="h-4 w-4" />}>אזורי שירות</ToolBtn>
              <ToolBtn onClick={() => navigate(`/suppliers/${supplierId}`)} icon={<ExternalLink className="h-4 w-4" />}>עמוד ציבורי</ToolBtn>
            </div>
            <div className="pt-2 mt-2 border-t border-border/50">
              <button
                onClick={() => {
                  const phone = (form.phone ?? "").replace(/\D/g, "");
                  if (!phone) {
                    toast.error("לספק אין מספר טלפון");
                    return;
                  }
                  const intl = phone.startsWith("0") ? `972${phone.slice(1)}` : phone;
                  const name = form.contact_name || form.business_name || "";
                  const onboardingUrl = `${window.location.origin}/supplier/onboarding`;
                  const supportPhone = "0526247941";
                  const msg =
                    `שלום ${name} 👋\n` +
                    `ברוך הבא ל-GroupBuild — הפלטפורמה שמחברת אותך לדיירי פרויקטים חדשים בכל הארץ.\n\n` +
                    `כאן תוכל:\n` +
                    `• לפרסם הצעות מיוחדות לדיירים\n` +
                    `• לקבל לידים איכותיים מפרויקטים באזורי השירות שלך\n` +
                    `• לנהל את הפרופיל, קטלוג ומדיה בקלות\n\n` +
                    `להשלמת הפרופיל וההתחלה:\n${onboardingUrl}\n\n` +
                    `לכל שאלה — פשוט תענה כאן בהודעה, או ווטסאפ ל-${supportPhone}. נשמח לעזור! 🙌`;
                  const wa = `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
                  window.open(wa, "_blank", "noopener");
                }}
                className="w-full h-10 rounded-xl bg-emerald-500 text-white text-fs-sm font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-600"
              >
                💬 שלח הודעת "ברוך הבא" בוואטסאפ
              </button>
              <p className="text-fs-xs text-muted-foreground text-center mt-1.5">
                נפתח בוואטסאפ עם הודעה מוכנה — אתה מאשר ושולח
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-border/50">
              <button
                onClick={() => setDeleteOpen(true)}
                className="w-full h-10 rounded-xl text-destructive border border-destructive/30 text-fs-sm font-bold flex items-center justify-center gap-1.5 hover:bg-destructive/5"
              >
                <Trash2 className="h-4 w-4" /> מחיקת ספק מלאה
              </button>
            </div>
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div className="gb-card p-4 space-y-3">
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
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="pt-2 border-t">
              <Label className="text-sm font-bold">לוגו</Label>
              <div className="flex items-center gap-3 mt-1.5">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="לוגו" className="h-14 w-14 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center text-fs-xs text-muted-foreground">אין</div>
                )}
                <div className="flex-1 space-y-1.5">
                  <input type="file" accept="image/*" disabled={uploadingLogo}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "supplier-logos", setUploadingLogo, "logo_url"); }}
                    className="text-xs" />
                  {form.logo_url && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, logo_url: "" }))} className="text-fs-xs text-destructive underline">הסר לוגו</button>
                  )}
                  {uploadingLogo && <p className="text-fs-xs text-muted-foreground">מעלה...</p>}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <Label className="text-sm font-bold">קטלוג (PDF)</Label>
              <div className="space-y-1.5 mt-1.5">
                <input type="file" accept="application/pdf,image/*" disabled={uploadingCatalog}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "supplier-catalogs", setUploadingCatalog, "catalog_url"); }}
                  className="text-xs" />
                {form.catalog_url && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted">
                    <a href={form.catalog_url} target="_blank" rel="noreferrer noopener" className="text-fs-xs text-primary underline truncate">צפייה בקטלוג</a>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, catalog_url: "" }))} className="text-fs-xs text-destructive underline shrink-0">הסר</button>
                  </div>
                )}
                {uploadingCatalog && <p className="text-fs-xs text-muted-foreground">מעלה...</p>}
              </div>
            </div>

            <div className="pt-2 border-t space-y-2">
              <Label className="text-sm font-bold">קישורים</Label>
              <Input dir="ltr" placeholder="אתר אינטרנט" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
              <Input dir="ltr" placeholder="https://wa.me/972..." value={form.whatsapp_url} onChange={(e) => setForm({ ...form, whatsapp_url: e.target.value })} />
              <Input dir="ltr" placeholder="https://instagram.com/..." value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} />
              <Input dir="ltr" placeholder="https://facebook.com/..." value={form.facebook_url} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} />
            </div>

            <div className="pt-2 border-t">
              <Label className="text-sm font-bold">קטגוריות *</Label>
              <div className="mt-2">
                <CategoryMultiPicker
                  categories={categories}
                  value={form.categoryIds}
                  onChange={(next) => setForm((f) => ({ ...f, categoryIds: next }))}
                />
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
                onChange={(e) => setForm({ ...form, approval_status: e.target.value as EditForm["approval_status"] })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="approved">מאושר</option>
                <option value="pending">ממתין</option>
                <option value="rejected">נדחה</option>
              </select>
            </div>

            <div className="pt-2 border-t space-y-2">
              <Label className="text-sm font-bold">חיוב ועמלות</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">עמלה (%)</Label>
                  <Input type="number" min="0" max="100" step="0.1" placeholder="0"
                    value={form.commission_percent}
                    onChange={(e) => setForm({ ...form, commission_percent: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">מנוי חודשי (₪)</Label>
                  <Input type="number" min="0" step="1" placeholder="0"
                    value={form.monthly_subscription}
                    onChange={(e) => setForm({ ...form, monthly_subscription: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">סטטוס חיוב</Label>
                <select value={form.billing_status}
                  onChange={(e) => setForm({ ...form, billing_status: e.target.value as EditForm["billing_status"] })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="none">ללא</option>
                  <option value="trial">תקופת ניסיון</option>
                  <option value="active">פעיל</option>
                  <option value="suspended">מושהה</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">הערות חיוב</Label>
                <Textarea rows={2} value={form.billing_notes}
                  onChange={(e) => setForm({ ...form, billing_notes: e.target.value })}
                  placeholder="הערות פנימיות לאדמין" />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" className="flex-1" onClick={() => { setEditing(false); load(); }}>ביטול</Button>
              <Button onClick={save} disabled={saving} className="flex-1 bg-[#0E6B5A] text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור שינויים"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Match dialog */}
      <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>בדוק התאמה לדייר</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="חפש לפי שם / אימייל / עיר"
              value={residentSearch} onChange={(e) => setResidentSearch(e.target.value)} />
            <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-1">
              {filteredResidents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">לא נמצאו דיירים</p>
              )}
              {filteredResidents.map((r) => (
                <button key={r.id} onClick={() => runMatch(r)}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs hover:bg-muted transition-smooth ${selectedResident?.id === r.id ? "bg-[#FFF8E1] border border-[#0E6B5A]/30" : ""}`}>
                  <div className="font-bold">{r.full_name ?? r.email ?? "ללא שם"}</div>
                  <div className="text-muted-foreground text-fs-xs">{r.city ?? "—"} · {r.region ?? "ללא אזור"}</div>
                </button>
              ))}
            </div>
            {matchResult && selectedResident && (
              <div className={`gb-card p-4 space-y-2 ${matchResult.visible ? "border-green-500/40" : "border-destructive/40"}`}>
                <div className="flex items-center gap-2">
                  {matchResult.visible
                    ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                    : <XCircle className="h-5 w-5 text-destructive" />}
                  <p className="font-bold text-sm">
                    {matchResult.visible ? "הספק יוצג לדייר זה" : "הספק לא יוצג לדייר זה"}
                  </p>
                </div>
                <ul className="text-xs space-y-1 leading-relaxed">
                  {matchResult.reasons.map((r, i) => (<li key={i}>{r}</li>))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchOpen(false)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקה מלאה של הספק?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הספק לצמיתות — כולל החשבון, הפרופיל, הקטלוגים, הגלריה וקבצי האחסון.
              האימייל ישוחרר ויהיה ניתן להירשם איתו מחדש. עסקאות והיסטוריית פיקדונות יישמרו לצורך audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              מחיקה מלאה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function Row({ icon, value, href }: { icon: React.ReactNode; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-2 text-foreground/90">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      {href ? (
        <a href={href} className="truncate hover:underline">{value}</a>
      ) : (
        <span className="truncate">{value}</span>
      )}
    </div>
  );
}

function ToolBtn({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="h-11 rounded-xl bg-muted text-foreground text-fs-sm font-bold flex items-center justify-center gap-1.5 hover:bg-muted/70">
      {icon} {children}
    </button>
  );
}
