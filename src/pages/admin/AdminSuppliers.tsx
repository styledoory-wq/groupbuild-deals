import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { ShieldCheck, Star, Check, X, Plus, Pencil, Trash2, AlertCircle, MapPin, Upload, Globe, FileText, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Supplier } from "@/types";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { uploadSupplierLogo, uploadSupplierCatalog } from "@/lib/supplierUploads";
import { AreasCombobox, type AreasComboboxValue } from "@/components/areas/AreasCombobox";
import { useRegions } from "@/hooks/useRegions";

type FormState = {
  id?: string;
  businessName: string;
  ownerName: string;
  categoryIds: string[];
  serviceArea: string;
  commissionPercent: string;
  logoEmoji: string;
  logoUrl: string | null;
  websiteUrl: string;
  whatsappUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  catalogUrl: string;
  verified: boolean;
  featured: boolean;
  approvalStatus: "approved" | "pending" | "rejected";
};

const emptyForm: FormState = {
  businessName: "",
  ownerName: "",
  categoryIds: [],
  serviceArea: "",
  commissionPercent: "",
  logoEmoji: "🏷️",
  logoUrl: null,
  websiteUrl: "",
  whatsappUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  catalogUrl: "",
  verified: false,
  featured: false,
  approvalStatus: "pending",
};

function supplierIsIncomplete(s: Supplier) {
  return (
    !s.businessName?.trim() ||
    !s.ownerName?.trim() ||
    !s.categoryIds?.length ||
    !s.commissionPercent ||
    !s.logoEmoji
  );
}

