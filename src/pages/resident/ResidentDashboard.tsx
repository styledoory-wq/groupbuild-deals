import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon, ChevronLeft, MapPin, Sparkles, Store, Briefcase,
  PencilRuler, Hammer, Plug, Palette, Trees, Armchair, Check,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { fetchDealJoinerCounts } from "@/lib/dealCounts";
import { SHADOWS, MOTION, STAGE_THEMES } from "@/lib/designSystem";

type StageId = "planning" | "structure" | "systems" | "finishes" | "furniture" | "outdoor";

const STAGES: { id: StageId; title: string; description: string; icon: typeof PencilRuler; dbStage?: string }[] = [
  { id: "planning",  title: "תכנון ועיצוב",       description: "אדריכלות, עיצוב פנים והחלטות הבסיס",   icon: PencilRuler, dbStage: "planning" },
  { id: "structure", title: "שלד ובנייה",          description: "קונסטרוקציה, איטום וגג",                icon: Hammer,      dbStage: "structure" },
  { id: "systems",   title: "מערכות הבית",         description: "חשמל, אינסטלציה ומיזוג",                icon: Plug,        dbStage: "systems" },
  { id: "finishes",  title: "גמרים",                description: "ריצוף, צבע, מטבח וחדרי רחצה",            icon: Palette,     dbStage: "finishes" },
  { id: "furniture", title: "ריהוט והלבשת הבית",  description: "ריהוט, טקסטיל ועיצוב מוגמר",            icon: Armchair },
  { id: "outdoor",   title: "חצר ופיתוח",          description: "גינון, גדרות ותאורת חוץ",                 icon: Trees,       dbStage: "outdoor" },
];

const FILTERS = ["הכל", "מבצעים", "פופולרי", "חדש", "הנחות", "ספקים מומלצים"];

