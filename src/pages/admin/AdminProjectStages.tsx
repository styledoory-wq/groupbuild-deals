import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { LoadingState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { PROJECT_TYPE_META, STAGE_LABELS, stageMeta, type ProjectType } from "@/lib/stageCatalog";

const PROJECT_TYPES: ProjectType[] = ["new", "reno", "building", "maintenance", "outdoor"];

type Row = { project_type: ProjectType; stage_key: string; category_id: string; display_order: number };

export default function AdminProjectStages() {
  const { categories } = useApp();
  const [type, setType] = useState<ProjectType>("new");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [addingFor, setAddingFor] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("category_project_stages")
      .select("project_type,stage_key,category_id,display_order")
      .eq("project_type", type)
      .order("display_order", { ascending: true });
    if (error) toast.error("טעינה נכשלה");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [type]);

  // Stages present in DB (in execution order), unioned with any that only exist in the label catalog
  const stageKeys = useMemo(() => {
    const seen: string[] = [];
    const seenSet = new Set<string>();
    rows.forEach((r) => { if (!seenSet.has(r.stage_key)) { seen.push(r.stage_key); seenSet.add(r.stage_key); } });
    Object.keys(STAGE_LABELS[type] ?? {}).forEach((k) => { if (!seenSet.has(k)) { seen.push(k); seenSet.add(k); } });
    return seen;
  }, [rows, type]);

  const byStage = useMemo(() => {
    const m: Record<string, Row[]> = {};
    rows.forEach((r) => { (m[r.stage_key] ||= []).push(r); });
    return m;
  }, [rows]);

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "קטגוריה לא פעילה";
  const catIcon = (id: string) => categories.find((c) => c.id === id)?.icon ?? "🏷️";

  const remove = async (stageKey: string, catId: string) => {
    const k = `${stageKey}:${catId}`;
    setBusyKey(k);
    const { error } = await supabase
      .from("category_project_stages")
      .delete()
      .eq("project_type", type)
      .eq("stage_key", stageKey)
      .eq("category_id", catId);
    if (error) toast.error("מחיקה נכשלה"); else { toast.success("הוסר"); await load(); }
    setBusyKey(null);
  };

  const add = async (stageKey: string, catId: string) => {
    const k = `add:${stageKey}:${catId}`;
    setBusyKey(k);
    const order = ((byStage[stageKey]?.length ?? 0) + 1) * 10;
    const { error } = await supabase
      .from("category_project_stages")
      .insert({ project_type: type, stage_key: stageKey, category_id: catId, display_order: order });
    if (error) toast.error("הוספה נכשלה"); else { toast.success("נוסף"); setAddingFor(null); await load(); }
    setBusyKey(null);
  };

  // Move a category up/down within its stage by swapping display_order
  const moveWithinStage = async (stageKey: string, catId: string, dir: "up" | "down") => {
    const list = byStage[stageKey] ?? [];
    const idx = list.findIndex((r) => r.category_id === catId);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx];
    const b = list[swapIdx];
    setBusyKey(`mv:${stageKey}:${catId}`);
    const r1 = await supabase.from("category_project_stages")
      .update({ display_order: b.display_order })
      .eq("project_type", type).eq("stage_key", stageKey).eq("category_id", a.category_id);
    const r2 = await supabase.from("category_project_stages")
      .update({ display_order: a.display_order })
      .eq("project_type", type).eq("stage_key", stageKey).eq("category_id", b.category_id);
    if (r1.error || r2.error) toast.error("שינוי סדר נכשל"); else await load();
    setBusyKey(null);
  };

  return (
    <MobileShell>
      <PageHeader title="תחומי פרויקט" subtitle="ניהול קטגוריות בכל שלב, לפי סדר ביצוע" />
      <div className="px-4 pb-32 space-y-4">
        {/* Type selector */}
        <div className="grid grid-cols-5 gap-1.5">
          {PROJECT_TYPES.map((t) => {
            const active = t === type;
            const m = PROJECT_TYPE_META[t];
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl border text-[11px] font-bold transition ${
                  active ? "border-[#0E6B5A] bg-[#0E6B5A]/5 text-[#0E6B5A]" : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="leading-tight text-center">{m.label}</span>
              </button>
            );
          })}
        </div>

        {loading ? <LoadingState /> : (
          <div className="space-y-3">
            {stageKeys.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-[13px]">אין שלבים משויכים למסלול זה</div>
            )}
            {stageKeys.map((sk, sIdx) => {
              const m = stageMeta(type, sk);
              const list = byStage[sk] ?? [];
              const usedIds = new Set(list.map((r) => r.category_id));
              const available = categories.filter((c) => !usedIds.has(c.id));
              return (
                <div key={sk} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-extrabold text-white bg-[#0E6B5A] shrink-0">
                      {String(sIdx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xl">{m.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold text-[14.5px] text-slate-900">{m.title}</div>
                      <div className="text-[11.5px] text-gray-500">{list.length} קטגוריות</div>
                    </div>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => setAddingFor(addingFor === sk ? null : sk)}
                      className="h-8 px-2 text-[#0E6B5A]"
                    >
                      <Plus className="h-4 w-4" />
                      הוסף
                    </Button>
                  </div>

                  {addingFor === sk && (
                    <div className="p-3 border-b border-gray-100 bg-amber-50/40 max-h-72 overflow-y-auto">
                      {available.length === 0 ? (
                        <div className="text-[12.5px] text-gray-500 text-center py-2">כל הקטגוריות כבר משויכות</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {available.map((c) => {
                            const k = `add:${sk}:${c.id}`;
                            return (
                              <button
                                key={c.id}
                                disabled={busyKey === k}
                                onClick={() => add(sk, c.id)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-full text-[12px] hover:border-[#0E6B5A] hover:bg-[#0E6B5A]/5 disabled:opacity-50"
                              >
                                {busyKey === k ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>{c.icon}</span>}
                                {c.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-3 space-y-1.5">
                    {list.length === 0 ? (
                      <div className="text-[12.5px] text-gray-400 text-center py-2">אין קטגוריות בתחום זה</div>
                    ) : list.map((r, i) => {
                      const rk = `${sk}:${r.category_id}`;
                      const mvBusy = busyKey === `mv:${sk}:${r.category_id}`;
                      return (
                        <div key={r.category_id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                          <div className="flex flex-col">
                            <button onClick={() => moveWithinStage(sk, r.category_id, "up")}
                              disabled={mvBusy || i === 0}
                              className="h-5 w-6 rounded hover:bg-white disabled:opacity-30 flex items-center justify-center">
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button onClick={() => moveWithinStage(sk, r.category_id, "down")}
                              disabled={mvBusy || i === list.length - 1}
                              className="h-5 w-6 rounded hover:bg-white disabled:opacity-30 flex items-center justify-center">
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-lg">{catIcon(r.category_id)}</span>
                          <span className="flex-1 text-[13px] font-medium text-slate-800">{catName(r.category_id)}</span>
                          <span className="text-[10.5px] text-gray-400 font-mono">{r.display_order}</span>
                          <button
                            disabled={busyKey === rk}
                            onClick={() => remove(sk, r.category_id)}
                            className="h-7 w-7 rounded-lg bg-white hover:bg-red-50 hover:text-red-600 flex items-center justify-center disabled:opacity-50"
                            aria-label="הסר"
                          >
                            {busyKey === rk ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}
