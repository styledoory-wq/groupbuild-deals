import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/ds";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  Plus, Trash2, Loader2, ArrowUp, ArrowDown, ChevronDown, ChevronLeft,
  Pencil, Search as SearchIcon, RotateCcw, EyeOff, Eye, History, MoveRight, X,
  MoreHorizontal, Check, LayoutGrid, List, Home as HomeIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CategorySquareCard } from "@/components/categories/CategorySquareCard";
import { iconForCategory } from "@/lib/categoryIcons";

type Cat = {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  level: number;
  path: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  search_keywords: string[] | null;
};

type HistoryRow = {
  id: string;
  category_id: string;
  action: string;
  before_data: any;
  after_data: any;
  created_at: string;
  note: string | null;
};

const LEVEL_LABELS: Record<number, string> = { 1: "תחום", 2: "קטגוריה", 3: "תת־קטגוריה", 4: "שירות" };
const LEVEL_COLORS: Record<number, string> = {
  1: "bg-[#0E6B5A]/10 text-[#0E6B5A]",
  2: "bg-blue-100 text-blue-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-gray-100 text-gray-700",
};

function buildPath(all: Cat[], parentId: string | null, name: string): string {
  if (!parentId) return name;
  const parent = all.find((c) => c.id === parentId);
  if (!parent) return name;
  return `${parent.path ?? parent.name} > ${name}`;
}

function slug(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

async function logHistory(category_id: string, action: string, before: any, after: any, note?: string) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("category_history").insert({
      category_id, action, before_data: before, after_data: after,
      changed_by: userData?.user?.id ?? null, note: note ?? null,
    });
  } catch {}
}