interface MiniDeal { id: string; title: string; cover_image_url: string | null; supplier_name: string | null }

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [currentStage, setCurrentStage] = useState<StageId>("planning");
  const [areaDeals, setAreaDeals] = useState<MiniDeal[]>([]);
  const [areaSuppliersCount, setAreaSuppliersCount] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState("הכל");

  useEffect(() => {
    if (!authReady || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const uid = user.id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,city,project_id,city_id,region_id")
          .eq("id", uid).maybeSingle();

        const fname = prof?.full_name ?? user.name ?? "דייר";
        const cityName = prof?.city ?? "";
        let regionId: string | null = (prof?.region_id as string | null) ?? null;

        const [cityResult, projectResult] = await Promise.all([
          prof?.city_id
            ? supabase.from("cities").select("council_id,region_id").eq("id", prof.city_id).maybeSingle()
            : Promise.resolve({ data: null }),
          prof?.project_id
            ? supabase.from("projects").select("current_stage").eq("id", prof.project_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        const cityRow = cityResult.data;
        const councilId: string | null = (cityRow?.council_id as string | null) ?? null;
        if (cityRow?.region_id) regionId = (cityRow.region_id as string | null) ?? regionId;

        let stage: StageId = "planning";
        const s = (projectResult.data?.current_stage as string | undefined) ?? "planning";
        if (["planning","structure","systems","finishes","outdoor"].includes(s)) stage = s as StageId;

        const [matchesResult, citySupResult, councilSupResult, regionSupResult, nationwideResult, interestsResult] = await Promise.all([
          supabase.rpc("get_matching_deals_for_user", { _stage_filter: stage, _limit: 8 }),
          prof?.city_id ? supabase.from("supplier_cities").select("supplier_id").eq("city_id", prof.city_id) : Promise.resolve({ data: [] }),
          councilId ? supabase.from("supplier_councils").select("supplier_id").eq("council_id", councilId) : Promise.resolve({ data: [] }),
          regionId ? supabase.from("supplier_regions").select("supplier_id").eq("region_id", regionId) : Promise.resolve({ data: [] }),
          supabase.from("suppliers").select("id").eq("serves_all_country", true).eq("is_active", true).eq("is_deleted", false).in("approval_status", ["approved", "active"]),
          supabase.from("deal_interests").select("deal_id").eq("user_id", uid).eq("is_deleted", false),
        ]);

        const dealIds = ((matchesResult.data ?? []) as { deal_id: string }[]).map((m) => m.deal_id);
        const supplierIds = new Set<string>();
        (citySupResult.data ?? []).forEach((r: { supplier_id: string }) => supplierIds.add(r.supplier_id));
        (councilSupResult.data ?? []).forEach((r: { supplier_id: string }) => supplierIds.add(r.supplier_id));
        (regionSupResult.data ?? []).forEach((r: { supplier_id: string }) => supplierIds.add(r.supplier_id));
        (nationwideResult.data ?? []).forEach((r: { id: string }) => supplierIds.add(r.id));
        const joined = new Set(((interestsResult.data ?? []) as { deal_id: string }[]).map((i) => i.deal_id)).size;

        const [supCountRes, dealsRes] = await Promise.all([
          supplierIds.size
            ? supabase.from("suppliers").select("id", { count: "exact", head: true })
                .in("id", Array.from(supplierIds)).eq("is_active", true).eq("is_deleted", false).in("approval_status", ["approved", "active"])
            : Promise.resolve({ count: 0 }),
          dealIds.length ? supabase.from("deals").select("id,title,supplier_id,cover_image_url").in("id", dealIds) : Promise.resolve({ data: [] }),
        ]);

        const deals = (dealsRes.data ?? []) as { id: string; title: string; supplier_id: string; cover_image_url: string | null }[];
        let nextDeals: MiniDeal[] = [];
        if (deals.length) {
          const supIds = Array.from(new Set(deals.map((d) => d.supplier_id)));
          const [sups] = await Promise.all([
            supabase.from("suppliers").select("id,business_name").in("id", supIds),
            fetchDealJoinerCounts(deals.map((d) => d.id)),
          ]);
          const sMap = new Map(((sups.data ?? []) as { id: string; business_name: string }[]).map((s) => [s.id, s.business_name]));
          nextDeals = deals.map((d) => ({ id: d.id, title: d.title, cover_image_url: d.cover_image_url, supplier_name: sMap.get(d.supplier_id) ?? null }));
        }

        if (cancelled) return;
        setFullName(fname); setCity(cityName); setCurrentStage(stage);
        setAreaDeals(nextDeals); setAreaSuppliersCount(supCountRes.count ?? 0); setJoinedCount(joined);
      } catch (e) {
        console.error("[ResidentDashboard] load error", e);
      }
    })();
    return () => { cancelled = true; };
  }, [authReady, user?.id, user?.name]);

  const currentIdx = useMemo(() => Math.max(0, STAGES.findIndex((s) => s.id === currentStage)), [currentStage]);

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F7F8FA" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        {/* Top bar: avatar (right RTL) — no logo */}
        <header className="px-5 pt-4 pb-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/resident/notifications")}
            className="h-10 w-10 rounded-full bg-white border border-[#ECEEF2] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(10,31,61,0.06)] active:scale-95 transition-transform"
            aria-label="התראות"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A1F3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>
          <ProfileAvatar fallbackName={fullName} />
        </header>

        {/* Greeting */}
        <section className="px-5 mt-1">
          <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-tight text-[#0A1F3D]">
            שלום, {fullName || "דייר"}
          </h1>
          <p className="text-[14px] text-[#6B7280] mt-1.5">מצא הצעות קבוצתיות חדשות באזור שלך</p>
        </section>

        {/* Location pill */}
        {city && (
          <div className="px-5 mt-4">
            <button
              onClick={() => navigate("/resident/profile/edit")}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-white border border-[#ECEEF2] text-[13px] font-semibold text-[#0A1F3D] shadow-[0_2px_8px_-2px_rgba(10,31,61,0.05)] active:scale-95 transition-transform"
            >
              <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" strokeWidth={2.4} />
              <span>{city}</span>
            </button>
          </div>
        )}

        {/* Search bar — Wolt style */}
        <div className="px-5 mt-4">
          <button
            onClick={() => navigate("/resident/search")}
            className="w-full h-14 rounded-[20px] bg-white border border-[#ECEEF2] flex items-center gap-3 px-5 text-right shadow-[0_4px_16px_-6px_rgba(10,31,61,0.08)] active:scale-[0.99] transition-transform"
          >
            <SearchIcon className="h-5 w-5 text-[#6B7280] shrink-0" strokeWidth={2} />
            <span className="text-[14px] font-medium text-[#6B7280] flex-1 truncate">חפש ספקים, הצעות וקטגוריות</span>
          </button>
        </div>

        {/* Stats — 3 mini cards */}
        <section className="px-5 mt-4 grid grid-cols-3 gap-3">
          <StatCard icon={Sparkles} label="הצעות פעילות" value={areaDeals.length} accent="#D4AF37" onClick={() => navigate("/resident/deals")} />
          <StatCard icon={Store} label="ספקים באזור" value={areaSuppliersCount} accent="#0A1F3D" onClick={() => navigate("/resident/categories")} />
          <StatCard icon={Briefcase} label="הצעות שלי" value={joinedCount} accent="#22C55E" onClick={() => navigate("/resident/my-offers")} />
        </section>

        {/* Quick filter chips */}
        <div className="mt-5">
          <div className="px-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {FILTERS.map((f) => {
              const active = f === activeFilter;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold transition-all ${
                    active
                      ? "bg-[#0A1F3D] text-white shadow-[0_4px_12px_-4px_rgba(10,31,61,0.4)]"
                      : "bg-white text-[#0A1F3D] border border-[#ECEEF2]"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {/* Construction Journey */}
        <section className="px-5 mt-6">
          <div className="flex items-end justify-between mb-3">
            <button
              onClick={() => navigate("/resident/categories")}
              className="text-[12px] font-semibold text-[#D4AF37] hover:underline"
            >
              כל הקטגוריות ←
            </button>
            <div className="text-right">
              <h2 className="text-[18px] font-extrabold text-[#0A1F3D] tracking-tight">מסע הבנייה שלי</h2>
              <span className="text-[11px] font-semibold text-[#6B7280] tracking-wide">
                שלב {currentIdx + 1} מתוך {STAGES.length}
              </span>
            </div>
          </div>

          {/* Progress track */}
          <div className="relative h-1.5 rounded-full bg-[#ECEEF2] overflow-hidden mb-4">
            <div
              className="absolute inset-y-0 right-0 rounded-full transition-all duration-700"
              style={{
                width: `${((currentIdx + 1) / STAGES.length) * 100}%`,
                background: "linear-gradient(90deg,#D4AF37,#E8C96B)",
              }}
            />
          </div>

          {/* Stage cards — unified DS tokens */}
          <div className="space-y-2.5">
            {STAGES.map((stage, i) => {
              const done = i < currentIdx;
              const cur = i === currentIdx;
              const Icon = stage.icon;
              const theme = STAGE_THEMES.find((t) => t.id === (stage.id as unknown as typeof STAGE_THEMES[number]["id"]));
              const accent = cur ? (theme?.accent ?? "#D4AF37") : null;
              const tint = theme?.tint ?? "#F4F6FA";
              return (
                <button
                  key={stage.id}
                  onClick={() => stage.dbStage && navigate(`/resident/categories?stage=${stage.dbStage}`)}
                  disabled={!stage.dbStage}
                  className={`w-full text-right rounded-[22px] p-4 flex items-center gap-4 active:scale-[0.99] ${!stage.dbStage ? "opacity-80 cursor-default" : ""}`}
                  style={{
                    background: cur ? `linear-gradient(180deg,#FFFFFF 0%, ${tint} 100%)` : "#FFFFFF",
                    boxShadow: cur ? SHADOWS.press : SHADOWS.card,
                    transition: `transform ${MOTION.base} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
                  }}
                >
                  {/* Stage badge */}
                  <div
                    className="h-11 w-11 rounded-[14px] flex items-center justify-center shrink-0"
                    style={{
                      background: cur ? accent! : done ? "#22C55E1F" : tint,
                      color: cur ? "#FFFFFF" : done ? "#22C55E" : (theme?.accent ?? "#6B7280"),
                      boxShadow: cur ? SHADOWS.pill : "none",
                    }}
                  >
                    {done ? <Check className="h-5 w-5" strokeWidth={2.8} /> : <span className="text-[15px] font-extrabold tabular-nums">{i + 1}</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-[14px] w-[14px] shrink-0" strokeWidth={2} style={{ color: cur ? (theme?.accent ?? "#D4AF37") : "#9CA3AF" }} />
                      <h3 className="text-[15px] font-bold leading-tight tracking-tight text-[#0A1F3D] truncate">
                        {stage.title}
                      </h3>
                      {cur && (
                        <span
                          className="ml-auto inline-flex items-center gap-1 px-2 h-[18px] rounded-full text-[10px] font-bold"
                          style={{ background: `${accent}1F`, color: accent! }}
                        >
                          השלב הנוכחי
                        </span>
                      )}
                    </div>
                    <p className="text-[12.5px] font-medium text-[#6B7280] mt-1 leading-snug line-clamp-1">{stage.description}</p>
                  </div>

                  {stage.dbStage && (
                    <ChevronLeft className="h-[18px] w-[18px] shrink-0 text-[#9CA3AF]" strokeWidth={2.2} />
                  )}
                </button>
              );
            })}
          </div>
        </section>

      </div>
      <BottomNav role="resident" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, onClick }: { icon: typeof Sparkles; label: string; value: number; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-[20px] p-3.5 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.06)] flex flex-col items-start gap-2 active:scale-[0.97] transition-transform text-right"
    >
      <span
        className="h-8 w-8 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}15` }}
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} style={{ color: accent }} />
      </span>
      <div className="w-full">
        <div className="text-[22px] font-extrabold text-[#0A1F3D] leading-none tracking-tight gb-num">{value}</div>
        <div className="text-[11px] text-[#6B7280] mt-1.5 font-medium leading-tight">{label}</div>
      </div>
    </button>
  );
}
