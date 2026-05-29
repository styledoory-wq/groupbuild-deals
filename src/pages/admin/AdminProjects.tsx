import { useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { useRegions } from "@/hooks/useRegions";
import { Building2, Check, MapPin, Plus, Pencil, Trash2, Search } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types";

const statusLabel: Record<ProjectStatus, string> = {
  planning: "בתכנון", construction: "בבנייה", delivery: "במסירה", completed: "הושלם",
};

type FormState = {
  id?: string;
  name: string;
  city: string;
  buildingCount: string;
  apartmentCount: string;
  status: ProjectStatus;
};

const emptyForm: FormState = {
  name: "", city: "", buildingCount: "", apartmentCount: "", status: "planning",
};

export default function AdminProjects() {
  const { projects, setProjects } = useApp();
  const { cities } = useRegions();
  const cityNames = useMemo(
    () => Array.from(new Set(cities.map((c) => c.name_he))).sort((a, b) => a.localeCompare(b, "he")),
    [cities],
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.city, statusLabel[p.status]].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [projects, query]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Project) => {
    setForm({
      id: p.id,
      name: p.name ?? "",
      city: p.city ?? "",
      buildingCount: String(p.buildingCount ?? ""),
      apartmentCount: String(p.apartmentCount ?? ""),
      status: p.status ?? "planning",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.city.trim()) {
      toast.error("יש למלא שם פרויקט ועיר");
      return;
    }
    const payload: Project = {
      id: form.id ?? `p_${Date.now()}`,
      name: form.name.trim(),
      city: form.city.trim(),
      buildingCount: parseInt(form.buildingCount) || 0,
      apartmentCount: parseInt(form.apartmentCount) || 0,
      status: form.status,
    };
    setSaving(true);
    try {
      const { error } = await supabase.from("projects").upsert({
        id: payload.id,
        name: payload.name,
        city: payload.city,
        building_count: payload.buildingCount,
        apartment_count: payload.apartmentCount,
        status: payload.status,
        is_active: true,
        is_deleted: false,
        deleted_at: null,
      });
      if (error) throw error;

      if (form.id) {
        setProjects(projects.map((p) => (p.id === form.id ? payload : p)));
        toast.success("הפרויקט נשמר במערכת");
      } else {
        setProjects([payload, ...projects]);
        toast.success("פרויקט חדש נשמר במערכת");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת הפרויקט נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ is_deleted: true, is_active: false, deleted_at: new Date().toISOString() })
        .eq("id", deleteId);
      if (error) throw error;
      setProjects(projects.filter((p) => p.id !== deleteId));
      toast.success("הפרויקט הוסר מהרשימה ונשמר כסגור");
      setDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "מחיקת הפרויקט נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileShell>
      <PageHeader title="ניהול פרויקטים" subtitle={`${projects.length} פרויקטים פעילים`} back={false} />
      <div className="px-5 -mt-4 relative z-10 mb-4">
        <button
          onClick={openCreate}
          className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" /> הוספת פרויקט
        </button>
      </div>
      <div className="px-5 mb-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם פרויקט, עיר או סטטוס"
            className="h-10 pr-9 text-sm"
          />
        </div>
      </div>
      <div className="px-5 space-y-3">
        {filteredProjects.length === 0 && (
          <div className="gb-card p-6 text-center text-sm text-muted-foreground">
            לא נמצאו פרויקטים
          </div>
        )}
        {filteredProjects.map((p) => (
          <div key={p.id} className="gb-card p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{p.name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3" /> {p.city}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Tag>{p.buildingCount} בניינים</Tag>
                  <Tag>{p.apartmentCount} דירות</Tag>
                  <Tag accent>{statusLabel[p.status]}</Tag>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
              <button
                onClick={() => openEdit(p)}
                className="h-9 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center gap-1"
              >
                <Pencil className="h-3.5 w-3.5" /> עריכה
              </button>
              <button
                onClick={() => setDeleteId(p.id)}
                className="h-9 rounded-xl bg-destructive/10 text-destructive text-xs font-bold flex items-center justify-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> מחיקה
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">
              {form.id ? "עריכת פרויקט" : "הוספת פרויקט חדש"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">שם הפרויקט *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="לדוגמה: מגדלי הים" />
            </div>
            <div>
              <Label className="text-xs">עיר *</Label>
              <CityCombobox
                value={form.city}
                cities={cityNames}
                onChange={(city) => setForm({ ...form, city })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">מס׳ בניינים</Label>
                <Input type="number" min="0" value={form.buildingCount} onChange={(e) => setForm({ ...form, buildingCount: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">מס׳ דירות</Label>
                <Input type="number" min="0" value={form.apartmentCount} onChange={(e) => setForm({ ...form, apartmentCount: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div>
              <Label className="text-xs">סטטוס</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {(Object.keys(statusLabel) as ProjectStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setForm({ ...form, status: st })}
                    className={
                      "h-9 rounded-xl text-fs-xs font-bold border transition " +
                      (form.status === st ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border")
                    }
                  >
                    {statusLabel[st]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <button onClick={() => setOpen(false)} disabled={saving} className="h-10 px-4 rounded-xl bg-muted text-foreground text-sm font-bold flex-1 disabled:opacity-50">ביטול</button>
            <button onClick={save} disabled={saving} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex-1 disabled:opacity-50">
              {saving ? "שומר…" : form.id ? "שמירה" : "הוספה"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת פרויקט</AlertDialogTitle>
            <AlertDialogDescription className="text-right">הפרויקט יוסר מהרשימות הפעילות אך הנתונים יישמרו במערכת.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={saving} className="bg-destructive text-destructive-foreground">הסרה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function CityCombobox({ value, cities, onChange }: { value: string; cities: string[]; onChange: (city: string) => void }) {
  const [open, setOpen] = useState(false);

  const filteredCities = useMemo(() => {
    const q = value.trim().toLocaleLowerCase("he");
    const list = q ? cities.filter((city) => city.toLocaleLowerCase("he").includes(q)) : cities;
    return list.slice(0, 60);
  }, [cities, value]);

  const selectCity = (city: string) => {
    onChange(city);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="הקלידו עיר לבחירה"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && (
        <div className="absolute right-0 left-0 top-[calc(100%+0.25rem)] z-[80] max-h-56 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
          {filteredCities.length > 0 ? (
            filteredCities.map((city) => (
              <button
                key={city}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCity(city)}
                className="flex min-h-10 w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
              >
                <span>{city}</span>
                <Check className={cn("h-4 w-4", value === city ? "opacity-100" : "opacity-0")} />
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-center text-sm text-muted-foreground">לא נמצאו ערים</div>
          )}
        </div>
      )}
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={"text-fs-xs font-bold px-2 py-1 rounded-full " + (accent ? "bg-gold/15 text-primary" : "bg-muted text-muted-foreground")}>
      {children}
    </span>
  );
}