export default function AdminCatalog() {
  const [all, setAll] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Cat | null>(null);
  const [addUnder, setAddUnder] = useState<Cat | null | "root">(null);
  const [historyFor, setHistoryFor] = useState<Cat | null>(null);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [moveNode, setMoveNode] = useState<Cat | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [actionsFor, setActionsFor] = useState<Cat | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "tree">("grid");
  const [gridParentId, setGridParentId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,icon,parent_id,level,path,display_order,is_active,is_deleted,search_keywords")
        .order("level", { ascending: true })
        .order("display_order", { ascending: true });
      if (error) throw error;
      setAll((data ?? []) as Cat[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    return all.filter((c) => (showDeleted ? c.is_deleted : !c.is_deleted));
  }, [all, showDeleted]);

  const childrenOf = (pid: string | null) =>
    visible.filter((c) => c.parent_id === pid).sort((a, b) => a.display_order - b.display_order);

  const roots = childrenOf(null);

  const matchesSearch = (c: Cat): boolean => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    if (c.name.toLowerCase().includes(s)) return true;
    if ((c.search_keywords ?? []).some((k) => k.toLowerCase().includes(s))) return true;
    // include if any descendant matches
    const descend = (pid: string): boolean => {
      const kids = visible.filter((x) => x.parent_id === pid);
      return kids.some((k) => matchesSearch(k));
    };
    return descend(c.id);
  };

  // Auto-expand search hits
  useEffect(() => {
    if (!search.trim()) return;
    const next = new Set(expanded);
    visible.forEach((c) => {
      const s = search.trim().toLowerCase();
      if (c.name.toLowerCase().includes(s) || (c.search_keywords ?? []).some((k) => k.toLowerCase().includes(s))) {
        // expand ancestors
        let p = c.parent_id;
        while (p) {
          next.add(p);
          const parent = all.find((x) => x.id === p);
          p = parent?.parent_id ?? null;
        }
      }
    });
    setExpanded(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const toggle = (id: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const move = async (c: Cat, dir: "up" | "down") => {
    const siblings = childrenOf(c.parent_id);
    const idx = siblings.findIndex((s) => s.id === c.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    setBusy(true);
    try {
      const r1 = await supabase.from("categories").update({ display_order: other.display_order }).eq("id", c.id);
      const r2 = await supabase.from("categories").update({ display_order: c.display_order }).eq("id", other.id);
      if (r1.error || r2.error) throw r1.error ?? r2.error;
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שינוי סדר נכשל");
    } finally { setBusy(false); }
  };

  const toggleActive = async (c: Cat) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("categories")
        .update({ is_active: !c.is_active }).eq("id", c.id);
      if (error) throw error;
      await logHistory(c.id, c.is_active ? "deactivate" : "activate", { is_active: c.is_active }, { is_active: !c.is_active });
      await load();
      toast.success(c.is_active ? "הושבת" : "הופעל");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "פעולה נכשלה");
    } finally { setBusy(false); }
  };

  const softDelete = async (c: Cat) => {
    if (!confirm(`למחוק את "${c.name}"? הפריט וכל תת־הפריטים יסומנו כמחוקים ויוסתרו.`)) return;
    setBusy(true);
    try {
      // collect descendants
      const ids: string[] = [];
      const walk = (pid: string) => {
        all.filter((x) => x.parent_id === pid).forEach((k) => { ids.push(k.id); walk(k.id); });
      };
      ids.push(c.id); walk(c.id);
      const { error } = await supabase.from("categories")
        .update({ is_deleted: true, is_active: false, deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      await logHistory(c.id, "soft_delete", { ids }, null, `נמחקו ${ids.length} פריטים`);
      toast.success("נמחק (ניתן לשחזר)");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "מחיקה נכשלה");
    } finally { setBusy(false); }
  };

  const restore = async (c: Cat) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("categories")
        .update({ is_deleted: false, is_active: true, deleted_at: null }).eq("id", c.id);
      if (error) throw error;
      await logHistory(c.id, "restore", null, { restored: true });
      toast.success("שוחזר");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שחזור נכשל");
    } finally { setBusy(false); }
  };

  const openHistory = async (c: Cat) => {
    setHistoryFor(c);
    const { data } = await supabase.from("category_history")
      .select("*").eq("category_id", c.id).order("created_at", { ascending: false }).limit(50);
    setHistoryRows((data ?? []) as HistoryRow[]);
  };

  const renderNode = (c: Cat, depth: number) => {
    const kids = childrenOf(c.id);
    const isOpen = expanded.has(c.id);
    const hasKids = kids.length > 0;
    if (search.trim() && !matchesSearch(c)) return null;
    return (
      <div key={c.id}>
        <div
          className={`flex items-center gap-2 py-2.5 px-2 rounded-lg hover:bg-muted/50 ${c.is_active ? "" : "opacity-60"}`}
          style={{ paddingInlineStart: depth * 16 + 8 }}
        >
          <button onClick={() => toggle(c.id)} className="w-6 h-6 flex items-center justify-center shrink-0" aria-label="פתח">
            {hasKids ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />) : <span className="w-4" />}
          </button>
          <span className="text-lg shrink-0 w-6 text-center">{c.icon || "•"}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${LEVEL_COLORS[c.level] ?? ""}`}>
            {LEVEL_LABELS[c.level] ?? `L${c.level}`}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold truncate">{c.name}</div>
            {c.search_keywords && c.search_keywords.length > 0 && (
              <div className="text-[10.5px] text-muted-foreground truncate">🔎 {c.search_keywords.slice(0, 6).join(" · ")}</div>
            )}
          </div>

          {showDeleted ? (
            <button onClick={() => restore(c)} className="h-8 px-2.5 rounded-md bg-[#0E6B5A]/10 text-[#0E6B5A] text-xs font-bold flex items-center gap-1 shrink-0" title="שחזר">
              <RotateCcw className="h-3.5 w-3.5" /> שחזר
            </button>
          ) : editMode ? (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => move(c, "up")} disabled={busy}
                className="h-9 w-9 rounded-md border border-border hover:bg-muted disabled:opacity-30 flex items-center justify-center" aria-label="למעלה">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button onClick={() => move(c, "down")} disabled={busy}
                className="h-9 w-9 rounded-md border border-border hover:bg-muted disabled:opacity-30 flex items-center justify-center" aria-label="למטה">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button onClick={() => setActionsFor(c)}
                className="h-9 w-9 rounded-md border border-border hover:bg-muted flex items-center justify-center" aria-label="פעולות">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => setActionsFor(c)}
              className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center shrink-0" aria-label="פעולות">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
        {isOpen && hasKids && <div>{kids.map((k) => renderNode(k, depth + 1))}</div>}
      </div>
    );
  };

  return (
    <MobileShell>
      <PageHeader title="ניהול עץ קטגוריות" subtitle={`${all.filter(c => !c.is_deleted).length} פריטים פעילים`} />

      <div className="px-5 -mt-4 relative z-10 mb-3 space-y-2">
        <div className="gb-card p-2.5 flex items-center gap-2">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש בעץ (שם או מילת מפתח)"
            className="h-9 rounded-lg flex-1 border-0 focus-visible:ring-0"
          />
          {search && (
            <button onClick={() => setSearch("")} className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddUnder("root")} className="h-9 rounded-lg bg-[#0E6B5A] text-white font-bold text-xs flex-1">
            <Plus className="h-3.5 w-3.5 ml-1" /> תחום ראשי חדש
          </Button>
          <Button
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode((v) => !v)}
            className={`h-9 rounded-lg text-xs ${editMode ? "bg-[#0E6B5A] text-white" : ""}`}
          >
            {editMode ? (<><Check className="h-3.5 w-3.5 ml-1" /> סיום</>) : (<><Pencil className="h-3.5 w-3.5 ml-1" /> עריכה</>)}
          </Button>
          <Button
            variant={showDeleted ? "default" : "outline"}
            onClick={() => setShowDeleted((v) => !v)}
            className="h-9 rounded-lg text-xs"
          >
            {showDeleted ? "הצג פעילים" : "פח המחזור"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setExpanded(new Set(all.map(c => c.id)))} className="h-8 rounded-lg text-xs flex-1">פתח הכל</Button>
          <Button variant="ghost" onClick={() => setExpanded(new Set())} className="h-8 rounded-lg text-xs flex-1">סגור הכל</Button>
        </div>
      </div>

      {loading ? (
        <LoadingState fullHeight={false} />
      ) : (
        <div className="px-3 pb-24">
          <div className="gb-card p-2 space-y-0.5">
            {showDeleted
              ? visible.map((c) => renderNode(c, 0))
              : roots.map((r) => renderNode(r, 0))}
            {visible.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {showDeleted ? "אין פריטים מחוקים" : "אין פריטים"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {editing && (
        <EditDialog cat={editing} all={all} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} />
      )}

      {/* Add dialog */}
      {addUnder !== null && (
        <AddDialog
          parent={addUnder === "root" ? null : addUnder}
          all={all}
          onClose={() => setAddUnder(null)}
          onSaved={async (id) => { setAddUnder(null); await load(); if (addUnder !== "root") setExpanded(s => new Set(s).add((addUnder as Cat).id)); }}
        />
      )}

      {/* Move dialog */}
      {moveNode && (
        <MoveDialog node={moveNode} all={all} onClose={() => setMoveNode(null)} onSaved={async () => { setMoveNode(null); await load(); }} />
      )}

      {/* History dialog */}
      <Dialog open={!!historyFor} onOpenChange={(o) => { if (!o) setHistoryFor(null); }}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>היסטוריית שינויים: {historyFor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            {historyRows.length === 0 && <div className="text-muted-foreground text-center py-4">אין רשומות</div>}
            {historyRows.map((h) => (
              <div key={h.id} className="border rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{h.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("he-IL")}</span>
                </div>
                {h.note && <div className="text-xs text-muted-foreground mt-1">{h.note}</div>}
                {h.before_data && (
                  <details className="text-[11px] mt-1"><summary>לפני</summary><pre className="whitespace-pre-wrap">{JSON.stringify(h.before_data, null, 2)}</pre></details>
                )}
                {h.after_data && (
                  <details className="text-[11px] mt-1"><summary>אחרי</summary><pre className="whitespace-pre-wrap">{JSON.stringify(h.after_data, null, 2)}</pre></details>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Actions sheet */}
      <Sheet open={!!actionsFor} onOpenChange={(o) => { if (!o) setActionsFor(null); }}>
        <SheetContent side="bottom" dir="rtl" className="rounded-t-2xl">
          <SheetHeader className="text-right">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-xl">{actionsFor?.icon || "•"}</span>
              <span>{actionsFor?.name}</span>
            </SheetTitle>
          </SheetHeader>
          {actionsFor && (
            <div className="grid grid-cols-2 gap-2 pt-4 pb-2">
              <Button variant="outline" className="h-12 justify-start gap-2" onClick={() => { const c = actionsFor; setActionsFor(null); setEditing(c); }}>
                <Pencil className="h-4 w-4 text-[#0E6B5A]" /> ערוך פרטים
              </Button>
              {actionsFor.level < 4 && (
                <Button variant="outline" className="h-12 justify-start gap-2" onClick={() => { const c = actionsFor; setActionsFor(null); setAddUnder(c); }}>
                  <Plus className="h-4 w-4 text-[#0E6B5A]" /> הוסף תת-פריט
                </Button>
              )}
              <Button variant="outline" className="h-12 justify-start gap-2" onClick={() => { const c = actionsFor; setActionsFor(null); setMoveNode(c); }}>
                <MoveRight className="h-4 w-4" /> העבר להורה אחר
              </Button>
              <Button variant="outline" className="h-12 justify-start gap-2" onClick={() => { const c = actionsFor; setActionsFor(null); void toggleActive(c); }}>
                {actionsFor.is_active
                  ? (<><EyeOff className="h-4 w-4 text-orange-500" /> השבת</>)
                  : (<><Eye className="h-4 w-4 text-[#0E6B5A]" /> הפעל</>)}
              </Button>
              <Button variant="outline" className="h-12 justify-start gap-2" onClick={() => { const c = actionsFor; setActionsFor(null); void openHistory(c); }}>
                <History className="h-4 w-4" /> היסטוריה
              </Button>
              <Button variant="outline" className="h-12 justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { const c = actionsFor; setActionsFor(null); void softDelete(c); }}>
                <Trash2 className="h-4 w-4" /> מחק
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <BottomNav role="admin" />
    </MobileShell>
  );
}

// ============================================================
// Sub-dialogs
// ============================================================

function EditDialog({ cat, all, onClose, onSaved }: { cat: Cat; all: Cat[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(cat.name);
  const [icon, setIcon] = useState(cat.icon ?? "");
  const [keywords, setKeywords] = useState((cat.search_keywords ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  const dup = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === cat.name) return false;
    return all.some((c) => c.id !== cat.id && !c.is_deleted && c.parent_id === cat.parent_id && c.name.trim() === trimmed);
  }, [name, cat, all]);

  const save = async () => {
    const nm = name.trim();
    if (!nm) { toast.error("שם חובה"); return; }
    if (dup) { toast.error("כבר קיים פריט באותו שם תחת אותו הורה"); return; }
    setSaving(true);
    try {
      const kw = keywords.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      const newPath = buildPath(all, cat.parent_id, nm);
      const before = { name: cat.name, icon: cat.icon, search_keywords: cat.search_keywords, path: cat.path };
      const after = { name: nm, icon: icon || null, search_keywords: kw, path: newPath };
      const { error } = await supabase.from("categories")
        .update({ name: nm, icon: icon || null, search_keywords: kw, path: newPath })
        .eq("id", cat.id);
      if (error) throw error;
      // update children paths
      const walk = async (parentId: string, parentPath: string) => {
        const kids = all.filter((x) => x.parent_id === parentId && !x.is_deleted);
        for (const k of kids) {
          const kp = `${parentPath} > ${k.name}`;
          await supabase.from("categories").update({ path: kp }).eq("id", k.id);
          await walk(k.id, kp);
        }
      };
      await walk(cat.id, newPath);
      await logHistory(cat.id, "edit", before, after);
      toast.success("נשמר");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שמירה נכשלה");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>עריכת {LEVEL_LABELS[cat.level]}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold">שם</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg" />
            {dup && <div className="text-xs text-destructive mt-1">שם זהה כבר קיים באותה רמה</div>}
          </div>
          <div>
            <label className="text-xs font-bold">אייקון (אמוג׳י)</label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="h-10 w-20 rounded-lg text-center text-xl" />
          </div>
          <div>
            <label className="text-xs font-bold">מילות מפתח וסינונימים (מופרדים בפסיק)</label>
            <Textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={3} className="rounded-lg text-sm" />
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-xs">
            <div className="font-bold">תצוגה מקדימה של הנתיב:</div>
            <div className="mt-1 text-muted-foreground">{buildPath(all, cat.parent_id, name || cat.name)}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={save} disabled={saving || dup} className="bg-[#0E6B5A] text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddDialog({ parent, all, onClose, onSaved }: { parent: Cat | null; all: Cat[]; onClose: () => void; onSaved: (id: string) => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [keywords, setKeywords] = useState("");
  const [saving, setSaving] = useState(false);
  const level = (parent?.level ?? 0) + 1;

  const dup = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    return all.some((c) => !c.is_deleted && c.parent_id === (parent?.id ?? null) && c.name.trim() === trimmed);
  }, [name, parent, all]);

  const save = async () => {
    const nm = name.trim();
    if (!nm) { toast.error("שם חובה"); return; }
    if (dup) { toast.error("כבר קיים פריט באותו שם"); return; }
    setSaving(true);
    try {
      const siblings = all.filter((c) => c.parent_id === (parent?.id ?? null) && !c.is_deleted);
      const nextOrder = (Math.max(0, ...siblings.map((s) => s.display_order)) || 0) + 10;
      const kw = keywords.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      const id = slug();
      const path = buildPath(all, parent?.id ?? null, nm);
      const { error } = await supabase.from("categories").insert({
        id, name: nm, icon: icon || null, parent_id: parent?.id ?? null, level, path,
        display_order: nextOrder, is_active: true, is_deleted: false, search_keywords: kw,
      });
      if (error) throw error;
      await logHistory(id, "create", null, { name: nm, parent_id: parent?.id ?? null, level });
      toast.success("נוסף");
      onSaved(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "הוספה נכשלה");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            הוספת {LEVEL_LABELS[level] ?? "פריט"}
            {parent && <span className="text-xs font-normal text-muted-foreground block mt-1">תחת: {parent.path ?? parent.name}</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="שם" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg" />
          {dup && <div className="text-xs text-destructive">שם זהה כבר קיים תחת אותו הורה</div>}
          <Input placeholder="אייקון (אמוג׳י)" value={icon} onChange={(e) => setIcon(e.target.value)} className="h-10 w-24 rounded-lg text-center text-xl" />
          <Textarea placeholder="מילות מפתח (מופרדות בפסיק)" value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={3} className="rounded-lg text-sm" />
          <div className="bg-muted/50 rounded-lg p-2 text-xs">
            <div className="font-bold">תצוגה מקדימה:</div>
            <div className="mt-1 text-muted-foreground">{buildPath(all, parent?.id ?? null, name || "…")}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={save} disabled={saving || dup} className="bg-[#0E6B5A] text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "הוסף"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({ node, all, onClose, onSaved }: { node: Cat; all: Cat[]; onClose: () => void; onSaved: () => void }) {
  const [targetId, setTargetId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // valid parents: not itself, not a descendant, level == node.level - 1, OR null for level 1
  const descendantIds = useMemo(() => {
    const set = new Set<string>([node.id]);
    const walk = (pid: string) => {
      all.filter((x) => x.parent_id === pid).forEach((k) => { set.add(k.id); walk(k.id); });
    };
    walk(node.id);
    return set;
  }, [node, all]);

  const candidates = useMemo(() => {
    if (node.level === 1) return [];
    return all.filter((c) => !c.is_deleted && c.level === node.level - 1 && !descendantIds.has(c.id));
  }, [all, node, descendantIds]);

  const save = async () => {
    if (!targetId && node.level > 1) { toast.error("בחר הורה יעד"); return; }
    setSaving(true);
    try {
      const newParent = all.find((c) => c.id === targetId) ?? null;
      // duplicate check
      const dup = all.some((c) => c.id !== node.id && !c.is_deleted && c.parent_id === (newParent?.id ?? null) && c.name.trim() === node.name.trim());
      if (dup) { toast.error("שם זהה כבר קיים תחת ההורה החדש"); setSaving(false); return; }
      const newPath = buildPath(all, newParent?.id ?? null, node.name);
      const before = { parent_id: node.parent_id, path: node.path };
      const after = { parent_id: newParent?.id ?? null, path: newPath };
      const { error } = await supabase.from("categories")
        .update({ parent_id: newParent?.id ?? null, path: newPath })
        .eq("id", node.id);
      if (error) throw error;
      // rewrite descendant paths
      const walk = async (parentId: string, parentPath: string) => {
        const kids = all.filter((x) => x.parent_id === parentId && !x.is_deleted);
        for (const k of kids) {
          const kp = `${parentPath} > ${k.name}`;
          await supabase.from("categories").update({ path: kp }).eq("id", k.id);
          await walk(k.id, kp);
        }
      };
      await walk(node.id, newPath);
      await logHistory(node.id, "move", before, after);
      toast.success("הועבר");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "העברה נכשלה");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>העברת "{node.name}"</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">מיקום נוכחי: {node.path ?? node.name}</div>
          {node.level === 1 ? (
            <div className="text-sm text-muted-foreground">תחום ראשי — אין הורה להעביר אליו.</div>
          ) : (
            <>
              <label className="text-xs font-bold">בחר הורה חדש ({LEVEL_LABELS[node.level - 1]})</label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="בחר..." /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.path ?? c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetId && (
                <div className="bg-muted/50 rounded-lg p-2 text-xs">
                  <div className="font-bold">נתיב חדש:</div>
                  <div className="mt-1 text-muted-foreground">
                    {buildPath(all, targetId, node.name)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          {node.level > 1 && (
            <Button onClick={save} disabled={saving || !targetId} className="bg-[#0E6B5A] text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "העבר"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
