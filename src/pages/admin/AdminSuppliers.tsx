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

type FormState = {
  id?: string;
  businessName: string;
  ownerName: string;
  categoryIds: string[];
  serviceArea: string;
  rating: string;
  reviewsCount: string;
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
  rating: "",
  reviewsCount: "",
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
    !s.serviceArea?.trim() ||
    !s.categoryIds?.length ||
    !s.commissionPercent ||
    !s.logoEmoji
  );
}

export default function AdminSuppliers() {
  const navigate = useNavigate();
  const { suppliers, setSuppliers, categories, setCategories } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", icon: "🏷️" });

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
    setOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setForm({
      id: s.id,
      businessName: s.businessName ?? "",
      ownerName: s.ownerName ?? "",
      categoryIds: s.categoryIds ?? [],
      serviceArea: s.serviceArea ?? "",
      rating: s.rating ? String(s.rating) : "",
      reviewsCount: s.reviewsCount ? String(s.reviewsCount) : "",
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
      serviceArea: form.serviceArea.trim(),
      verified: form.verified,
      featured: form.featured,
      rating: parseFloat(form.rating) || 0,
      reviewsCount: parseInt(form.reviewsCount) || 0,
      commissionPercent: parseFloat(form.commissionPercent) || 0,
      approvalStatus: form.approvalStatus,
      logoEmoji: form.logoEmoji || "🏷️",
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
                <SupplierLogo name={s.businessName} size="md" />
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
                      <Star className="h-3 w-3 fill-gold text-gold" /> <b className="text-foreground">{s.rating || "—"}</b>
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
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <Label className="text-xs">אימוג׳י</Label>
                <Input
                  value={form.logoEmoji}
                  onChange={(e) => setForm({ ...form, logoEmoji: e.target.value })}
                  className="text-center text-2xl"
                  maxLength={4}
                />
              </div>
              <div>
                <Label className="text-xs">שם העסק *</Label>
                <Input
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="לדוגמה: מטבחי רויאל"
                />
              </div>
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
              <Label className="text-xs">איזור שירות</Label>
              <Input
                value={form.serviceArea}
                onChange={(e) => setForm({ ...form, serviceArea: e.target.value })}
                placeholder="מרכז / ארצי / צפון..."
              />
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

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">דירוג</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  placeholder="0-5"
                />
              </div>
              <div>
                <Label className="text-xs">מס׳ חוות דעת</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.reviewsCount}
                  onChange={(e) => setForm({ ...form, reviewsCount: e.target.value })}
                  placeholder="0"
                />
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