export default function AdminSuppliers() {
  const navigate = useNavigate();
  const { suppliers, setSuppliers, categories, setCategories } = useApp();
  const { regionById, cityById } = useRegions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [areas, setAreas] = useState<AreasComboboxValue>({
    servesAllCountry: false,
    regionIds: [],
    cityIds: [],
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", icon: "🏷️" });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCatalog, setUploadingCatalog] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const catalogInputRef = useRef<HTMLInputElement>(null);

  // Convert area selection → readable Hebrew string for serviceArea
  const areasToText = (a: AreasComboboxValue): string => {
    if (a.servesAllCountry) return "כל הארץ";
    const labels: string[] = [];
    a.regionIds.forEach((id) => {
      const r = regionById(id);
      if (r) labels.push(r.name_he);
    });
    a.cityIds.forEach((id) => {
      const c = cityById(id);
      if (c) labels.push(c.name_he);
    });
    return labels.join(", ");
  };

  const onLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadSupplierLogo(file);
      setForm((f) => ({ ...f, logoUrl: url }));
      toast.success("הלוגו הועלה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const onCatalogUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCatalog(true);
    try {
      const url = await uploadSupplierCatalog(file);
      setForm((f) => ({ ...f, catalogUrl: url }));
      toast.success("הקטלוג הועלה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setUploadingCatalog(false);
      if (catalogInputRef.current) catalogInputRef.current.value = "";
    }
  };

  const addCategory = () => {
    const name = newCat.name.trim();
    if (!name) { toast.error("יש להזין שם קטגוריה"); return; }
    const id = `cat_${Date.now()}`;
    setCategories([...categories, { id, name, icon: newCat.icon || "🏷️" }]);
    setForm((f) => ({ ...f, categoryIds: [...f.categoryIds, id] }));
    toast.success("הקטגוריה נוספה");
    setNewCat({ name: "", icon: "🏷️" });
    setNewCatOpen(false);
  };

  const setStatus = (id: string, approvalStatus: "approved" | "rejected") => {
    setSuppliers(suppliers.map((s) => s.id === id ? { ...s, approvalStatus, verified: approvalStatus === "approved" } : s));
    toast.success(approvalStatus === "approved" ? "הספק אושר" : "הספק נדחה");
  };

  const openCreate = () => {
    setForm(emptyForm);
    setAreas({ servesAllCountry: false, regionIds: [], cityIds: [] });
    setOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setForm({
      id: s.id,
      businessName: s.businessName ?? "",
      ownerName: s.ownerName ?? "",
      categoryIds: s.categoryIds ?? [],
      serviceArea: s.serviceArea ?? "",
      commissionPercent: s.commissionPercent ? String(s.commissionPercent) : "",
      logoEmoji: s.logoEmoji ?? "🏷️",
      logoUrl: s.logoUrl ?? null,
      websiteUrl: s.websiteUrl ?? "",
      whatsappUrl: s.whatsappUrl ?? "",
      instagramUrl: s.instagramUrl ?? "",
      facebookUrl: s.facebookUrl ?? "",
      catalogUrl: s.catalogUrl ?? "",
      verified: !!s.verified,
      featured: !!s.featured,
      approvalStatus: s.approvalStatus ?? "pending",
    });
    // Pre-fill the combobox with "all country" if applicable; else leave empty for re-selection
    setAreas({
      servesAllCountry: s.serviceArea?.trim() === "כל הארץ",
      regionIds: [],
      cityIds: [],
    });
    setOpen(true);
  };

  const toggleCategory = (catId: string) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(catId)
        ? f.categoryIds.filter((c) => c !== catId)
        : [...f.categoryIds, catId],
    }));
  };

  const save = () => {
    if (!form.businessName.trim() || !form.ownerName.trim()) {
      toast.error("יש למלא לפחות שם עסק ושם בעלים");
      return;
    }
    const payload: Supplier = {
      id: form.id ?? `s_${Date.now()}`,
      businessName: form.businessName.trim(),
      ownerName: form.ownerName.trim(),
      categoryIds: form.categoryIds,
      serviceArea: areasToText(areas) || form.serviceArea.trim(),
      verified: form.verified,
      featured: form.featured,
      rating: form.id ? (suppliers.find(s => s.id === form.id)?.rating ?? 0) : 0,
      reviewsCount: form.id ? (suppliers.find(s => s.id === form.id)?.reviewsCount ?? 0) : 0,
      commissionPercent: parseFloat(form.commissionPercent) || 0,
      approvalStatus: form.approvalStatus,
      logoEmoji: form.logoEmoji || "🏷️",
      logoUrl: form.logoUrl,
      websiteUrl: form.websiteUrl.trim() || null,
      whatsappUrl: form.whatsappUrl.trim() || null,
      instagramUrl: form.instagramUrl.trim() || null,
      facebookUrl: form.facebookUrl.trim() || null,
      catalogUrl: form.catalogUrl.trim() || null,
    };
    if (form.id) {
      setSuppliers(suppliers.map((s) => (s.id === form.id ? payload : s)));
      toast.success("פרטי הספק עודכנו");
    } else {
      setSuppliers([payload, ...suppliers]);
      toast.success("ספק חדש נוסף");
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setSuppliers(suppliers.filter((s) => s.id !== deleteId));
    toast.success("הספק נמחק");
    setDeleteId(null);
  };

  return (
    <MobileShell>
      <PageHeader title="ניהול ספקים" subtitle={`${suppliers.length} ספקים רשומים`} back={false} />
      <div className="px-5 -mt-4 relative z-10 space-y-3">
        <button
          onClick={openCreate}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 shadow-soft"
        >
          <Plus className="h-5 w-5" /> הוספת ספק חדש
        </button>

        {suppliers.map((s) => {
          const incomplete = supplierIsIncomplete(s);
          return (
            <div key={s.id} className="gb-card p-4">
              <div className="flex items-start gap-3">
                <SupplierLogo name={s.businessName} logoUrl={s.logoUrl ?? null} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <h3 className="font-bold truncate">{s.businessName || <span className="text-destructive">— ללא שם עסק —</span>}</h3>
                    {s.verified && <ShieldCheck className="h-4 w-4 text-gold shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {s.ownerName || "—"} · {s.serviceArea || "—"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] flex-wrap">
                    <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                      <Star className="h-3 w-3 fill-gold text-gold" /> <b className="text-foreground">{s.rating || 0}</b>
                      <span className="text-[10px]">({s.reviewsCount || 0})</span>
                    </span>
                    <span className="text-muted-foreground">עמלה: <b className="text-primary">{s.commissionPercent || 0}%</b></span>
                    <span className="text-muted-foreground truncate">
                      {s.categoryIds?.map(id => categories.find(c => c.id === id)?.name).filter(Boolean).join(", ") || "ללא קטגוריות"}
                    </span>
                  </div>
                  {incomplete && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                      <AlertCircle className="h-3 w-3" /> חסרים פרטים
                    </div>
                  )}
                </div>
              </div>

              {s.approvalStatus === "pending" && (
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
                  <button onClick={() => setStatus(s.id, "approved")} className="h-9 rounded-xl bg-success text-success-foreground text-xs font-bold flex items-center justify-center gap-1">
                    <Check className="h-4 w-4" /> אישור
                  </button>
                  <button onClick={() => setStatus(s.id, "rejected")} className="h-9 rounded-xl bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-1">
                    <X className="h-4 w-4" /> דחייה
                  </button>
                </div>
              )}

              {s.approvalStatus !== "pending" && (
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                  <span className={"font-bold px-2 py-1 rounded-full " + (s.approvalStatus === "approved" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    {s.approvalStatus === "approved" ? "מאושר" : "נדחה"}
                  </span>
                  {s.featured && <span className="font-bold gb-gold-text">★ מובלט</span>}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  onClick={() => openEdit(s)}
                  className="h-9 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Pencil className="h-3.5 w-3.5" /> {incomplete ? "השלמה" : "עריכה"}
                </button>
                <button
                  onClick={() => navigate(`/admin/suppliers/${s.id}/areas`)}
                  className="h-9 rounded-xl bg-gold/10 text-primary border border-gold/30 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <MapPin className="h-3.5 w-3.5" /> אזורים
                </button>
                <button
                  onClick={() => setDeleteId(s.id)}
                  className="h-9 rounded-xl bg-destructive/10 text-destructive text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> מחיקה
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">
              {form.id ? "עריכת ספק" : "הוספת ספק חדש"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <SupplierLogo name={form.businessName} logoUrl={form.logoUrl} size="lg" />
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">לוגו העסק</Label>
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onLogoUpload} />
                <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="h-9 rounded-xl text-xs w-full">
                  <Upload className="h-3.5 w-3.5 ml-1" />
                  {uploadingLogo ? "מעלה..." : form.logoUrl ? "החלפת לוגו" : "העלאת לוגו"}
                </Button>
                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, logoUrl: null })}
                    className="text-[11px] text-destructive font-bold"
                  >
                    הסרת לוגו
                  </button>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs">שם העסק *</Label>
              <Input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="לדוגמה: מטבחי רויאל"
              />
            </div>

            <div>
              <Label className="text-xs">שם בעל העסק *</Label>
              <Input
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                placeholder="שם מלא"
              />
            </div>

            <div>
              <Label className="text-xs font-bold flex items-center gap-1.5 mb-1.5">
                <MapPin className="h-3.5 w-3.5 text-gold" /> אזורי שירות
              </Label>
              <AreasCombobox value={areas} onChange={setAreas} />
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                ניתן לבחור "כל הארץ", אזור שלם או ערים בודדות. בחירה מרובה אפשרית.
              </p>
            </div>

            {/* Links + Catalog */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-gold" /> קישורים
              </Label>
              <Input dir="ltr" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://example.com (אתר)" className="h-10 rounded-xl text-sm" maxLength={500} />
              <Input dir="ltr" value={form.whatsappUrl} onChange={(e) => setForm({ ...form, whatsappUrl: e.target.value })} placeholder="https://wa.me/972500000000" className="h-10 rounded-xl text-sm" maxLength={500} />
              <Input dir="ltr" value={form.instagramUrl} onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })} placeholder="https://instagram.com/..." className="h-10 rounded-xl text-sm" maxLength={500} />
              <Input dir="ltr" value={form.facebookUrl} onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })} placeholder="https://facebook.com/..." className="h-10 rounded-xl text-sm" maxLength={500} />
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-gold" /> קטלוג (PDF)
              </Label>
              <Input dir="ltr" value={form.catalogUrl} onChange={(e) => setForm({ ...form, catalogUrl: e.target.value })} placeholder="קישור לקטלוג חיצוני" className="h-10 rounded-xl text-sm" maxLength={500} />
              <input ref={catalogInputRef} type="file" accept="application/pdf" className="hidden" onChange={onCatalogUpload} />
              <Button type="button" variant="outline" onClick={() => catalogInputRef.current?.click()} disabled={uploadingCatalog} className="h-9 rounded-xl text-xs w-full">
                <Upload className="h-3.5 w-3.5 ml-1" />
                {uploadingCatalog ? "מעלה..." : "או העלאת PDF"}
              </Button>
              {form.catalogUrl && (
                <a href={form.catalogUrl} target="_blank" rel="noreferrer" className="block text-[11px] text-gold underline truncate" dir="ltr">
                  {form.catalogUrl}
                </a>
              )}
            </div>

            <div>
              <Label className="text-xs">קטגוריות</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {categories.map((c) => {
                  const active = form.categoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      className={
                        "px-2.5 py-1 rounded-full text-[11px] font-bold border transition " +
                        (active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border")
                      }
                    >
                      {c.icon} {c.name}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setNewCatOpen(true)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-dashed border-gold text-primary bg-gold/10 inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> קטגוריה חדשה
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-muted/40 border border-border px-3 py-2.5 flex items-center gap-2">
              <Star className="h-4 w-4 text-gold" />
              <span className="text-[11px] text-muted-foreground leading-snug">
                הדירוג ומספר חוות הדעת מחושבים אוטומטית מהביקורות של דיירים שהשתתפו בעסקאות.
              </span>
            </div>

            <div>
              <Label className="text-xs">עמלה %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.commissionPercent}
                onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })}
                placeholder="0"
              />
            </div>

            <div>
              <Label className="text-xs">סטטוס אישור</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {(["approved", "pending", "rejected"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setForm({ ...form, approvalStatus: st })}
                    className={
                      "h-9 rounded-xl text-xs font-bold border transition " +
                      (form.approvalStatus === st
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border")
                    }
                  >
                    {st === "approved" ? "מאושר" : st === "pending" ? "ממתין" : "נדחה"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.verified}
                  onChange={(e) => setForm({ ...form, verified: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                מאומת
              </label>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                מובלט
              </label>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <button
              onClick={() => setOpen(false)}
              className="h-10 px-4 rounded-xl bg-muted text-foreground text-sm font-bold flex-1"
            >
              ביטול
            </button>
            <button
              onClick={save}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex-1"
            >
              {form.id ? "שמירה" : "הוספה"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      {/* New category dialog */}
      <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right">הוספת קטגוריה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <Label className="text-xs">אייקון</Label>
                <Input
                  value={newCat.icon}
                  onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
                  className="text-center text-2xl"
                  maxLength={4}
                />
              </div>
              <div>
                <Label className="text-xs">שם הקטגוריה *</Label>
                <Input
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  placeholder="לדוגמה: ריהוט גן"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <button onClick={() => setNewCatOpen(false)} className="h-10 px-4 rounded-xl bg-muted text-foreground text-sm font-bold flex-1">ביטול</button>
            <button onClick={addCategory} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex-1">הוספה</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת ספק</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              פעולה זו תמחק את הספק לצמיתות. האם להמשיך?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
