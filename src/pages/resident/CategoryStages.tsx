import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Home as HomeIcon } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";
import { PROJECT_TYPE_META, stageMeta, type ProjectType } from "@/lib/stageCatalog";

const URBANIST = "'Urbanist', system-ui, sans-serif";
const EPILOGUE = "'Epilogue', system-ui, sans-serif";
const BRAND = "#0E6B5A";

interface SupplierLite { id: string; categories: string[] }
type SupplierRow = { id: string; categories: string[] | null };
type SupplierCategoryRow = { supplier_id: string; category_id: string };

export default function CategoryStages() {
  const { categories } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const type = ((params.get("type") as ProjectType) || "new") as ProjectType;
  const stageKeyParam = params.get("stage") || "";
  const typeMeta = PROJECT_TYPE_META[type] ?? PROJECT_TYPE_META.new;

  const [catIds, setCatIds] = useState<string[]>([]);
  const [resolvedStageKey, setResolvedStageKey] = useState<string>(stageKeyParam);

  // Load categories for this stage from DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let sk = stageKeyParam;
      if (!sk) {
        // fallback: pick first stage of the type
        const { data: first } = await supabase
          .from("category_project_stages")
          .select("stage_key,display_order")
          .eq("project_type", type)
          .order("display_order", { ascending: true })
          .limit(1);
        sk = first?.[0]?.stage_key ?? "";
      }
      if (cancelled) return;
      setResolvedStageKey(sk);
      if (!sk) { setCatIds([]); return; }
      const { data } = await supabase
        .from("category_project_stages")
        .select("category_id,display_order")
        .eq("project_type", type)
        .eq("stage_key", sk)
        .order("display_order", { ascending: true });
      if (cancelled) return;
      setCatIds((data ?? []).map((r: { category_id: string }) => r.category_id));
    })();
    return () => { cancelled = true; };
  }, [type, stageKeyParam]);

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

  const stageInfo = stageMeta(type, resolvedStageKey);

  const services = useMemo(() => {
    return catIds.flatMap((id) => {
      const c = categories.find((cc) => cc.id === id);
      if (!c) return [];
      return [{
        id,
        name: c.name,
        emoji: c.icon ?? stageInfo.emoji,
        count: counts[id] ?? 0,
      }];
    });
  }, [catIds, categories, counts, stageInfo.emoji]);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/resident/categories")}
            aria-label="חזרה"
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronRight className="h-5 w-5 text-[#1A1A1A]" strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-bold text-gray-500 leading-tight">{typeMeta.label}</p>
            <h1 className="text-[18px] font-extrabold text-[#1A1A1A] leading-tight" style={{ fontFamily: URBANIST }}>
              {stageInfo.title}
            </h1>
          </div>
          <button
            onClick={() => navigate("/resident/dashboard")}
            aria-label="בית"
            className="w-9 h-9 rounded-full bg-[#E8F2EC] flex items-center justify-center active:scale-95 transition-transform"
          >
            <HomeIcon className="h-5 w-5 text-[#0E6B5A]" strokeWidth={2.2} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="text-[11.5px] text-gray-500 mb-4 flex items-center gap-1.5 flex-wrap">
          <button onClick={() => navigate("/resident/categories")} className="hover:text-[#0E6B5A] font-medium">
            {typeMeta.label}
          </button>
          <ChevronLeft className="h-3 w-3 shrink-0" />
          <span className="font-extrabold text-[#1A1A1A]">{stageInfo.title}</span>
        </div>

        {/* Stage hero */}
        <div
          className="rounded-3xl mb-5 p-4 flex items-center gap-3"
          style={{ background: "#F4EEE2" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/70 grid place-items-center text-[30px] shrink-0">
            <span aria-hidden>{stageInfo.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[19px] font-extrabold text-[#1A1A1A] leading-tight" style={{ fontFamily: URBANIST }}>
              {stageInfo.title}
            </h2>
            <p className="text-[11.5px] text-gray-600 leading-snug mt-1">
              בחר שירות ונציג לך את הספקים המומלצים
            </p>
          </div>
        </div>

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
                  <div className="text-[15px] font-extrabold text-[#1A1A1A] leading-snug" style={{ fontFamily: URBANIST }}>
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
      </div>

      <BottomNav role="resident" />
    </div>
  );
}
