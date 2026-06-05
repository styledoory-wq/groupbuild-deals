import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, X, Compass, HardHat, Plug, PaintBucket, Trees, ChevronLeft, LayoutGrid,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { PremiumHeader } from "@/components/layout/PremiumHeader";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

/* ---------- Stage definitions (5 stages) ---------- */
type StageDef = {
  id: string;
  index: number;
  title: string;
  shortTitle: string;
  ids: string[];
  Icon: typeof Compass;
  accent: string;   // strong color (icon, number, header)
  tint: string;     // soft tinted background
  border: string;   // card border color
};

const STAGES: StageDef[] = [
  {
    id: "planning", index: 1, title: "תכנון ועיצוב", shortTitle: "תכנון",
    ids: ["architect", "interior-designer", "consultant"],
    Icon: Compass, accent: "#2F6BFF", tint: "#EAF2FF", border: "#BFD7FF",
  },
  {
    id: "structure", index: 2, title: "שלד ובנייה", shortTitle: "בנייה",
    ids: ["contractor", "skeleton"],
    Icon: HardHat, accent: "#E8742C", tint: "#FFF1E4", border: "#FFD4B0",
  },
  {
    id: "systems", index: 3, title: "מערכות הבית", shortTitle: "מערכות",
    ids: ["electric", "plumbing", "ac", "smart-home"],
    Icon: Plug, accent: "#0FB5C9", tint: "#E7F8FB", border: "#B5E8EF",
  },
  {
    id: "finishes", index: 4, title: "גמרים", shortTitle: "גמר",
    ids: [
      "doors", "security-door", "windows",
      "painting", "flooring", "cladding", "carpentry", "gypsum", "closets", "lighting",
      "kitchen", "bath", "sanitary", "showers",
    ],
    Icon: PaintBucket, accent: "#7A4FCF", tint: "#F2ECFB", border: "#D8C9F0",
  },
  {
    id: "outdoor", index: 5, title: "חוץ ופיתוח", shortTitle: "חצר",
    ids: ["garden", "pergola", "cleaning"],
    Icon: Trees, accent: "#6E8A2E", tint: "#F1F5E4", border: "#D2DEB5",
  },
];

/* Quick-chips row 2 — sub-filters inside stages */
type ChipDef = { id: string; label: string; stageId: string; ids?: string[] };
const QUICK_CHIPS: ChipDef[] = [
  { id: "openings",  label: "פתחים",       stageId: "finishes", ids: ["doors", "security-door", "windows"] },
  { id: "finish",    label: "גמר",          stageId: "finishes", ids: ["painting", "flooring", "cladding", "carpentry", "gypsum", "closets", "lighting"] },
  { id: "kitchbath", label: "מטבח ואמבט",   stageId: "finishes", ids: ["kitchen", "bath", "sanitary", "showers"] },
  { id: "yard",      label: "חצר",          stageId: "outdoor" },
];

interface SupplierLite {
  id: string; business_name: string; short_description: string | null;
  logo_url: string | null; categories: string[]; service_areas: string[];
}

type Filter =
  | { kind: "all" }
  | { kind: "stage"; stageId: string }
  | { kind: "chip"; chipId: string };

