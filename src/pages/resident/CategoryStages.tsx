import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X, Briefcase } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

const URBANIST = "'Urbanist', system-ui, sans-serif";
const EPILOGUE = "'Epilogue', system-ui, sans-serif";
const BRAND = "#0E6B5A";

type ProjectType = "new" | "reno" | "building";

type StageEntry = {
  key: string;
  title: string;
  emoji: string;
  catIds: string[]; // mapped to existing categories table
};

const TYPE_META: Record<ProjectType, { label: string; emoji: string; stages: StageEntry[] }> = {
  new: {
    label: "בנייה חדשה",
    emoji: "🏗️",
    stages: [
      { key: "planning", title: "תכנון והיתרים", emoji: "📐", catIds: ["architect", "interior-designer", "consultant", "construction-supervisor"] },
      { key: "structure", title: "שלד וביסוס", emoji: "🏗️", catIds: ["contractor", "skeleton"] },
      { key: "envelope", title: "מעטפת", emoji: "🧱", catIds: ["cladding", "windows", "doors"] },
      { key: "systems", title: "מערכות", emoji: "⚡", catIds: ["electric", "plumbing", "ac", "smart-home"] },
      { key: "finishes", title: "גמרים", emoji: "🎨", catIds: ["painting", "flooring", "gypsum", "carpentry", "closets", "lighting", "kitchen", "bath"] },
      { key: "outdoor", title: "פיתוח חוץ", emoji: "🌳", catIds: ["garden", "pergola"] },
    ],
  },
  reno: {
    label: "שיפוץ",
    emoji: "🔨",
    stages: [
      { key: "kitchen-bath", title: "מטבח ואמבטיה", emoji: "🚿", catIds: ["kitchen", "bath", "sanitary", "showers"] },
      { key: "paint-gypsum", title: "צבע וגבס", emoji: "🎨", catIds: ["painting", "gypsum"] },
      { key: "electric", title: "חשמל", emoji: "⚡", catIds: ["electric"] },
      { key: "plumbing", title: "אינסטלציה", emoji: "🔧", catIds: ["plumbing"] },
      { key: "ac", title: "מיזוג", emoji: "❄️", catIds: ["ac"] },
      { key: "flooring", title: "ריצוף", emoji: "🟫", catIds: ["flooring"] },
      { key: "doors-windows", title: "דלתות וחלונות", emoji: "🚪", catIds: ["doors", "windows", "security-door"] },
    ],
  },
  building: {
    label: "בניין משותף",
    emoji: "🏢",
    stages: [
      { key: "elevators", title: "מעליות", emoji: "🛗", catIds: [] },
      { key: "cleaning", title: "ניקיון", emoji: "🧽", catIds: ["cleaning"] },
      { key: "garden", title: "גינון", emoji: "🌿", catIds: ["garden"] },
      { key: "cctv", title: "מצלמות ואינטרקום", emoji: "📹", catIds: [] },
      { key: "entrance", title: "דלתות כניסה", emoji: "🚪", catIds: ["security-door", "doors"] },
      { key: "shared-electric", title: "חשמל משותף", emoji: "💡", catIds: ["electric", "lighting"] },
      { key: "facade", title: "שיפוץ חזית", emoji: "🧱", catIds: ["cladding", "painting"] },
      { key: "solar", title: "סולארי", emoji: "☀️", catIds: ["c_1778448823740"] },
    ],
  },
};

interface SupplierLite {
  id: string; business_name: string; short_description: string | null;
  logo_url: string | null; categories: string[]; service_areas: string[];
}

