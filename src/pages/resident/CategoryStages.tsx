import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Home as HomeIcon, Check, FileCheck2 } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";
import { PROJECT_TYPE_META, stageMeta, type ProjectType } from "@/lib/stageCatalog";
import stagePlanningImg from "@/assets/stage-planning.jpg";

const URBANIST = "'Urbanist', system-ui, sans-serif";
const EPILOGUE = "'Epilogue', system-ui, sans-serif";
const BRAND = "#0E6B5A";

type StageEntry = { key: string; title: string; emoji: string; catIds: string[] };

interface SupplierLite {
  id: string; categories: string[];
}
type SupplierRow = { id: string; categories: string[] | null };
type SupplierCategoryRow = { supplier_id: string; category_id: string };

export default function CategoryStages() {
  const { categories } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const type = ((params.get("type") as ProjectType) || "new") as ProjectType;
  const typeMeta = PROJECT_TYPE_META[type] ?? PROJECT_TYPE_META.new;

  const [stages, setStages] = useState<StageEntry[]>([]);
  const [stageKey, setStageKey] = useState<string>("");

  // Load stages for this project type from DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("category_project_stages")
        .select("stage_key,category_id,display_order")
        .eq("project_type", type)
        .order("display_order", { ascending: true });
      if (cancelled) return;
      const orderedKeys: string[] = [];
      const byStage: Record<string, string[]> = {};
      (data ?? []).forEach((r: { stage_key: string; category_id: string }) => {
        if (!(r.stage_key in byStage)) { byStage[r.stage_key] = []; orderedKeys.push(r.stage_key); }
        byStage[r.stage_key].push(r.category_id);
      });
      const built = orderedKeys.map((k) => {
        const m = stageMeta(type, k);
        return { key: k, title: m.title, emoji: m.emoji, catIds: byStage[k] };
      });
      setStages(built);
      const stored = (() => { try { return localStorage.getItem(`gb:stage:${type}`); } catch { return null; } })();
      const next = stored && built.some((s) => s.key === stored) ? stored : built[0]?.key ?? "";
      setStageKey(next);
    })();
    return () => { cancelled = true; };
  }, [type]);

  useEffect(() => {
    try { if (stageKey) localStorage.setItem(`gb:stage:${type}`, stageKey); } catch {}
  }, [type, stageKey]);

  // Supplier counts per category
  const cached = getCachedValue<SupplierLite[]>("categories:suppliers:v2", 5 * 60_000);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>(() => cached ?? []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await cachedQuery<SupplierLite[]>("categories:suppliers:v2", async () => {
        const { data } = await supabase
          .from("suppliers")
          .select("id,categories")
          .eq("is_active", true).eq("is_deleted", false)
          .in("approval_status", ["approved", "active"]);
        const rows = ((data ?? []) as SupplierRow[]).map((s) => ({ id: s.id, categories: s.categories ?? [] }));
        const ids = rows.map((s) => s.id);
        const { data: joins } = ids.length
          ? await supabase.from("supplier_categories").select("supplier_id,category_id").in("supplier_id", ids)
          : { data: [] };
        const by: Record<string, string[]> = {};
        ((joins ?? []) as SupplierCategoryRow[]).forEach((r) => { (by[r.supplier_id] ||= []).push(r.category_id); });
        return rows.map((s) => ({ id: s.id, categories: by[s.id]?.length ? by[s.id] : s.categories }));
      }, 5 * 60_000);
      if (!cancelled) setSuppliers(data);
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    suppliers.forEach((s) => (s.categories ?? []).forEach((c) => { map[c] = (map[c] ?? 0) + 1; }));
    return map;
  }, [suppliers]);

  const stageIdx = Math.max(0, stages.findIndex((s) => s.key === stageKey));
  const activeStage = stages[stageIdx];
  const totalStages = stages.length;

  // Scroll timeline to active
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = timelineRef.current?.querySelector<HTMLElement>(`[data-tl="${stageKey}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [stageKey]);

  const services = useMemo(() => {
    if (!activeStage) return [];
    return activeStage.catIds.flatMap((id) => {
      const c = categories.find((cc) => cc.id === id);
      if (!c) return [];
      return [{
        id,
        name: c.name,
        emoji: c.icon ?? activeStage.emoji,
        count: counts[id] ?? 0,
      }];
    });
  }, [activeStage, categories, counts]);

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full"
      style={{ background: "#FBF8F3", fontFamily: EPILOGUE, color: "#2D2D2D" }}
    >
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] px-5 pt-[calc(env(safe-area-inset-top)+16px)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 32px)" }}
      >
        {/* Header: back, title, home */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate("/resident/categories")}
            aria-label="חזרה"
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronRight className="h-5 w-5 text-[#1A1A1A]" strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <h1 className="text-[19px] font-extrabold text-[#1A1A1A] leading-tight" style={{ fontFamily: URBANIST }}>
              {typeMeta.label}
            </h1>
            <p className="text-[11.5px] text-gray-500 leading-tight mt-0.5">בחר שלב בפרויקט</p>
          </div>
          <button
            onClick={() => navigate("/resident/dashboard")}
            aria-label="בית"
            className="w-9 h-9 rounded-full bg-[#E8F2EC] flex items-center justify-center active:scale-95 transition-transform"
          >
            <HomeIcon className="h-5 w-5 text-[#0E6B5A]" strokeWidth={2.2} />
          </button>
        </div>

        {/* Horizontal timeline */}
        <div
          ref={timelineRef}
          className="flex items-start gap-0 overflow-x-auto pb-3 mb-5 -mx-5 px-5"
          style={{ scrollbarWidth: "none" }}
        >
          {stages.map((s, i) => {
            const isActive = i === stageIdx;
            const isDone = i < stageIdx;
            const isLast = i === stages.length - 1;
            return (
              <div key={s.key} data-tl={s.key} className="flex items-start shrink-0">
                <button
                  onClick={() => setStageKey(s.key)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] active:scale-95 transition-transform"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-extrabold"
                    style={{
                      background: isActive ? BRAND : isDone ? "#D9EBE3" : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : isDone ? BRAND : "#B5B0A6",
                      border: isActive
                        ? `2px solid ${BRAND}`
                        : `1.5px solid ${isDone ? "#B7D9CC" : "#E4E1D9"}`,
                      boxShadow: isActive ? `0 6px 14px -6px ${BRAND}80` : "none",
                      fontFamily: URBANIST,
                    }}
                  >
                    {isActive ? (
                      <FileCheck2 className="h-4 w-4" strokeWidth={2.4} />
                    ) : isDone ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className="text-[10px] font-bold text-center leading-tight px-0.5 break-words"
                    style={{
                      color: isActive ? BRAND : "#8A8478",
                      fontFamily: URBANIST,
                    }}
                  >
                    {s.title}
                  </span>
                </button>
                {!isLast && (
                  <div
                    className="h-[2px] w-4 mt-[18px] shrink-0 rounded-full"
                    style={{ background: i < stageIdx ? "#B7D9CC" : "#E4E1D9" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Active stage hero */}
        {activeStage && (
          <div
            className="relative overflow-hidden rounded-3xl mb-5 flex items-stretch gap-3 p-4"
            style={{ background: "#F4EEE2", boxShadow: "0 8px 20px -14px rgba(0,0,0,0.12)" }}
          >
            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
              <div>
                <p className="text-[11px] font-bold text-gray-600 mb-1" style={{ fontFamily: URBANIST }}>
                  שלב {stageIdx + 1} מתוך {totalStages}
                </p>
                <h2 className="text-[22px] font-extrabold text-[#1A1A1A] leading-tight" style={{ fontFamily: URBANIST }}>
                  {activeStage.title}
                </h2>
              </div>
              <p className="text-[11.5px] text-gray-600 leading-snug mt-2">
                בחר שירות ונציג לך את הספקים המומלצים לשלב זה
              </p>
            </div>
            <div className="shrink-0 w-[112px] h-[100px] rounded-2xl overflow-hidden bg-white/50">
              <img
                src={stagePlanningImg}
                alt={activeStage.title}
                width={960}
                height={512}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Services list */}
        <div className="space-y-2">
          {services.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-[13px] text-gray-500 border border-gray-100">
              ספקים יתווספו בקרוב בשלב זה
            </div>
          ) : (
            services.map((c) => (
              <Link
                key={c.id}
                to={`/resident/categories/${c.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm shadow-black/[0.03] active:scale-[0.99] transition-transform"
              >
                <ChevronLeft className="h-4 w-4 text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0 text-right">
                  <div
                    className="text-[15px] font-extrabold text-[#1A1A1A] leading-snug"
                    style={{ fontFamily: URBANIST }}
                  >
                    {c.name}
                  </div>
                  <div className="text-[11.5px] text-gray-500 mt-0.5">
                    {c.count > 0 ? `${c.count} ספקים` : "בקרוב"}
                  </div>
                </div>
                <div
                  className="w-11 h-11 flex items-center justify-center rounded-xl text-[22px] shrink-0"
                  style={{ background: "#F4F1EA" }}
                >
                  <span aria-hidden>{c.emoji}</span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Help card */}
        <div className="mt-5 rounded-2xl bg-white border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: BRAND }}
          >
            <FileCheck2 className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[13px] font-extrabold text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
              לא בטוח מאיפה להתחיל?
            </p>
            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
              ענה על כמה שאלות קצרות ונכוון אותך לשלב הנכון בפרויקט שלך
            </p>
          </div>
          <button
            onClick={() => navigate("/resident/create-demand")}
            className="shrink-0 inline-flex items-center gap-1 text-[12px] font-bold rounded-full px-3.5 py-2 border-2"
            style={{ color: BRAND, borderColor: BRAND, fontFamily: URBANIST }}
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={3} />
            ייעוץ חינם
          </button>
        </div>
      </div>

      <BottomNav role="resident" />
    </div>
  );
}
