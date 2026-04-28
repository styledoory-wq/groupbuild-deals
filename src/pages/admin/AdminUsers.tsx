import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Search, ShieldAlert, ShieldCheck, User as UserIcon, Building2, Briefcase } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useRegions } from "@/hooks/useRegions";
import { useApp } from "@/store/AppStore";

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  user_type: string;
  city: string | null;
  region: string | null;
  region_id: string | null;
  city_id: string | null;
  project_id: string | null;
  is_active: boolean;
  admin_notes: string | null;
  business_name: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  resident: "דייר",
  supplier: "ספק",
  admin: "אדמין",
};

export default function AdminUsers() {
  const { regions, citiesByRegion } = useRegions();
  const { projects } = useApp();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(`טעינה נכשלה: ${error.message}`);
    setUsers((data ?? []) as ProfileRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (typeFilter !== "all" && u.user_type !== typeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [u.full_name, u.email, u.phone, u.business_name, u.city]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [users, search, typeFilter]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editing.full_name?.trim() || null,
          phone: editing.phone?.trim() || null,
          city: editing.city?.trim() || null,
          region_id: editing.region_id || null,
          city_id: editing.city_id || null,
          project_id: editing.project_id || null,
          user_type: editing.user_type,
          is_active: editing.is_active,
          admin_notes: editing.admin_notes?.trim() || null,
        })
        .eq("id", editing.id);
      if (error) throw error;

      // Sync user_roles when type changes
      const role = editing.user_type === "admin" ? "admin"
        : editing.user_type === "supplier" ? "supplier"
        : "resident";
      // Remove other roles, add target role
      await supabase.from("user_roles").delete().eq("user_id", editing.id);
      await supabase.from("user_roles").insert({ user_id: editing.id, role });

      toast.success("המשתמש עודכן");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileShell>
      <PageHeader title="ניהול משתמשים" subtitle={`${users.length} משתמשים במערכת`} />

      <div className="px-5 -mt-4 relative z-10 space-y-3 mb-4">
        <div className="gb-card p-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, מייל, טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-0 bg-transparent focus-visible:ring-0"
          />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {([
            { id: "all", label: "הכל" },
            { id: "resident", label: "דיירים" },
            { id: "supplier", label: "ספקים" },
            { id: "admin", label: "אדמינים" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={
                "h-9 rounded-xl text-[11px] font-bold border transition " +
                (typeFilter === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-2 pb-24">
        {loading && <div className="text-center text-muted-foreground text-sm py-8">טוען…</div>}
        {!loading && filtered.length === 0 && (
          <div className="gb-card p-6 text-center text-sm text-muted-foreground">
            לא נמצאו משתמשים
          </div>
        )}
        {filtered.map((u) => {
          const Icon = u.user_type === "supplier" ? Briefcase : u.user_type === "admin" ? ShieldCheck : UserIcon;
          const project = projects.find((p) => p.id === u.project_id);
          return (
            <div key={u.id} className="gb-card p-3">
              <div className="flex items-center gap-3">
                <div className={
                  "h-11 w-11 rounded-full flex items-center justify-center " +
                  (u.is_active ? "bg-gradient-gold text-primary" : "bg-muted text-muted-foreground")
                }>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm truncate">
                      {u.full_name || u.business_name || u.email || "—"}
                    </h3>
                    {!u.is_active && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                        חסום
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {TYPE_LABEL[u.user_type] ?? u.user_type}
                    {u.email ? ` · ${u.email}` : ""}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
                    {u.city || "—"}{project ? ` · ${project.name}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => setEditing({ ...u })}
                  className="h-9 w-9 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center"
                  aria-label="עריכה"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              {u.admin_notes && (
                <div className="mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground italic">
                  📝 {u.admin_notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl" className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת משתמש</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">שם מלא</Label>
                <Input
                  value={editing.full_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">טלפון</Label>
                  <Input
                    dir="ltr"
                    value={editing.phone ?? ""}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">אימייל</Label>
                  <Input
                    dir="ltr"
                    value={editing.email ?? ""}
                    disabled
                    className="bg-muted/40"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">סוג משתמש</Label>
                <Select
                  value={editing.user_type}
                  onValueChange={(v) => setEditing({ ...editing, user_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resident">דייר</SelectItem>
                    <SelectItem value="supplier">ספק</SelectItem>
                    <SelectItem value="admin">אדמין</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">אזור</Label>
                  <Select
                    value={editing.region_id ?? ""}
                    onValueChange={(v) => setEditing({ ...editing, region_id: v, city_id: null })}
                  >
                    <SelectTrigger><SelectValue placeholder="בחר אזור" /></SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name_he}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">עיר</Label>
                  <Select
                    value={editing.city_id ?? ""}
                    onValueChange={(v) => {
                      const c = citiesByRegion(editing.region_id ?? "").find((x) => x.id === v);
                      setEditing({ ...editing, city_id: v, city: c?.name_he ?? editing.city });
                    }}
                    disabled={!editing.region_id}
                  >
                    <SelectTrigger><SelectValue placeholder={editing.region_id ? "בחר עיר" : "בחר אזור קודם"} /></SelectTrigger>
                    <SelectContent>
                      {editing.region_id && citiesByRegion(editing.region_id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name_he}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-gold" /> פרויקט משויך
                </Label>
                <select
                  value={editing.project_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, project_id: e.target.value || null })}
                  className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                >
                  <option value="">ללא פרויקט</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  משתמש פעיל
                </label>
                {!editing.is_active && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-destructive/10 text-destructive inline-flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> חסום
                  </span>
                )}
              </div>

              <div>
                <Label className="text-xs">הערות פנימיות (לאדמין בלבד)</Label>
                <Textarea
                  value={editing.admin_notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, admin_notes: e.target.value })}
                  placeholder="הערות שיוצגו רק לאדמין..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving} className="flex-1">
              ביטול
            </Button>
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "שומר…" : "שמירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
