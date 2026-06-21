import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { LoadingState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";

type ProjectType = "new" | "reno" | "building";

type StageDef = { key: string; title: string; emoji: string };

const TYPES: { value: ProjectType; label: string; emoji: string; stages: StageDef[] }[] = [
  {
    value: "new", label: "בנייה חדשה", emoji: "🏗️",
    stages: [
      { key: "planning", title: "תכנון והיתרים", emoji: "📐" },
      { key: "structure", title: "שלד וביסוס", emoji: "🏗️" },
      { key: "envelope", title: "מעטפת", emoji: "🧱" },
      { key: "systems", title: "מערכות", emoji: "⚡" },
      { key: "finishes", title: "גמרים", emoji: "🎨" },
      { key: "outdoor", title: "פיתוח חוץ", emoji: "🌳" },
    ],
  },
  {
    value: "reno", label: "שיפוץ", emoji: "🔨",
    stages: [
      { key: "kitchen-bath", title: "מטבח ואמבטיה", emoji: "🚿" },
      { key: "paint-gypsum", title: "צבע וגבס", emoji: "🎨" },
      { key: "electric", title: "חשמל", emoji: "⚡" },
      { key: "plumbing", title: "אינסטלציה", emoji: "🔧" },
      { key: "ac", title: "מיזוג", emoji: "❄️" },
      { key: "flooring", title: "ריצוף", emoji: "🟫" },
      { key: "doors-windows", title: "דלתות וחלונות", emoji: "🚪" },
    ],
  },
  {
    value: "building", label: "בניין משותף", emoji: "🏢",
    stages: [
      { key: "elevators", title: "מעליות", emoji: "🛗" },
      { key: "cleaning", title: "ניקיון", emoji: "🧽" },
      { key: "garden", title: "גינון", emoji: "🌿" },
      { key: "cctv", title: "מצלמות ואינטרקום", emoji: "📹" },
      { key: "entrance", title: "דלתות כניסה", emoji: "🚪" },
      { key: "shared-electric", title: "חשמל משותף", emoji: "💡" },
      { key: "facade", title: "שיפוץ חזית", emoji: "🧱" },
      { key: "solar", title: "סולארי", emoji: "☀️" },
    ],
  },
];

type Row = { project_type: ProjectType; stage_key: string; category_id: string };

export default function AdminProjectStages() {
  const { categories } = useApp();
  const [type, setType] = useState<ProjectType>("new");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [addingFor, setAddingFor] = useState<string | null>(null);

  const currentType = TYPES.find((t) => t.value === type)!;

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("category_project_stages")
      .select("project_type,stage_key,category_id")
      .eq("project_type", type);
    if (error) toast.error("טעינה נכשלה");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [type]);

  const byStage = useMemo(() => {
    const m: Record<string, string[]> = {};
    rows.forEach((r) => { (m[r.stage_key] ||= []).push(r.category_id); });
    return m;
  }, [rows]);

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
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
    const order = (byStage[stageKey]?.length ?? 0) * 10 + 10;
    const { error } = await supabase
      .from("category_project_stages")
      .insert({ project_type: type, stage_key: stageKey, category_id: catId, display_order: order });
    if (error) toast.error("הוספה נכשלה"); else { toast.success("נוסף"); setAddingFor(null); await load(); }
    setBusyKey(null);
  };

  return (
    <MobileShell>
      <PageHeader title="תחומי פרויקט" subtitle="ניהול קטגוריות בכל שלב" />
      <div className="px-4 pb-32 space-y-4">
        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => {
            const active = t.value === type;
            return (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-[12.5px] font-bold transition ${
                  active ? "border-[#0E6B5A] bg-[#0E6B5A]/5 text-[#0E6B5A]" : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <span className="text-2xl">{t.emoji}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? <LoadingState /> : (
          <div className="space-y-3">
            {currentType.stages.map((stage) => {
              const ids = byStage[stage.key] ?? [];
              const available = categories.filter((c) => !ids.includes(c.id));
              return (
                <div key={stage.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                    <span className="text-xl">{stage.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold text-[14.5px] text-slate-900">{stage.title}</div>
                      <div className="text-[11.5px] text-gray-500">{ids.length} קטגוריות</div>
                    </div>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => setAddingFor(addingFor === stage.key ? null : stage.key)}
                      className="h-8 px-2 text-[#0E6B5A]"
                    >
                      <Plus className="h-4 w-4" />
                      הוסף
                    </Button>
                  </div>

                  {addingFor === stage.key && (
                    <div className="p-3 border-b border-gray-100 bg-amber-50/40">
                      {available.length === 0 ? (
                        <div className="text-[12.5px] text-gray-500 text-center py-2">כל הקטגוריות כבר משויכות</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {available.map((c) => {
                            const k = `add:${stage.key}:${c.id}`;
                            return (
                              <button
                                key={c.id}
                                disabled={busyKey === k}
                                onClick={() => add(stage.key, c.id)}
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

                  <div className="p-3">
                    {ids.length === 0 ? (
                      <div className="text-[12.5px] text-gray-400 text-center py-2">אין קטגוריות בתחום זה</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {ids.map((cid) => {
                          const k = `${stage.key}:${cid}`;
                          return (
                            <span key={cid} className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 bg-[#0E6B5A]/8 border border-[#0E6B5A]/15 rounded-full text-[12.5px] text-[#0E6B5A] font-medium">
                              <span>{catIcon(cid)}</span>
                              {catName(cid)}
                              <button
                                disabled={busyKey === k}
                                onClick={() => remove(stage.key, cid)}
                                className="w-5 h-5 rounded-full bg-white hover:bg-red-50 hover:text-red-600 flex items-center justify-center disabled:opacity-50"
                                aria-label="הסר"
                              >
                                {busyKey === k ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
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