export default function CategoriesList() {
  const { categories } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStage = searchParams.get("stage") || "";

  const cached = getCachedValue<SupplierLite[]>("categories:suppliers", 5 * 60_000);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>(() => cached ?? []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>(
    initialStage ? { kind: "stage", stageId: initialStage } : { kind: "all" }
  );
  const [showAll, setShowAll] = useState(false);

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

  /** Build the rendered list of {stage, cats} groups, respecting filter (and chip sub-filter). */
  const visibleGroups = useMemo(() => {
    const groups = STAGES.map((s) => {
      const cats = s.ids
        .map((id) => categories.find((c) => c.id === id))
        .filter(Boolean) as { id: string; name: string; icon: string }[];
      return { stage: s, cats };
    });
    if (filter.kind === "all") return groups;
    if (filter.kind === "stage") return groups.filter((g) => g.stage.id === filter.stageId);
    // chip — narrow inside a stage to a subset of ids
    const chip = QUICK_CHIPS.find((c) => c.id === filter.chipId);
    if (!chip) return groups;
    return groups
      .filter((g) => g.stage.id === chip.stageId)
      .map((g) => ({
        stage: g.stage,
        cats: chip.ids ? g.cats.filter((c) => chip.ids!.includes(c.id)) : g.cats,
      }));
  }, [categories, filter]);

  const isActive = (key: string) => {
    if (key === "all") return filter.kind === "all";
    const stage = STAGES.find((s) => s.id === key);
    if (stage) return filter.kind === "stage" && filter.stageId === key;
    return filter.kind === "chip" && filter.chipId === key;
  };

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F7F8FA" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        <PremiumHeader title="בנו את הבית שלכם" subtitle="כל הקטגוריות במקום אחד" />

        {/* Sticky search */}
        <div
          className="sticky z-20 px-5 pt-2 pb-3"
          style={{
            top: "env(safe-area-inset-top)",
            background: "linear-gradient(180deg,#F7F8FA 60%, rgba(247,248,250,0.0))",
            backdropFilter: "saturate(180%) blur(8px)",
            WebkitBackdropFilter: "saturate(180%) blur(8px)",
          }}
        >
          <div className="relative">
            <Search className="h-[18px] w-[18px] absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280]" strokeWidth={2} />
            <input
              type="text" dir="rtl" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש קטגוריה, ספק או אזור"
              className="w-full h-12 pr-11 pl-10 rounded-[16px] bg-white border border-[#ECEEF2] text-[14px] font-medium text-[#0A1F3D] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#D4AF37] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-[#F4F6FA] flex items-center justify-center">
                <X className="h-4 w-4 text-[#6B7280]" />
              </button>
            )}
          </div>
        </div>

        {/* Search results */}
        {q && (
          <div className="px-5 mt-2 space-y-2">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
              {searchResults.length} תוצאות
            </p>
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-[16px] p-5 text-center text-[13px] text-[#6B7280] border border-[#ECEEF2]">
                לא נמצאו תוצאות ל"{search}"
              </div>
            ) : searchResults.map((s) => {
              const catNames = (s.categories ?? [])
                .map((cid) => categories.find((c) => c.id === cid)?.name)
                .filter(Boolean).slice(0, 2).join(" · ");
              return (
                <button key={s.id} onClick={() => navigate(`/suppliers/${s.id}`)}
                  className="w-full bg-white rounded-[16px] p-3 border border-[#ECEEF2] flex items-center gap-3 text-right active:scale-[0.99] transition-transform">
                  <SupplierLogo name={s.business_name} logoUrl={s.logo_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-[#0A1F3D] truncate">{s.business_name}</p>
                    <p className="text-[12px] text-[#6B7280] truncate font-medium">{catNames || "ספק"}</p>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-[#9CA3AF]" />
                </button>
              );
            })}
          </div>
        )}

        {!q && (
          <>
            {/* === COMPACT 2-ROW FILTER GRID === */}
            <section className="px-5 mt-1">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-[12px] font-extrabold text-[#0A1F3D] tracking-tight">כל התחומים</h2>
                <button
                  onClick={() => setShowAll(true)}
                  className="text-[11.5px] font-bold text-[#2F6BFF] active:opacity-70"
                >
                  הצג הכל
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {/* Row 1 */}
                <FilterTile
                  label="הכל" Icon={LayoutGrid}
                  active={isActive("all")}
                  onClick={() => setFilter({ kind: "all" })}
                  accent="#0A1F3D" tint="#F4F6FA" border="#ECEEF2"
                />
                {STAGES.slice(0, 3).map((s) => (
                  <FilterTile
                    key={s.id} label={s.shortTitle} Icon={s.Icon}
                    active={isActive(s.id)}
                    onClick={() => setFilter({ kind: "stage", stageId: s.id })}
                    accent={s.accent} tint={s.tint} border={s.border}
                  />
                ))}

                {/* Row 2: chip-based filters */}
                {QUICK_CHIPS.map((chip) => {
                  const stage = STAGES.find((s) => s.id === chip.stageId)!;
                  return (
                    <FilterTile
                      key={chip.id} label={chip.label} Icon={stage.Icon}
                      active={isActive(chip.id)}
                      onClick={() => setFilter({ kind: "chip", chipId: chip.id })}
                      accent={stage.accent} tint={stage.tint} border={stage.border}
                    />
                  );
                })}
              </div>
            </section>

            {/* === STAGE SECTIONS === */}
            <div className="px-5 mt-6 space-y-6">
              {visibleGroups.map(({ stage, cats }) => {
                const totalSuppliers = cats.reduce((sum, c) => sum + (counts[c.id] ?? 0), 0);
                return (
                  <section key={stage.id}>
                    {/* Minimal stage heading: vertical color bar + title */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <span
                        className="block h-5 w-[3px] rounded-full"
                        style={{ background: stage.accent }}
                      />
                      <span
                        className="text-[10px] font-extrabold tracking-[0.08em] uppercase"
                        style={{ color: stage.accent }}
                      >
                        שלב {stage.index}
                      </span>
                      <span className="text-[14px] font-extrabold text-[#0A1F3D] tracking-tight">
                        · {stage.title}
                      </span>
                      <span className="mr-auto text-[11px] font-bold text-[#6B7280]">
                        {totalSuppliers} ספקים
                      </span>
                    </div>

                    {cats.length === 0 ? (
                      <div className="bg-white rounded-[16px] p-4 text-center text-[12px] text-[#6B7280] font-medium border border-[#ECEEF2]">
                        קטגוריות יתווספו בקרוב
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {cats.map((c) => (
                          <CategoryCard
                            key={c.id}
                            id={c.id}
                            name={c.name}
                            icon={c.icon}
                            count={counts[c.id] ?? 0}
                            stage={stage}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ===== Bottom Sheet: all categories ===== */}
      <Sheet open={showAll} onOpenChange={setShowAll}>
        <SheetContent side="bottom" className="rounded-t-[24px] max-h-[85vh] overflow-y-auto p-0" dir="rtl">
          <SheetHeader className="px-5 pt-5 pb-3 text-right">
            <SheetTitle className="text-[18px] font-extrabold text-[#0A1F3D]">כל התחומים</SheetTitle>
          </SheetHeader>
          <div className="px-5 pb-8 space-y-5">
            {STAGES.map((stage) => {
              const cats = stage.ids
                .map((id) => categories.find((c) => c.id === id))
                .filter(Boolean) as { id: string; name: string; icon: string }[];
              if (cats.length === 0) return null;
              return (
                <div key={stage.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="block h-4 w-[3px] rounded-full" style={{ background: stage.accent }} />
                    <span className="text-[10px] font-extrabold tracking-[0.08em] uppercase" style={{ color: stage.accent }}>
                      שלב {stage.index}
                    </span>
                    <span className="text-[13px] font-extrabold text-[#0A1F3D]">· {stage.title}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {cats.map((c) => {
                      const n = counts[c.id] ?? 0;
                      const dim = n === 0;
                      return (
                        <Link
                          key={c.id}
                          to={`/resident/categories/${c.id}`}
                          onClick={() => setShowAll(false)}
                          className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 bg-white border border-[#ECEEF2] active:scale-[0.98] transition-transform"
                          style={dim ? { opacity: 0.6 } : undefined}
                        >
                          <span className="text-[18px]">{c.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-bold text-[#0A1F3D] truncate">{c.name}</p>
                            <p className="text-[10.5px] font-semibold" style={{ color: dim ? "#9CA3AF" : stage.accent }}>
                              {n > 0 ? `${n} ספקים` : "בקרוב"}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav role="resident" />
    </div>
  );
}

/* ---------- Sub-components ---------- */

function FilterTile({
  label, Icon, active, onClick, accent, tint, border,
}: {
  label: string;
  Icon: typeof Compass;
  active: boolean;
  onClick: () => void;
  accent: string;
  tint: string;
  border: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-[16px] py-2.5 px-1 transition-all active:scale-[0.96]"
      style={
        active
          ? { background: tint, border: `1px solid ${accent}`, boxShadow: `0 4px 14px -8px ${accent}66` }
          : { background: "#FFFFFF", border: `1px solid ${border}` }
      }
    >
      <div
        className="h-8 w-8 rounded-[10px] flex items-center justify-center"
        style={{ background: active ? "rgba(255,255,255,0.85)" : tint }}
      >
        <Icon className="h-[16px] w-[16px]" strokeWidth={2.3} style={{ color: accent }} />
      </div>
      <span
        className="text-[11px] font-extrabold leading-tight text-center line-clamp-1"
        style={{ color: active ? accent : "#0A1F3D" }}
      >
        {label}
      </span>
    </button>
  );
}

function CategoryCard({
  id, name, icon, count, stage,
}: {
  id: string;
  name: string;
  icon: string;
  count: number;
  stage: StageDef;
}) {
  const dim = count === 0;
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center text-[18px]"
          style={{ background: stage.tint, border: `1px solid ${stage.border}` }}
        >
          <span>{icon}</span>
        </div>
        {dim ? (
          <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-[#F4F6FA] text-[#9CA3AF]">
            בקרוב
          </span>
        ) : (
          <span
            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white"
            style={{ color: stage.accent, border: `1px solid ${stage.border}` }}
          >
            {count}
          </span>
        )}
      </div>
      <p className="mt-2 text-[13.5px] font-extrabold text-[#0A1F3D] leading-tight tracking-tight line-clamp-2">
        {name}
      </p>
      <p
        className="text-[11px] mt-0.5 font-semibold"
        style={{ color: dim ? "#9CA3AF" : stage.accent }}
      >
        {dim ? "בקרוב" : `${count} ספקים`}
      </p>
    </>
  );

  const baseStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: `1px solid ${stage.border}`,
    boxShadow: dim ? "none" : "0 4px 16px -8px rgba(10,31,61,0.18)",
    minHeight: 104,
    opacity: dim ? 0.6 : 1,
  };

  if (dim) {
    return (
      <div
        className="relative rounded-[18px] p-3 flex flex-col cursor-default"
        style={baseStyle}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={`/resident/categories/${id}`}
      className="relative rounded-[18px] p-3 flex flex-col active:scale-[0.97] transition-transform"
      style={baseStyle}
    >
      {content}
    </Link>
  );
}
