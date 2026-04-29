import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ImageIcon, ShieldCheck, Loader2, ExternalLink, Plus, Trash2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { supabase } from "@/integrations/supabase/client";
import { useRegions } from "@/hooks/useRegions";
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
}

interface NewForm {
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  short_description: string;
  serves_all_country: boolean;
  approval_status: "approved" | "pending" | "rejected";
  is_active: boolean;
}

const emptyForm: NewForm = {
  business_name: "",
  contact_name: "",
  phone: "",
  email: "",
  short_description: "",
  serves_all_country: false,
  approval_status: "approved",
  is_active: true,
};

export default function AdminDbSuppliers() {
  const navigate = useNavigate();
  const { regions, citiesByRegion } = useRegions();
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

  const load = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id,business_name,approval_status,is_active,logo_url,serves_all_country,short_description,phone,email")
      .order("business_name");
    if (error) toast.error("שגיאה בטעינת ספקים");
    setRows((data as Row[]) ?? []);
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
          serves_all_country: areas.servesAllCountry,
          approval_status: form.approval_status,
          is_active: form.is_active,
          categories: [],
        })
        .select("id")
        .single();
      if (error) throw error;
      const newId = data?.id;
      // Save selected regions/cities (only if not nationwide)
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
          onClick={() => { setForm(emptyForm); setOpen(true); }}
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
        {rows.map((r) => (
          <div key={r.id} className="gb-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <SupplierLogo name={r.business_name} logoUrl={r.logo_url} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold truncate">{r.business_name}</h3>
                  {r.approval_status === "approved" && <ShieldCheck className="h-4 w-4 text-gold shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {r.serves_all_country ? "כל הארץ" : "אזורים נבחרים"} · {r.is_active ? "פעיל" : "לא פעיל"}
                </p>
                {r.short_description && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{r.short_description}</p>
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
            <div className="grid grid-cols-3 gap-2">
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
                onClick={() => navigate(`/suppliers/${r.id}`)}
                className="h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" /> תצוגה
              </button>
            </div>
          </div>
        ))}
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
            <div className="pt-2 border-t">
              <Label className="text-sm font-bold">אזורי שירות</Label>
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
