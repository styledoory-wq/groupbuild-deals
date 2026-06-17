import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { Plus, Trash2, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type DbCat = { id: string; name: string; icon: string; display_order: number };

export default function AdminCategories() {
  const { setCategories } = useApp();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✨");
  const [list, setList] = useState<DbCat[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,icon,display_order")
        .eq("is_deleted", false)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as DbCat[];
      setList(rows);
      // sync into AppStore so other pages see changes immediately
      setCategories(rows.map((r) => ({ id: r.id, name: r.name, icon: r.icon })));

      // counts
      const cMap: Record<string, number> = {};
      await Promise.all(rows.map(async (c) => {
        const { count } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("category_id", c.id).eq("is_deleted", false);
        cMap[c.id] = count ?? 0;
      }));
      setCounts(cMap);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת הקטגוריות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const add = async () => {
    const nm = name.trim();
    if (!nm) { toast.error("יש להזין שם"); return; }
    setBusy(true);
    try {
      const id = `c_${Date.now()}`;
      const nextOrder = (list[list.length - 1]?.display_order ?? 0) + 10;
      const { error } = await supabase.from("categories").insert({
        id, name: nm, icon: icon || "🏷️", display_order: nextOrder,
      });
      if (error) throw error;
      toast.success("קטגוריה נוספה");
      setName(""); setIcon("✨");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "הוספה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("categories")
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", id);
      if (error) throw error;
      toast.success("הקטגוריה הוסרה");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "מחיקה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const move = async (id: string, direction: "up" | "down") => {
    const idx = list.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx];
    const b = list[swapIdx];
    // Optimistic UI swap
    const next = [...list];
    next[idx] = { ...b, display_order: a.display_order };
    next[swapIdx] = { ...a, display_order: b.display_order };
    setList(next);
    setBusy(true);
    try {
      const r1 = await supabase.from("categories").update({ display_order: b.display_order }).eq("id", a.id);
      const r2 = await supabase.from("categories").update({ display_order: a.display_order }).eq("id", b.id);
      if (r1.error || r2.error) throw r1.error ?? r2.error;
      setCategories(next.map((r) => ({ id: r.id, name: r.name, icon: r.icon })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שינוי הסדר נכשל");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell>
      <PageHeader title="ניהול קטגוריות" subtitle={`${list.length} קטגוריות`} />
      <div className="px-5 -mt-4 relative z-10 mb-4">
        <div className="gb-card p-3 flex items-center gap-2">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="h-11 w-14 text-center text-xl rounded-xl" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם קטגוריה" className="h-11 rounded-xl flex-1" />
          <Button onClick={add} disabled={busy} className="h-11 rounded-xl bg-[#2563EB] text-white font-bold px-3 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> טוען…
        </div>
      ) : (
        <div className="px-5 space-y-2">
          {list.map((c, idx) => (
            <div key={c.id} className="gb-card p-3 flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  onClick={() => move(c.id, "up")}
                  disabled={busy || idx === 0}
                  className="h-5 w-6 rounded-md hover:bg-muted disabled:opacity-30 flex items-center justify-center"
                  aria-label="העלה למעלה"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => move(c.id, "down")}
                  disabled={busy || idx === list.length - 1}
                  className="h-5 w-6 rounded-md hover:bg-muted disabled:opacity-30 flex items-center justify-center"
                  aria-label="הורד למטה"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-xl">{c.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{c.name}</div>
                <div className="text-fs-xs text-muted-foreground">{counts[c.id] ?? 0} עסקאות</div>
              </div>
              <button onClick={() => remove(c.id)} disabled={busy} className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center disabled:opacity-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <BottomNav role="admin" />
    </MobileShell>
  );
}
