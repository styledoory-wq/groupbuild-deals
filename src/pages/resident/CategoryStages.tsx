import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Home as HomeIcon } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";
import { PROJECT_TYPE_META, stageMeta, type ProjectType } from "@/lib/stageCatalog";
import {
  illustrationForLabel,
  illustrationForProjectType,
  illustrationForStage,
} from "@/lib/stageIllustrations";

const URBANIST = "'Urbanist', system-ui, sans-serif";
const EPILOGUE = "'Epilogue', system-ui, sans-serif";

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
          className="rounded-[22px] mb-5 p-4 flex items-stretch gap-3 border border-white/80"
          style={{ background: "#F4EEE2", boxShadow: "var(--shadow-elevated)" }}
        >
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h2 className="text-[19px] font-extrabold text-[#1A1A1A] leading-tight" style={{ fontFamily: URBANIST }}>
              {stageInfo.title}
            </h2>
            <p className="text-[11.5px] text-gray-600 leading-snug mt-1">
              בחר שירות ונציג לך את הספקים המומלצים
            </p>
          </div>
          <div
            className="w-[112px] h-[100px] rounded-[16px] overflow-hidden bg-white/70 shrink-0"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <img
              src={illustrationForStage(resolvedStageKey, type)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>

        {/* Services grid — floating luxury squares with illustrations, 3–4 per row */}
        {services.length === 0 ? (
          <div
            className="rounded-[18px] p-6 text-center text-[13px] text-gray-500 bg-white/95 border border-white/80"
            style={{ boxShadow: "var(--shadow-elevated)" }}
          >
            שירותים יתווספו בקרוב בשלב זה
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {services.map((c) => {
              const soon = c.count === 0;
              return (
                <Link
                  key={c.id}
                  to={`/resident/categories/${c.id}`}
                  className="relative aspect-square flex flex-col overflow-hidden rounded-[18px] border border-white/90 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.96)",
                    boxShadow: "var(--shadow-elevated)",
                  }}
                >
                  {soon && (
                    <span
                      className="absolute top-1 right-1 z-10 text-[8px] font-bold px-1 py-0.5 rounded-md"
                      style={{ background: "#F1EFE8", color: "#8b8574" }}
                    >
                      בקרוב
                    </span>
                  )}
                  <div className="flex-1 min-h-0 w-full px-2 pt-2">
                    <div className="h-full w-full rounded-[12px] overflow-hidden bg-[#F4F1EA]">
                      <img
                        src={illustrationForLabel(c.name, illustrationForProjectType(type))}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                  </div>
                  <span
                    className="block text-[11px] font-extrabold text-[#1A1A1A] leading-tight text-center px-1.5 py-2 line-clamp-2"
                    style={{ fontFamily: URBANIST }}
                  >
                    {c.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav role="resident" />
    </div>
  );
}
