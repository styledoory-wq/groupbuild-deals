import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, UserPlus, Building2, Pencil, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Resident = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  project_id: string | null;
  is_active?: boolean;
  address?: string | null;
};

export default function AdminResidents() {
  const { projects, setProjects } = useApp();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // create form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCity, setNewProjectCity] = useState("");
  const [createNewProject, setCreateNewProject] = useState(false);

  // edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Resident | null>(null);
  const [eName, setEName] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eCity, setECity] = useState("");
  const [eAddress, setEAddress] = useState("");
  const [eProjectId, setEProjectId] = useState("");
  const [eActive, setEActive] = useState(true);

  const loadResidents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, city, project_id, is_active, address")
      .eq("user_type", "resident")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("שגיאה בטעינת דיירים");
    } else {
      setResidents((data ?? []) as Resident[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadResidents(); }, []);

  const resetForm = () => {
    setFullName(""); setEmail(""); setPassword(""); setPhone(""); setCity("");
    setProjectId(""); setNewProjectName(""); setNewProjectCity(""); setCreateNewProject(false);
  };

  const openEdit = (r: Resident) => {
    setEditing(r);
    setEName(r.full_name ?? "");
    setEPhone(r.phone ?? "");
    setECity(r.city ?? "");
    setEAddress(r.address ?? "");
    setEProjectId(r.project_id ?? "");
    setEActive(r.is_active ?? true);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!eName.trim()) {
      toast.error("שם חובה");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: eName.trim(),
          phone: ePhone.trim() || null,
          city: eCity.trim() || null,
          address: eAddress.trim() || null,
          project_id: eProjectId || null,
          is_active: eActive,
        })
        .eq("id", editing.id);
      if (error) throw error;
      toast.success("הדייר עודכן");
      setEditOpen(false);
      setEditing(null);
      await loadResidents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`למחוק את ${editing.full_name || editing.email}? פעולה זו אינה הפיכה.`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", editing.id);
      if (error) throw error;
      toast.success("הדייר נמחק");
      setEditOpen(false);
      setEditing(null);
      await loadResidents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "מחיקה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      toast.error("מלאו שם, אימייל וסיסמה (לפחות 6 תווים)");
      return;
    }
    setSaving(true);
    try {
      let finalProjectId = projectId;

      if (createNewProject) {
        if (!newProjectName.trim() || !newProjectCity.trim()) {
          toast.error("מלאו שם ועיר לפרויקט החדש");
          setSaving(false);
          return;
        }
        const newProj = {
          id: `p_${Date.now()}`,
          name: newProjectName.trim(),
          city: newProjectCity.trim(),
          buildingCount: 0,
          apartmentCount: 0,
          status: "planning" as const,
        };
        setProjects([newProj, ...projects]);
        finalProjectId = newProj.id;
      }

      const effectiveCity = city || (createNewProject ? newProjectCity : "");

      const { data, error } = await supabase.functions.invoke("admin-create-resident", {
        body: {
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          phone,
          city: effectiveCity,
          project_id: finalProjectId || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("הדייר נוסף בהצלחה");
      resetForm();
      setOpen(false);
      await loadResidents();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "הוספת דייר נכשלה";
      toast.error(`הוספת דייר נכשלה: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileShell>
      <PageHeader title="ניהול דיירים" subtitle={`${residents.length} דיירים פעילים`} />

      <div className="px-5 -mt-4 relative z-10 mb-4">
        <button
          onClick={() => setOpen(true)}
          className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold flex items-center justify-center gap-2"
        >
          <UserPlus className="h-5 w-5" /> הוספת דייר חדש
        </button>
      </div>

      <div className="px-5 space-y-2">
        {loading && <div className="text-center text-muted-foreground text-sm py-8">טוען…</div>}
        {!loading && residents.length === 0 && (
          <div className="gb-card p-6 text-center text-sm text-muted-foreground">אין דיירים עדיין</div>
        )}
        {residents.map((r) => {
          const project = projects.find((p) => p.id === r.project_id);
          const initial = (r.full_name || r.email || "?").charAt(0);
          return (
            <div key={r.id} className="gb-card p-3 flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-gradient-gold flex items-center justify-center text-primary font-bold">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{r.full_name || r.email}</h3>
                <p className="text-[11px] text-muted-foreground truncate">
                  {project?.name || "ללא פרויקט"}{r.city ? ` · ${r.city}` : ""}{r.phone ? ` · ${r.phone}` : ""}
                </p>
              </div>
              <button
                onClick={() => openEdit(r)}
                className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"
                aria-label="עריכה"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">הוספת דייר חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2 max-h-[70vh] overflow-y-auto pl-1">
            <div>
              <Label className="text-xs">שם מלא *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ישראל ישראלי" />
            </div>
            <div>
              <Label className="text-xs">אימייל *</Label>
              <Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.co.il" />
            </div>
            <div>
              <Label className="text-xs">סיסמה זמנית * (לפחות 6 תווים)</Label>
              <Input type="text" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="ססמה ראשונית" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">טלפון</Label>
                <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-0000000" />
              </div>
              <div>
                <Label className="text-xs">עיר</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="תל אביב" />
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-gold" /> פרויקט
                </Label>
                <button
                  type="button"
                  onClick={() => setCreateNewProject((v) => !v)}
                  className="text-[11px] font-bold text-primary underline"
                >
                  {createNewProject ? "בחירה מרשימה" : "+ פרויקט חדש"}
                </button>
              </div>

              {!createNewProject ? (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                >
                  <option value="">ללא פרויקט</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="שם הפרויקט"
                  />
                  <Input
                    value={newProjectCity}
                    onChange={(e) => setNewProjectCity(e.target.value)}
                    placeholder="עיר"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving} className="flex-1">ביטול</Button>
            <Button onClick={handleCreate} disabled={saving} className="flex-1">
              {saving ? "מוסיף…" : (<><Plus className="h-4 w-4 ml-1" /> הוספה</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditing(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת דייר</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 mt-2 max-h-[70vh] overflow-y-auto pl-1">
              <div>
                <Label className="text-xs">אימייל</Label>
                <Input value={editing.email ?? ""} disabled dir="ltr" className="bg-muted" />
              </div>
              <div>
                <Label className="text-xs">שם מלא *</Label>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">טלפון</Label>
                  <Input dir="ltr" value={ePhone} onChange={(e) => setEPhone(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">עיר</Label>
                  <Input value={eCity} onChange={(e) => setECity(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">כתובת</Label>
                <Input value={eAddress} onChange={(e) => setEAddress(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-gold" /> פרויקט
                </Label>
                <select
                  value={eProjectId}
                  onChange={(e) => setEProjectId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                >
                  <option value="">ללא פרויקט</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <Label className="text-sm">חשבון פעיל</Label>
                <Switch checked={eActive} onCheckedChange={setEActive} />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 gap-2 sm:gap-2 flex-row">
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="px-3">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving} className="flex-1">ביטול</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="flex-1">
              {saving ? "שומר…" : "שמירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
