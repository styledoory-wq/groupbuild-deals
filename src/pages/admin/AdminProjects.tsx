import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminKpiRow } from "@/components/admin/AdminKpiRow";
import { LoadingState } from "@/components/ds";
import { useApp, formatILS } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { useRegions } from "@/hooks/useRegions";
import {
  Building2, MapPin, Plus, Pencil, Trash2, Search, Settings2,
  Users, Tag, Eye, Home,
} from "lucide-react";
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
const statusPill: Record<ProjectStatus, string> = {
  planning: "bg-[#FEF3C7] text-[#92400E]",
  construction: "bg-[#DCFCE7] text-[#166534]",
  delivery: "bg-[#E0F2FE] text-[#075985]",
  completed: "bg-[#F1F5F9] text-[#475569]",
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
          if (d.supplier_id) (supplierByProj[d.project_id] ??= new Set()).add(d.supplier_id);
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
    let totalUsers = 0, totalDeposits = 0, totalDeals = 0, totalSuppliers = 0;
    Object.values(metrics).forEach((m) => {
      totalUsers += m.users; totalDeposits += m.deposits;
      totalDeals += m.deals; totalSuppliers += m.suppliers;
    });
    return { active: projects.length, apartments: totalApts, users: totalUsers, deposits: totalDeposits, deals: totalDeals, suppliers: totalSuppliers };
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
        description={`${projects.length} פרויקטים`}
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
          { label: "ספקים פעילים", value: kpi.suppliers },
          { label: "משתמשים רשומים", value: kpi.users.toLocaleString() },
          { label: "פיקדונות שנאספו", value: formatILS(kpi.deposits), tone: "positive" },
        ]}
      />

      <div dir="rtl" className="bg-white border-b border-[#ECEEF2] px-4 lg:px-8 py-2.5">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש פרויקט, כתובת או עיר…"
            className="h-9 pr-9 text-[13px] border-[#ECEEF2]"
          />
        </div>
      </div>

      <div className="p-2.5 lg:p-6">
        {loadingMetrics && projects.length === 0 ? (
          <LoadingState fullHeight={false} />
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white border border-[#ECEEF2] rounded-[14px] px-6 py-12 text-center text-[13px] text-[#6B7280] font-medium">
            לא נמצאו פרויקטים
          </div>
        ) : (
          <div dir="rtl" className="bg-white border border-[#ECEEF2] rounded-[14px] overflow-hidden">
            {/* Header — desktop */}
            <div className="hidden lg:grid grid-cols-[2fr_70px_80px_70px_80px_120px_140px_120px] gap-3 px-4 py-2.5 border-b border-[#ECEEF2] bg-[#F8F9FB] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              <div>פרויקט</div>
              <div className="text-center">דירות</div>
              <div className="text-center">משתמשים</div>
              <div className="text-center">ספקים</div>
              <div className="text-center">הצעות</div>
              <div className="text-center">פיקדונות</div>
              <div>השתתפות</div>
              <div className="text-left">פעולות</div>
            </div>

            <ul className="divide-y divide-[#F1F3F7]">
              {filteredProjects.map((p) => {
                const m = metrics[p.id] ?? { users: 0, suppliers: 0, deals: 0, deposits: 0, paid: 0 };
                const participation = p.apartmentCount > 0 ? Math.min(100, Math.round((m.users / p.apartmentCount) * 100)) : 0;
                const partTone = participation >= 50 ? "#0E6B5A" : participation >= 20 ? "#D97706" : "#9CA3AF";
                return (
                  <li key={p.id} className="hover:bg-[#FAFBFC] transition-colors">
                    {/* Desktop row */}
                    <div className="hidden lg:grid grid-cols-[2fr_70px_80px_70px_80px_120px_140px_120px] gap-3 px-4 py-2 items-center">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ProjThumb url={m.imageUrl} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="font-extrabold text-[13px] text-[#0F172A] truncate">{p.name}</div>
                            <span className={cn("shrink-0 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold whitespace-nowrap", statusPill[p.status])}>
                              {statusLabel[p.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-[#6B7280] mt-0.5">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{p.city}</span>
                          </div>
                        </div>
                      </div>
                      <Num value={p.apartmentCount} />
                      <Num value={m.users} />
                      <Num value={m.suppliers} />
                      <Num value={m.deals} />
                      <div className="text-center text-[12px] font-extrabold tabular-nums text-[#0E6B5A]">{formatILS(m.deposits)}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-[#F1F3F7] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${participation}%`, backgroundColor: partTone }} />
                        </div>
                        <span className="text-[11px] font-extrabold tabular-nums w-9 text-left" style={{ color: partTone }}>{participation}%</span>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn label="ניהול" onClick={() => navigate(`/committee/dashboard?project=${p.id}`)} icon={<Settings2 className="h-3.5 w-3.5" />} primary />
                        <IconBtn label="צפייה" onClick={() => navigate(`/committee/dashboard?project=${p.id}`)} icon={<Eye className="h-3.5 w-3.5" />} />
                        <IconBtn label="עריכה" onClick={() => openEdit(p)} icon={<Pencil className="h-3.5 w-3.5" />} />
                        <IconBtn label="מחיקה" onClick={() => setDeleteId(p.id)} icon={<Trash2 className="h-3.5 w-3.5" />} danger />
                      </div>
                    </div>

                    {/* Mobile row — ultra dense */}
                    <div className="lg:hidden px-2.5 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ProjThumb url={m.imageUrl} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="font-extrabold text-[12.5px] text-[#0F172A] truncate flex-1 min-w-0">{p.name}</div>
                            <span className={cn("shrink-0 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold whitespace-nowrap", statusPill[p.status])}>
                              {statusLabel[p.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-x-2 gap-y-0 text-[10.5px] text-[#374151] mt-0.5 flex-wrap">
                            <InlineKv label="דירות" value={p.apartmentCount} />
                            <Sep />
                            <InlineKv label="משת׳" value={m.users} />
                            <Sep />
                            <InlineKv label="ספקים" value={m.suppliers} />
                            <Sep />
                            <InlineKv label="הצעות" value={m.deals} />
                            <Sep />
                            <InlineKv label="פיק׳" value={formatILS(m.deposits)} tone="positive" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 pr-[48px]">
                        <div className="flex-1 h-1 rounded-full bg-[#F1F3F7] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${participation}%`, backgroundColor: partTone }} />
                        </div>
                        <span className="text-[10px] font-extrabold tabular-nums w-9 text-left" style={{ color: partTone }}>{participation}% השתת׳</span>
                        <div className="flex items-center gap-0.5">
                          <IconBtn label="ניהול" onClick={() => navigate(`/committee/dashboard?project=${p.id}`)} icon={<Settings2 className="h-3.5 w-3.5" />} primary compact />
                          <IconBtn label="עריכה" onClick={() => openEdit(p)} icon={<Pencil className="h-3.5 w-3.5" />} compact />
                          <IconBtn label="מחיקה" onClick={() => setDeleteId(p.id)} icon={<Trash2 className="h-3.5 w-3.5" />} danger compact />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
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

function ProjThumb({ url, size = 36 }: { url?: string | null; size?: number }) {
  return (
    <div
      className="rounded-[8px] overflow-hidden bg-[#F4F6FA] shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <Building2 className="h-4 w-4 text-[#9CA3AF]" />
      )}
    </div>
  );
}

function Num({ value }: { value: number | string }) {
  return <div className="text-center text-[12px] font-bold tabular-nums text-[#0F172A]">{value}</div>;
}

function InlineKv({ label, value, tone = "neutral" }: { label: string; value: React.ReactNode; tone?: "neutral" | "positive" }) {
  const cls = tone === "positive" ? "text-[#0E6B5A]" : "text-[#0F172A]";
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className={cn("font-extrabold tabular-nums", cls)}>{value}</span>
      <span className="text-[#9CA3AF] text-[10px]">{label}</span>
    </span>
  );
}

function Sep() {
  return <span className="text-[#E5E7EB] text-[10px]">·</span>;
}

function IconBtn({
  icon, label, onClick, primary, danger, compact,
}: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean; danger?: boolean; compact?: boolean }) {
  const size = compact ? "h-7 w-7" : "h-8 w-8";
  const cls = primary
    ? "bg-[#0E6B5A] text-white hover:bg-[#0a574a] border-[#0E6B5A]"
    : danger
      ? "bg-white text-[#B91C1C] hover:bg-[#FEE2E2] border-[#ECEEF2]"
      : "bg-white text-[#1F2937] hover:bg-[#F4F6FA] border-[#ECEEF2]";
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("rounded-[8px] border flex items-center justify-center transition-colors", size, cls)}
    >
      {icon}
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
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="התחל להקליד שם עיר…"
      />
      {open && filteredCities.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-[10px] border border-[#ECEEF2] bg-white shadow-lg">
          {filteredCities.map((city) => (
            <button
              key={city}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(city); setOpen(false); }}
              className="w-full text-right px-3 py-2 text-[13px] hover:bg-[#F4F6FA]"
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
