import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Home as HomeIcon } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { CategorySquareCard } from "@/components/categories/CategorySquareCard";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";
import { PROJECT_TYPE_META, stageMeta, type ProjectType } from "@/lib/stageCatalog";
import { iconForCategory, iconForStage } from "@/lib/categoryIcons";

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let sk = stageKeyParam;
      if (!sk) {
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
  const StageIcon = iconForStage(resolvedStageKey);

  const services = useMemo(() => {
    return catIds.flatMap((id) => {
      const c = categories.find((cc) => cc.id === id);
      if (!c) return [];
      return [{
        id,
        name: c.name,
        count: counts[id] ?? 0,
      }];
    });
  }, [catIds, categories, counts]);

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full bg-slate-50"
      style={{ fontFamily: "'Heebo', system-ui, sans-serif", color: "#0F172A" }}
    >
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] px-4 pt-[calc(env(safe-area-inset-top)+16px)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 32px)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/resident/categories")}
            aria-label="חזרה"
            className="w-9 h-9 rounded-full bg-white border border-[#EEF1EF] flex items-center justify-center active:scale-95 transition-transform"
            style={{ boxShadow: "0 4px 12px rgba(16,24,40,0.08)" }}
          >
            <ChevronRight className="h-5 w-5 text-[#1A1A1A]" strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-bold text-gray-500 leading-tight">{typeMeta.label}</p>
            <h1 className="text-[18px] font-extrabold text-[#1A1A1A] leading-tight">
              {stageInfo.title}
            </h1>
          </div>
          <button
            onClick={() => navigate("/resident/dashboard")}
            aria-label="בית"
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: "rgba(14,107,90,0.10)", color: BRAND }}
          >
            <HomeIcon className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>

        <div className="text-[11.5px] text-gray-500 mb-4 flex items-center gap-1.5 flex-wrap">
          <button onClick={() => navigate("/resident/categories")} className="hover:text-[#0E6B5A] font-medium">
            {typeMeta.label}
          </button>
          <ChevronLeft className="h-3 w-3 shrink-0" />
          <span className="font-extrabold text-[#1A1A1A]">{stageInfo.title}</span>
        </div>

        {/* Stage summary */}
        <div
          className="rounded-[22px] mb-5 p-4 flex items-center gap-3 bg-white border border-[#EEF1EF]"
          style={{ boxShadow: "0 8px 20px -14px rgba(16,24,40,0.14)" }}
        >
          <span
            className="grid place-items-center w-14 h-14 rounded-full shrink-0"
            style={{ background: "rgba(14,107,90,0.08)", color: BRAND }}
          >
            <StageIcon size={28} strokeWidth={1.7} />
          </span>
          <div className="flex-1 min-w-0 text-right">
            <h2 className="text-[18px] font-extrabold text-[#1A1A1A] leading-tight">
              {stageInfo.title}
            </h2>
            <p className="text-[12px] text-gray-500 leading-snug mt-1">
              בחר שירות ונציג לך את הספקים המומלצים
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[16px] font-extrabold text-[#1A1A1A] m-0">שירותים בתחום</h3>
          <span className="text-[12px] font-semibold text-[#6B7280]">{services.length} קטגוריות</span>
        </div>

        {services.length === 0 ? (
          <div
            className="rounded-[22px] p-6 text-center text-[13px] text-gray-500 bg-white border border-[#EEF1EF]"
            style={{ boxShadow: "0 8px 20px -14px rgba(16,24,40,0.14)" }}
          >
            שירותים יתווספו בקרוב בשלב זה
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3.5">
            {services.map((c) => (
              <Link key={c.id} to={`/resident/categories/${c.id}`} className="block">
                <CategorySquareCard
                  title={c.name}
                  Icon={iconForCategory(c.id, c.name)}
                  count={c.count}
                  as="div"
                />
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav role="resident" />
    </div>
  );
}
