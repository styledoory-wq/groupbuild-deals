import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Search, X, Briefcase, Check } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

const URBANIST = "'Urbanist', system-ui, sans-serif";
const EPILOGUE = "'Epilogue', system-ui, sans-serif";
const BRAND = "#0E6B5A";
const BRAND_DARK = "#0A4F43";

type ProjectType = "new" | "reno" | "building";

type StageEntry = {
  key: string;
  title: string;
  emoji: string;
  catIds: string[];
};

const TYPES: { id: ProjectType; emoji: string; title: string }[] = [
  { id: "building", emoji: "🏢", title: "בניין משותף" },
  { id: "new", emoji: "🏡", title: "בנייה חדשה" },
  { id: "reno", emoji: "🧰", title: "שיפוץ" },
];

const TYPE_META: Record<ProjectType, { label: string; sectionTitle: string; stages: StageEntry[] }> = {
  new: {
    label: "בנייה חדשה",
    sectionTitle: "שלבי הבנייה",
    stages: [
      { key: "planning", title: "תכנון והיתרים", emoji: "📐", catIds: ["architect", "interior-designer", "consultant", "construction-supervisor"] },
      { key: "structure", title: "שלד וביסוס", emoji: "🏗️", catIds: ["contractor", "skeleton"] },
      { key: "envelope", title: "מעטפת", emoji: "🏠", catIds: ["cladding", "windows", "doors"] },
      { key: "systems", title: "מערכות", emoji: "⚡", catIds: ["electric", "plumbing", "ac", "smart-home"] },
      { key: "finishes", title: "גמרים", emoji: "🛋️", catIds: ["painting", "flooring", "gypsum", "carpentry", "closets", "lighting", "kitchen", "bath"] },
      { key: "outdoor", title: "חוץ ופיתוח", emoji: "🌳", catIds: ["garden", "pergola"] },
    ],
  },
  reno: {
    label: "שיפוץ",
    sectionTitle: "תחומי השיפוץ",
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
    sectionTitle: "תחומי הבניין",
    stages: [
      { key: "elevators", title: "מעליות", emoji: "🛗", catIds: [] },
      { key: "cleaning", title: "ניקיון", emoji: "🧽", catIds: ["cleaning"] },
      { key: "garden", title: "גינון", emoji: "🌿", catIds: ["garden"] },
      { key: "cctv", title: "מצלמות", emoji: "📹", catIds: [] },
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

export default function CategoriesList() {
  const navigate = useNavigate();
  const { categories } = useApp();

  const [type, setType] = useState<ProjectType>(() => {
    try { return (localStorage.getItem("gb:projectType") as ProjectType) || "new"; } catch { return "new"; }
  });
  const meta = TYPE_META[type];
  const [stageKey, setStageKey] = useState<string>(() => {
    try { return localStorage.getItem(`gb:stage:${type}`) || meta.stages[0].key; }
    catch { return meta.stages[0].key; }
  });
  const stage = meta.stages.find((s) => s.key === stageKey) ?? meta.stages[0];

  useEffect(() => {
    try { localStorage.setItem("gb:projectType", type); } catch {}
    const stored = (() => { try { return localStorage.getItem(`gb:stage:${type}`); } catch { return null; } })();
    setStageKey(stored || TYPE_META[type].stages[0].key);
  }, [type]);

  useEffect(() => {
    try { localStorage.setItem(`gb:stage:${type}`, stageKey); } catch {}
  }, [type, stageKey]);

  const [search, setSearch] = useState("");
  const cached = getCachedValue<SupplierLite[]>("categories:suppliers", 5 * 60_000);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>(() => cached ?? []);

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

  // Cards shown for the selected stage — map to categories table for names
  const stageCards = useMemo(() => {
    return stage.catIds.map((id) => {
      const c = categories.find((cc) => cc.id === id);
      return {
        id,
        name: c?.name ?? id,
        description: (c as any)?.description ?? "",
        emoji: c?.icon ?? stage.emoji,
        count: counts[id] ?? 0,
      };
    });
  }, [stage, categories, counts]);

  // Stage progress (visual only, persisted)
  const totalStages = meta.stages.length;
  const stageIdx = meta.stages.findIndex((s) => s.key === stageKey);
  const completedStages = Math.max(0, Math.min(totalStages, stageIdx));

  // Scroll active stage into view
  const stageStripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stageStripRef.current?.querySelector<HTMLElement>(`[data-stage="${stageKey}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [stageKey]);

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full"
      style={{ background: "#FBF8F3", fontFamily: EPILOGUE, color: "#2D2D2D" }}
    >
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] px-5 pt-[calc(env(safe-area-inset-top)+18px)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 72px)" }}
      >
        {/* Title */}
        <h1
          className="text-center text-[22px] font-extrabold text-[#1A1A1A] mb-4"
          style={{ fontFamily: URBANIST }}
        >
          קטגוריות
        </h1>

        {/* Search */}
        <div className="relative flex items-center mb-5">
          <input
            type="text" dir="rtl" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש שירות, ספק או מוצר..."
            className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pr-11 pl-10 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0E6B5A]/20 focus:border-[#0E6B5A] transition-all shadow-sm shadow-black/5"
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

        {/* Search results override */}
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
          <>
            {/* Project type cards */}
            <div className="grid grid-cols-3 gap-2.5 mb-7">
              {TYPES.map((t) => {
                const selected = t.id === type;
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className="relative bg-white rounded-2xl p-3 pt-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.97]"
                    style={{
                      border: selected ? `1.5px solid ${BRAND}` : "1px solid #EAE7DF",
                      boxShadow: selected
                        ? `0 10px 24px -14px ${BRAND}55`
                        : "0 6px 16px -12px rgba(0,0,0,0.08)",
                    }}
                  >
                    {selected && (
                      <span
                        className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: BRAND }}
                      >
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                    )}
                    <span className="text-[36px] leading-none" aria-hidden>{t.emoji}</span>
                    <span
                      className="text-[13px] font-extrabold leading-tight text-center"
                      style={{
                        fontFamily: URBANIST,
                        color: selected ? BRAND : "#1A1A1A",
                      }}
                    >
                      {t.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Section header */}
            <div className="mb-3 text-right">
              <h2
                className="text-[20px] font-extrabold text-[#1A1A1A] leading-tight"
                style={{ fontFamily: URBANIST }}
              >
                {meta.sectionTitle}
              </h2>
              <p className="text-[12.5px] text-gray-500 mt-0.5">
                בחר קטגוריה כדי לראות ספקים
              </p>
            </div>

            {/* Stage tabs horizontal */}
            <div
              ref={stageStripRef}
              className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-5 px-5"
              style={{ scrollbarWidth: "none" }}
            >
              {meta.stages.map((s) => {
                const active = s.key === stageKey;
                return (
                  <button
                    key={s.key}
                    data-stage={s.key}
                    onClick={() => setStageKey(s.key)}
                    className="shrink-0 flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-2xl transition-all active:scale-95"
                    style={{
                      minWidth: 84,
                      background: active ? BRAND_DARK : "#FFFFFF",
                      border: active ? `1.5px solid ${BRAND_DARK}` : "1px solid #EAE7DF",
                      boxShadow: active
                        ? `0 10px 24px -14px ${BRAND_DARK}88`
                        : "0 4px 12px -10px rgba(0,0,0,0.08)",
                    }}
                  >
                    <span className="text-[24px] leading-none" aria-hidden>{s.emoji}</span>
                    <span
                      className="text-[11.5px] font-bold leading-tight text-center whitespace-nowrap"
                      style={{ fontFamily: URBANIST, color: active ? "#FFFFFF" : "#1A1A1A" }}
                    >
                      {s.title}
                    </span>
                    {active && (
                      <span className="block w-6 h-[3px] rounded-full mt-0.5" style={{ background: "#5DD2B5" }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Category cards 2-col grid */}
            {stageCards.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 text-center text-[13px] text-gray-500 border border-gray-100">
                ספקים יתווספו בקרוב בקטגוריה זו
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {stageCards.map((c) => (
                  <Link
                    key={c.id}
                    to={`/resident/categories/${c.id}`}
                    className="flex items-center justify-between gap-2 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm shadow-black/[0.03] active:scale-[0.98] transition-transform"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-300 shrink-0" />
                    <div className="flex-1 min-w-0 text-right">
                      <div
                        className="text-[13.5px] font-extrabold text-[#1A1A1A] leading-snug break-words"
                        style={{ fontFamily: URBANIST }}
                      >
                        {c.name}
                      </div>
                      <div className="text-[11px] text-gray-500 leading-snug mt-0.5">
                        {c.description || (c.count > 0 ? `${c.count} ספקים` : "בקרוב")}
                      </div>
                    </div>
                    <div
                      className="w-11 h-11 flex items-center justify-center rounded-xl text-[22px] shrink-0"
                      style={{ background: "#F4F1EA" }}
                    >
                      <span aria-hidden>{c.emoji}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating CTA button */}
      {!q && (
        <button
          onClick={() => navigate("/resident/project-management")}
          className="fixed left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-[var(--app-max-w)] flex items-center justify-center gap-2 text-white font-extrabold py-2.5 rounded-2xl active:scale-[0.98] transition-transform text-[13px]"
          style={{ 
            bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 8px)",
            background: BRAND_DARK, 
            fontFamily: URBANIST 
          }}
        >
          <Briefcase className="h-4 w-4" />
          ניהול הפרויקט שלי
        </button>
      )}

      <BottomNav role="resident" />
    </div>
  );
}