export default function CategoryStages() {
  const { categories } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const type = (params.get("type") as ProjectType) || "new";
  const baseMeta = TYPE_META[type] ?? TYPE_META.new;

  const cached = getCachedValue<SupplierLite[]>("categories:suppliers", 5 * 60_000);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>(() => cached ?? []);
  const [search, setSearch] = useState("");
  const [stageMap, setStageMap] = useState<Record<string, string[]> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await cachedQuery<SupplierLite[]>("categories:suppliers", async () => {
        const { data } = await supabase
          .from("suppliers")
          .select("id,business_name,short_description,logo_url,categories,service_areas")
          .eq("is_active", true).eq("is_deleted", false)
          .in("approval_status", ["approved", "active"])
          .order("business_name");
        return (data as SupplierLite[]) ?? [];
      }, 5 * 60_000);
      if (!cancelled) setSuppliers(data);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("category_project_stages")
        .select("stage_key,category_id,display_order")
        .eq("project_type", type)
        .order("display_order", { ascending: true });
      if (cancelled) return;
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r: { stage_key: string; category_id: string }) => {
        (map[r.stage_key] ||= []).push(r.category_id);
      });
      setStageMap(map);
    })();
    return () => { cancelled = true; };
  }, [type]);

  const meta = useMemo(() => {
    if (!stageMap) return baseMeta;
    return {
      ...baseMeta,
      stages: baseMeta.stages.map((s) => ({ ...s, catIds: stageMap[s.key] ?? s.catIds })),
    };
  }, [baseMeta, stageMap]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    suppliers.forEach((s) => (s.categories ?? []).forEach((c) => { map[c] = (map[c] ?? 0) + 1; }));
    return map;
  }, [suppliers]);

  const q = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!q) return [];
    return suppliers.filter((s) => {
      const catNames = (s.categories ?? [])
        .map((cid) => categories.find((c) => c.id === cid)?.name?.toLowerCase() ?? "").join(" ");
      return s.business_name.toLowerCase().includes(q)
        || (s.short_description ?? "").toLowerCase().includes(q)
        || (s.service_areas ?? []).some((a) => a.toLowerCase().includes(q))
        || catNames.includes(q);
    }).slice(0, 20);
  }, [q, suppliers, categories]);

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full"
      style={{ background: "#FBF8F3", fontFamily: EPILOGUE, color: "#2D2D2D" }}
    >
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] px-5 pt-[calc(env(safe-area-inset-top)+20px)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 120px)" }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate("/resident/categories")}
            className="flex items-center gap-1 text-[12.5px] font-bold text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
            שינוי סוג
          </button>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            צעד 2 מתוך 2
          </span>
        </div>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-[26px]"
            style={{ background: "linear-gradient(135deg,#F0F9F6 0%,#E3F1EC 100%)" }}
          >
            <span aria-hidden>{meta.emoji}</span>
          </div>
          <div>
            <h1 className="text-[24px] font-extrabold text-[#1A1A1A] leading-tight" style={{ fontFamily: URBANIST }}>
              {meta.label}
            </h1>
            <p className="text-[12.5px] text-gray-500">בחירת תחום פותחת את רשימת הספקים המומלצים</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex items-center mb-5">
          <input
            type="text" dir="rtl" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש איש מקצוע..."
            className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pr-11 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E6B5A]/20 focus:border-[#0E6B5A] transition-all shadow-sm shadow-black/5"
          />
          <Search className="absolute right-4 h-5 w-5 text-gray-400" strokeWidth={2.5} />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute left-3 h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center"
              aria-label="נקה"
            >
              <X className="h-3.5 w-3.5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Search results */}
        {q ? (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              {searchResults.length} תוצאות
            </p>
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 text-center text-[13px] text-gray-500 border border-gray-100">
                לא נמצאו תוצאות ל"{search}"
              </div>
            ) : searchResults.map((s) => {
              const catNames = (s.categories ?? [])
                .map((cid) => categories.find((c) => c.id === cid)?.name)
                .filter(Boolean).slice(0, 2).join(" · ");
              return (
                <button key={s.id} onClick={() => navigate(`/suppliers/${s.id}`)}
                  className="w-full bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center gap-3 text-right active:scale-[0.99] transition-transform">
                  <SupplierLogo name={s.business_name} logoUrl={s.logo_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-[#1A1A1A]" style={{ fontFamily: URBANIST }}>
                      {s.business_name}
                    </p>
                    <p className="text-[12px] text-gray-500">{catNames || "ספק"}</p>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-gray-400" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2.5">
            {meta.stages.map((stage, idx) => {
              const total = stage.catIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
              const firstCat = stage.catIds.find((id) => (counts[id] ?? 0) > 0) ?? stage.catIds[0];
              const dim = total === 0;

              const inner = (
                <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm shadow-black/[0.03]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-extrabold shrink-0 text-white"
                      style={{ background: BRAND, fontFamily: URBANIST }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div
                      className="w-11 h-11 flex items-center justify-center rounded-xl text-[22px] shrink-0"
                      style={{ background: "#F0F9F6" }}
                    >
                      <span aria-hidden>{stage.emoji}</span>
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-[15px] font-bold text-slate-900 leading-snug break-words"
                        style={{ fontFamily: URBANIST }}
                      >
                        {stage.title}
                      </div>
                      <div className="text-[11.5px] text-gray-400 font-medium mt-0.5">
                        {dim ? "ספקים יתווספו בקרוב" : `${total} ספקים זמינים`}
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-gray-300 shrink-0" />
                </div>
              );

              if (dim || !firstCat) return <div key={stage.key} className="opacity-55">{inner}</div>;
              return (
                <Link key={stage.key} to={`/resident/categories/${firstCat}`} className="block active:scale-[0.985] transition-transform">
                  {inner}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      {!q && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-[var(--app-max-w)]"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 12px)" }}
        >
          <button
            onClick={() => navigate("/resident/project-management")}
            className="w-full flex items-center justify-center gap-2 text-white font-extrabold py-4 rounded-2xl shadow-2xl shadow-[#0E6B5A]/30 active:scale-[0.98] transition-transform"
            style={{ background: BRAND, fontFamily: URBANIST }}
          >
            <Briefcase className="h-5 w-5" />
            מעבר לניהול הפרויקט שלי
          </button>
        </div>
      )}

      <BottomNav role="resident" />
    </div>
  );
}
