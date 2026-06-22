import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminKpiRow } from "@/components/admin/AdminKpiRow";
import { LoadingState } from "@/components/ds";
import { useApp, formatILS } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { useRegions } from "@/hooks/useRegions";
import { Building2, Check, MapPin, Plus, Pencil, Trash2, Search, Settings2, Users, Tag, Gift, TrendingUp } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
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

const emptyForm: FormState = { name: "", city: "", buildingCount: "", apartmentCount: "", status: "planning" };

type ProjectMetrics = {
  users: number;
  suppliers: number;
  deals: number;
  deposits: number;
  paid: number;
  imageUrl?: string | null;
};

export default function AdminProjects() {
  const navigate = useNavigate();
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
  const [metrics, setMetrics] = useState<Record<string, ProjectMetrics>>({});
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingMetrics(true);
      try {
        const [projRes, profilesRes, dealsRes, depositsRes] = await Promise.all([
          supabase.from("projects").select("id,image_url"),
          supabase.from("profiles").select("project_id").eq("is_deleted", false).not("project_id", "is", null),
          supabase.from("deals").select("id,project_id,supplier_id,status").eq("is_deleted", false),
          supabase.from("deposits").select("amount,deal_id,status").eq("status", "paid").eq("is_deleted", false),
        ]);

        const dealById = new Map((dealsRes.data ?? []).map((d) => [d.id, d]));
        const m: Record<string, ProjectMetrics> = {};
        const ensure = (id: string): ProjectMetrics => {
          if (!m[id]) m[id] = { users: 0, suppliers: 0, deals: 0, deposits: 0, paid: 0 };
          return m[id];
        };

        (projRes.data ?? []).forEach((p: { id: string; image_url: string | null }) => {
          ensure(p.id).imageUrl = p.image_url;
        });
        (profilesRes.data ?? []).forEach((p: { project_id: string | null }) => {
          if (p.project_id) ensure(p.project_id).users += 1;
        });
        const supplierByProj: Record<string, Set<string>> = {};
        (dealsRes.data ?? []).forEach((d) => {
          if (!d.project_id) return;
          if (d.status === "active") ensure(d.project_id).deals += 1;
          if (d.supplier_id) {
            (supplierByProj[d.project_id] ??= new Set()).add(d.supplier_id);
          }
        });
        Object.entries(supplierByProj).forEach(([pid, s]) => { ensure(pid).suppliers = s.size; });
        (depositsRes.data ?? []).forEach((dep: { amount: number; deal_id: string }) => {
          const deal = dealById.get(dep.deal_id);
          if (deal?.project_id) {
            const pm = ensure(deal.project_id);
            pm.deposits += Number(dep.amount ?? 0);
            pm.paid += 1;
          }
        });

        setMetrics(m);
      } catch (err) {
        console.error("[AdminProjects metrics]", err);
      } finally {
        setLoadingMetrics(false);
      }
    })();
  }, [projects.length]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.city, statusLabel[p.status]].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [projects, query]);

  const kpi = useMemo(() => {
    const totalApts = projects.reduce((s, p) => s + (p.apartmentCount ?? 0), 0);
    let totalUsers = 0, totalDeposits = 0;
    Object.values(metrics).forEach((m) => { totalUsers += m.users; totalDeposits += m.deposits; });
    return { active: projects.length, apartments: totalApts, users: totalUsers, deposits: totalDeposits };
  }, [projects, metrics]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Project) => {
    setForm({
      id: p.id, name: p.name ?? "", city: p.city ?? "",
      buildingCount: String(p.buildingCount ?? ""),
      apartmentCount: String(p.apartmentCount ?? ""),
      status: p.status ?? "planning",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.city.trim()) { toast.error("יש למלא שם פרויקט ועיר"); return; }
    const payload: Project = {
      id: form.id ?? `p_${Date.now()}`,
      name: form.name.trim(), city: form.city.trim(),
      buildingCount: parseInt(form.buildingCount) || 0,
      apartmentCount: parseInt(form.apartmentCount) || 0,
      status: form.status,
    };
    setSaving(true);
    try {
      const { error } = await supabase.from("projects").upsert({
        id: payload.id, name: payload.name, city: payload.city,
        building_count: payload.buildingCount, apartment_count: payload.apartmentCount,
        status: payload.status, is_active: true, is_deleted: false, deleted_at: null,
      });
      if (error) throw error;
      if (form.id) {
        setProjects(projects.map((p) => (p.id === form.id ? payload : p)));
        toast.success("הפרויקט נשמר");
      } else {
        setProjects([payload, ...projects]);
        toast.success("פרויקט חדש נוצר");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("projects")
        .update({ is_deleted: true, is_active: false, deleted_at: new Date().toISOString() })
        .eq("id", deleteId);
      if (error) throw error;
      setProjects(projects.filter((p) => p.id !== deleteId));
      toast.success("הפרויקט הוסר");
      setDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "מחיקה נכשלה");
    } finally { setSaving(false); }
  };

  return (
    <MobileShell>
      <AdminPageHeader
        title="ניהול פרויקטים"
        description={`${filteredProjects.length} מוצגים מתוך ${projects.length}`}
        actions={
          <button
            onClick={openCreate}
            className="h-9 px-3 rounded-[10px] bg-[#0E6B5A] text-white text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#0a574a] transition-colors"
          >
            <Plus className="h-4 w-4" /> פרויקט חדש
          </button>
        }
      />
      <AdminKpiRow
        items={[
          { label: "פרויקטים פעילים", value: kpi.active, tone: "positive" },
          { label: "סה״כ דירות", value: kpi.apartments },
          { label: "משתמשים רשומים", value: kpi.users },
          { label: "סה״כ פיקדונות", value: formatILS(kpi.deposits), tone: "positive" },
        ]}
      />

      <div dir="rtl" className="bg-white border-b border-[#ECEEF2] px-5 lg:px-8 py-3">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם פרויקט, עיר או סטטוס"
            className="h-9 pr-9 text-[13px] border-[#ECEEF2]"
          />
        </div>
      </div>

      <div className="p-3 lg:p-6">
        {loadingMetrics && projects.length === 0 ? (
          <LoadingState fullHeight={false} />
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white border border-[#ECEEF2] rounded-[14px] px-6 py-12 text-center text-[13px] text-[#6B7280] font-medium">
            לא נמצאו פרויקטים
          </div>
        ) : (
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((p) => {
              const m = metrics[p.id] ?? { users: 0, suppliers: 0, deals: 0, deposits: 0, paid: 0 };
              const participation = p.apartmentCount > 0 ? Math.min(100, Math.round((m.users / p.apartmentCount) * 100)) : 0;
              return (
                <article key={p.id} dir="rtl" className="bg-white border border-[#ECEEF2] rounded-[12px] overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 px-2.5 py-2 border-b border-[#F1F3F7]">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt="" className="h-8 w-8 rounded-[8px] object-cover bg-[#F4F6FA] shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded-[8px] bg-[#F4F6FA] flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-[#0E6B5A]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[12px] text-[#0F172A] truncate leading-tight">{p.name}</h3>
                      <div className="flex items-center gap-1 text-[10px] text-[#6B7280] mt-0.5 truncate">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{p.city}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#F1F3F7]">
                    <MetricRow label="דירות" value={p.apartmentCount} />
                    <MetricRow label="משתמשים" value={m.users} />
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#F1F3F7] border-t border-[#F1F3F7]">
                    <MetricRow label="הצעות" value={m.deals} />
                    <MetricRow label="ספקים" value={m.suppliers} />
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#F1F3F7] border-t border-[#F1F3F7]">
                    <MetricRow label="פיקדונות" value={formatILS(m.deposits)} tone="positive" compact />
                    <MetricRow label="פעילות" value={`${participation}%`}
                      tone={participation >= 50 ? "positive" : participation >= 20 ? "warning" : "neutral"} />
                  </div>

                  <div className="grid grid-cols-3 gap-1 p-1.5 border-t border-[#F1F3F7] mt-auto">
                    <ActionBtn icon={<Settings2 className="h-3 w-3" />} label="ניהול"
                      onClick={() => navigate(`/committee/dashboard?project=${p.id}`)} primary />
                    <ActionBtn icon={<Pencil className="h-3 w-3" />} label="עריכה" onClick={() => openEdit(p)} />
                    <ActionBtn icon={<Trash2 className="h-3 w-3" />} label="מחיקה" onClick={() => setDeleteId(p.id)} danger />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">{form.id ? "עריכת פרויקט" : "הוספת פרויקט חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">שם הפרויקט *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="לדוגמה: מגדלי הים" />
            </div>
            <div>
              <Label className="text-xs">עיר *</Label>
              <CityCombobox value={form.city} cities={cityNames} onChange={(city) => setForm({ ...form, city })} />
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
                  <button key={st} type="button" onClick={() => setForm({ ...form, status: st })}
                    className={"h-9 rounded-[12px] text-[12px] font-bold border transition " +
                      (form.status === st ? "bg-[#0E6B5A] text-white border-[#0E6B5A]" : "bg-white text-[#1F2937] border-[#ECEEF2]")}>
                    {statusLabel[st]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <button onClick={() => setOpen(false)} disabled={saving} className="h-10 px-4 rounded-[12px] bg-[#F4F6FA] text-[#1F2937] text-sm font-bold flex-1 disabled:opacity-50">ביטול</button>
            <button onClick={save} disabled={saving} className="h-10 px-4 rounded-[12px] bg-[#0E6B5A] text-white text-sm font-bold flex-1 disabled:opacity-50">
              {saving ? "שומר…" : form.id ? "שמירה" : "הוספה"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת פרויקט</AlertDialogTitle>
            <AlertDialogDescription className="text-right">הפרויקט יוסר מהרשימות הפעילות אך הנתונים יישמרו.</AlertDialogDescription>
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

function Metric({
  icon, label, value, tone = "neutral", compact,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode;
  tone?: "neutral" | "positive" | "warning"; compact?: boolean;
}) {
  const toneCls = tone === "positive" ? "text-[#0E6B5A]" : tone === "warning" ? "text-[#B45309]" : "text-[#0F172A]";
  return (
    <div className="px-3 py-2.5 min-w-0">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#9CA3AF]">
        {icon}<span>{label}</span>
      </div>
      <div className={cn("mt-0.5 font-extrabold tracking-tight truncate", compact ? "text-[12px]" : "text-[15px]", toneCls)}>
        {value}
      </div>
    </div>
  );
}

function ActionBtn({
  icon, label, onClick, primary, danger,
}: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean; danger?: boolean }) {
  const base = "h-8 rounded-[10px] text-[11px] font-bold flex items-center justify-center gap-1 transition-colors";
  const cls = primary
    ? "bg-[#0E6B5A] text-white hover:bg-[#0a574a]"
    : danger
      ? "bg-[#FEE2E2] text-[#B91C1C] hover:bg-[#FCA5A5]/40"
      : "bg-[#F4F6FA] text-[#1F2937] hover:bg-[#ECEEF2]";
  return (
    <button onClick={onClick} className={cn(base, cls)}>
      {icon}{label}
    </button>
  );
}

function CityCombobox({ value, cities, onChange }: { value: string; cities: string[]; onChange: (city: string) => void }) {
  const [open, setOpen] = useState(false);
  const filteredCities = useMemo(() => {
    const q = value.trim().toLocaleLowerCase("he");
    const list = q ? cities.filter((city) => city.toLocaleLowerCase("he").includes(q)) : cities;
    return list.slice(0, 60);
  }, [cities, value]);

  return (
    <div className="relative">
      <Input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
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
              <button key={city} type="button" onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(city); setOpen(false); }}
                className="flex min-h-10 w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none">
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
