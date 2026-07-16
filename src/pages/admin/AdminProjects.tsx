import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminTabsBar, type AdminTab } from "@/components/admin/AdminTabsBar";
import { LoadingState } from "@/components/ds";
import { useApp, formatILS } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { useRegions } from "@/hooks/useRegions";
import {
  Building2, MapPin, Plus, Pencil, Trash2, Search, Settings2,
  ArrowRight, Inbox, Users, Package, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Project, ProjectStatus } from "@/types";
import { MoreHorizontal } from "lucide-react";

const statusMeta: Record<ProjectStatus, { label: string; cls: string; dot: string }> = {
  planning:     { label: "בתכנון",  cls: "bg-amber-50 text-amber-700",    dot: "bg-amber-500" },
  construction: { label: "בבנייה",  cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  delivery:     { label: "במסירה",  cls: "bg-sky-50 text-sky-700",         dot: "bg-sky-500" },
  completed:    { label: "הושלם",   cls: "bg-slate-100 text-slate-600",    dot: "bg-slate-400" },
};

type FormState = {
  id?: string;
  name: string;
  city: string;
  buildingCount: string;
  apartmentCount: string;
  status: ProjectStatus;
  imageUrl: string;
};
const emptyForm: FormState = { name: "", city: "", buildingCount: "", apartmentCount: "", status: "planning", imageUrl: "" };

type ProjectMetrics = {
  users: number;
  suppliers: number;
  deals: number;
  deposits: number;
  paid: number;
  imageUrl?: string | null;
};

type TabKey = "all" | "planning" | "construction" | "delivery" | "completed";
const VALID_TABS: TabKey[] = ["all", "planning", "construction", "delivery", "completed"];

export default function AdminProjects() {
  const navigate = useNavigate();
  const { projects, setProjects } = useApp();
  const { cities } = useRegions();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const urlTab = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey = urlTab && VALID_TABS.includes(urlTab) ? urlTab : "all";
  const setActiveTab = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === "all") next.delete("tab");
    else next.set("tab", key);
    setSearchParams(next, { replace: true });
  };

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

  const tabCounts = useMemo(() => ({
    all: projects.length,
    planning: projects.filter((p) => p.status === "planning").length,
    construction: projects.filter((p) => p.status === "construction").length,
    delivery: projects.filter((p) => p.status === "delivery").length,
    completed: projects.filter((p) => p.status === "completed").length,
  }), [projects]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    let res = projects;
    if (activeTab !== "all") res = res.filter((p) => p.status === activeTab);
    if (q) {
      res = res.filter((p) =>
        [p.name, p.city, statusMeta[p.status]?.label].some((v) => (v ?? "").toLowerCase().includes(q)),
      );
    }
    return res;
  }, [projects, activeTab, query]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Project) => {
    setForm({
      id: p.id, name: p.name ?? "", city: p.city ?? "",
      buildingCount: String(p.buildingCount ?? ""),
      apartmentCount: String(p.apartmentCount ?? ""),
      status: p.status ?? "planning",
      imageUrl: metrics[p.id]?.imageUrl ?? "",
    });
    setOpen(true);
  };

  const [uploadingImage, setUploadingImage] = useState(false);
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("לא מחובר");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/projects/${form.id ?? "new"}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("deal-images").upload(path, file, {
        cacheControl: "3600", upsert: true, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("deal-images").getPublicUrl(path);
      setForm((f) => ({ ...f, imageUrl: pub.publicUrl }));
      toast.success("התמונה הועלתה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally { setUploadingImage(false); }
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
        status: payload.status, image_url: form.imageUrl || null,
        is_active: true, is_deleted: false, deleted_at: null,
      });
      if (error) throw error;
      if (form.id) {
        setProjects(projects.map((p) => (p.id === form.id ? payload : p)));
        toast.success("הפרויקט נשמר");
      } else {
        setProjects([payload, ...projects]);
        toast.success("פרויקט חדש נוצר");
      }
      setMetrics((m) => ({ ...m, [payload.id]: { ...(m[payload.id] ?? { users: 0, suppliers: 0, deals: 0, deposits: 0, paid: 0 }), imageUrl: form.imageUrl || null } }));
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

  const tabs: AdminTab[] = [
    { key: "all", label: "כולם", count: tabCounts.all },
    { key: "planning", label: "בתכנון", count: tabCounts.planning },
    { key: "construction", label: "בבנייה", count: tabCounts.construction },
    { key: "delivery", label: "במסירה", count: tabCounts.delivery },
    { key: "completed", label: "הושלמו", count: tabCounts.completed },
  ];

  const emptyLabel: Record<TabKey, string> = {
    all: "אין פרויקטים עדיין.",
    planning: "אין פרויקטים בשלב תכנון.",
    construction: "אין פרויקטים בבנייה.",
    delivery: "אין פרויקטים במסירה.",
    completed: "אין פרויקטים שהושלמו.",
  };

  return (
    <MobileShell>
      <div dir="rtl" className="min-h-screen bg-[#F7F8FA] pb-32">
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => navigate(-1)}
              aria-label="חזרה"
              className="h-9 w-9 -mr-1 rounded-full flex items-center justify-center text-[#0F172A]/70 hover:bg-white transition"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="flex-1" />
            <button
              onClick={openCreate}
              className="h-9 px-3.5 rounded-full bg-[#0F172A] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Plus className="h-4 w-4" />
              פרויקט חדש
            </button>
          </div>
          <h1 className="text-[26px] font-bold text-[#0F172A] tracking-tight leading-tight">
            פרויקטים
            <span className="ms-2 text-[15px] font-semibold text-[#8B94A3] tabular-nums">
              {tabCounts.all}
            </span>
          </h1>

          <div className="relative mt-4">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#8B94A3] pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי שם, עיר או סטטוס…"
              className="h-10 pr-9 text-[14px] rounded-xl bg-white border-[#EEF0F4] focus-visible:ring-1 focus-visible:ring-[#0F172A]/10"
            />
          </div>
        </header>

        {/* Tabs */}
        <div className="px-5 pb-3 overflow-x-auto scrollbar-none">
          <AdminTabsBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Grid */}
        <main className="px-4 pt-1">
          {loadingMetrics && projects.length === 0 ? (
            <LoadingState fullHeight={false} />
          ) : filteredProjects.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-white border border-[#EEF0F4] p-10 text-center flex flex-col items-center gap-2">
              <div className="h-11 w-11 rounded-full bg-[#F4F6FA] flex items-center justify-center">
                <Inbox className="h-5 w-5 text-[#8B94A3]" />
              </div>
              <p className="text-[14px] font-semibold text-[#0F172A]">
                {query ? "לא נמצאו פרויקטים תואמים" : emptyLabel[activeTab]}
              </p>
              {query && <p className="text-[12px] text-[#8B94A3]">נסה חיפוש אחר או בחר טאב אחר</p>}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {filteredProjects.map((p) => {
                const m = metrics[p.id] ?? { users: 0, suppliers: 0, deals: 0, deposits: 0, paid: 0 };
                const participation = p.apartmentCount > 0
                  ? Math.min(100, Math.round((m.users / p.apartmentCount) * 100))
                  : 0;
                const meta = statusMeta[p.status];

                return (
                  <li key={p.id}>
                    <div className="group relative h-full bg-white rounded-2xl border border-[#EEF0F4] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 hover:border-[#E1E5EC] hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.15)] overflow-hidden">
                      {/* Cover */}
                      <button
                        onClick={() => navigate(`/committee/dashboard?project=${p.id}`)}
                        className="relative w-full aspect-[4/3] bg-[#F4F6FA] block overflow-hidden"
                        aria-label={`פתח ${p.name}`}
                      >
                        {m.imageUrl ? (
                          <img src={m.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="h-7 w-7 text-[#CBD3DC]" />
                          </div>
                        )}
                        <span className={cn("absolute top-2 right-2 inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md shadow-sm", meta.cls)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                          {meta.label}
                        </span>
                        <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                          <ProjectMenu
                            onOpen={() => navigate(`/committee/dashboard?project=${p.id}`)}
                            onManage={() => navigate(`/committee/dashboard?project=${p.id}`)}
                            onEdit={() => openEdit(p)}
                            onDelete={() => setDeleteId(p.id)}
                          />
                        </div>
                      </button>

                      {/* Body */}
                      <div className="p-3">
                        <button
                          onClick={() => navigate(`/committee/dashboard?project=${p.id}`)}
                          className="text-right w-full"
                        >
                          <h3 className="font-bold text-[13.5px] text-[#0F172A] leading-tight line-clamp-1">
                            {p.name}
                          </h3>
                          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#8B94A3]">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{p.city}</span>
                          </div>
                        </button>

                        {/* Micro stats */}
                        <div className="mt-2 flex items-center justify-between text-[10.5px] text-[#6B7280]">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="tabular-nums font-semibold text-[#374151]">{m.users}/{p.apartmentCount || "—"}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            <span className="tabular-nums font-semibold text-[#374151]">{m.deals}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#0E6B5A]">
                            <Wallet className="h-3 w-3" />
                            <span className="tabular-nums font-bold">{formatILS(m.deposits)}</span>
                          </span>
                        </div>

                        {/* Participation bar */}
                        <div className="mt-2 h-1 rounded-full bg-[#F1F3F7] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0E6B5A] transition-all"
                            style={{ width: `${participation}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>

        {/* Create/edit dialog */}
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
                  {(Object.keys(statusMeta) as ProjectStatus[]).map((st) => (
                    <button key={st} type="button" onClick={() => setForm({ ...form, status: st })}
                      className={"h-9 rounded-[12px] text-[12px] font-bold border transition " +
                        (form.status === st ? "bg-[#0E6B5A] text-white border-[#0E6B5A]" : "bg-white text-[#1F2937] border-[#ECEEF2]")}>
                      {statusMeta[st].label}
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
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

function ProjectMenu({
  onOpen, onManage, onEdit, onDelete,
}: { onOpen: () => void; onManage: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-8 w-8 rounded-lg bg-white/85 backdrop-blur border border-white/60 text-[#0F172A] hover:bg-white transition inline-flex items-center justify-center shadow-sm"
          aria-label="פעולות"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onOpen}><Building2 className="h-4 w-4 me-2" /> פתח דשבורד</DropdownMenuItem>
        <DropdownMenuItem onClick={onManage}><Settings2 className="h-4 w-4 me-2" /> ניהול</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4 me-2" /> עריכה</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4 me-2" /> מחיקה
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
