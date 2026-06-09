import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon, ChevronLeft, MapPin, Sparkles, Store, Briefcase,
  PencilRuler, Hammer, Plug, ShieldCheck, Palette, ChefHat, Trees, KeyRound, Check, PiggyBank,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupportButton } from "@/components/SupportButton";
import { DocumentsButton } from "@/components/DocumentsButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useApp, formatILS } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { fetchDealJoinerCounts } from "@/lib/dealCounts";
import { SHADOWS, MOTION, STAGE_THEMES, type StageId } from "@/lib/designSystem";

const STAGES: { id: StageId; title: string; description: string; icon: typeof PencilRuler; dbStage?: string }[] = [
  { id: "planning",     title: "תכנון ועיצוב",       description: "אדריכלות, עיצוב פנים והחלטות הבסיס", icon: PencilRuler, dbStage: "planning" },
  { id: "structure",    title: "שלד ובנייה",          description: "קונסטרוקציה, איטום וגג",              icon: Hammer,      dbStage: "structure" },
  { id: "systems",      title: "מערכות הבית",         description: "חשמל, אינסטלציה ומיזוג",              icon: Plug,        dbStage: "systems" },
  { id: "openings",     title: "פתחים ובטחון",        description: "דלתות, חלונות ומערכות אבטחה",        icon: ShieldCheck, dbStage: "openings" },
  { id: "finishes",     title: "גמרים",                description: "ריצוף, צבע ועבודות גמר",              icon: Palette,     dbStage: "finishes" },
  { id: "kitchen-bath", title: "מטבחים ואמבטיות",     description: "מטבח, חדרי רחצה וכלים סניטריים",     icon: ChefHat,     dbStage: "kitchen-bath" },
  { id: "outdoor",      title: "חצר ופיתוח",          description: "גינון, גדרות ותאורת חוץ",             icon: Trees,       dbStage: "outdoor" },
  { id: "moving",       title: "כניסה לבית",          description: "הובלה, ריהוט וטקסי כניסה",            icon: KeyRound,    dbStage: "moving" },
];

const FILTERS = ["הכל", "מבצעים", "פופולרי", "חדש", "פיקדון נמוך", "ספקים מומלצים"];

interface MiniDeal { 
  id: string; 
  title: string; 
  cover_image_url: string | null; 
  supplier_name: string | null;
  discount_percentage?: number | null;
  deposit_required?: boolean | null;
  deposit_amount?: number | null;
  created_at?: string;
}

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [currentStage, setCurrentStage] = useState<StageId>("planning");
  const [areaDeals, setAreaDeals] = useState<MiniDeal[]>([]);
  const [areaSuppliersCount, setAreaSuppliersCount] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [estimatedSavings, setEstimatedSavings] = useState(0);
  const [activeFilter, setActiveFilter] = useState("הכל");
const filteredDeals = useMemo(() => {
  if (activeFilter === "הכל") return areaDeals;
  if (activeFilter === "מבצעים") return areaDeals.filter((d) => d.discount_percentage && d.discount_percentage > 0);
  if (activeFilter === "חדש") {
    const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return areaDeals.filter((d) => new Date(d.created_at).getTime() > week);
  }
  if (activeFilter === "פיקדון נמוך") return areaDeals.filter((d) => !d.deposit_required || (d.deposit_amount ?? 999) < 500);
  return areaDeals;
}, [activeFilter, areaDeals]);

  useEffect(() => {
    if (!authReady || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const uid = user.id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,city,project_id,city_id,region_id,current_stage")
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

        // Stage: prefer resident profile.current_stage, then project, then default.
        const validIds = STAGES.map((s) => s.id) as string[];
        let stage: StageId = "planning";
        const profStage = (prof?.current_stage as string | undefined) ?? "";
        const projStage = (projectResult.data?.current_stage as string | undefined) ?? "";
        const chosen = (validIds.includes(profStage) ? profStage : validIds.includes(projStage) ? projStage : "planning") as StageId;
        stage = chosen;

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
        const joinedIds = Array.from(new Set(((interestsResult.data ?? []) as { deal_id: string }[]).map((i) => i.deal_id)));
        const joined = joinedIds.length;

        const [supCountRes, dealsRes, joinedDealsRes] = await Promise.all([
          supplierIds.size
            ? supabase.from("suppliers").select("id", { count: "exact", head: true })
                .in("id", Array.from(supplierIds)).eq("is_active", true).eq("is_deleted", false).in("approval_status", ["approved", "active"])
            : Promise.resolve({ count: 0 }),
          dealIds.length ? supabase.from("deals").select("id,title,supplier_id,cover_image_url,discount_percentage,deposit_required,deposit_amount,created_at").in("id", dealIds).eq("is_deleted", false) : Promise.resolve({ data: [] }),
          joinedIds.length
            ? supabase.from("deals").select("price_after_discount,price_before_discount").in("id", joinedIds)
            : Promise.resolve({ data: [] }),
        ]);

        // Estimated savings = sum of (before - after) across joined deals.
        // Placeholder formula — easy to swap when real savings data lands.
        const savings = ((joinedDealsRes.data ?? []) as { price_after_discount: number | null; price_before_discount: number | null }[])
          .reduce((sum, d) => {
            const before = Number(d.price_before_discount ?? 0);
            const after = Number(d.price_after_discount ?? 0);
            const diff = before > after ? before - after : 0;
            return sum + diff;
          }, 0);

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
        setEstimatedSavings(savings);
      } catch (e) {
        console.error("[ResidentDashboard] load error", e);
      }
    })();
    return () => { cancelled = true; };
  }, [authReady, user?.id, user?.name]);

  const currentIdx = useMemo(() => Math.max(0, STAGES.findIndex((s) => s.id === currentStage)), [currentStage]);
  const completionPct = Math.round(((currentIdx + 1) / STAGES.length) * 100);

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#E8ECF0" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        {/* Top bar: action cluster (right RTL → bell, support, docs) + avatar (left) */}
        <header className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/resident/notifications")}
              className="h-10 w-10 rounded-full bg-white border border-[#ECEEF2] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(10,31,61,0.06)] active:scale-95 transition-transform"
              aria-label="התראות"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A1F3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </button>
            <SupportButton />
            <DocumentsButton />
          </div>
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

        {/* Search bar */}
        <div className="px-5 mt-4">
          <button
            onClick={() => navigate("/resident/search")}
            className="w-full h-14 rounded-[20px] bg-white border border-[#ECEEF2] flex items-center gap-3 px-5 text-right shadow-[0_4px_16px_-6px_rgba(10,31,61,0.08)] active:scale-[0.99] transition-transform"
          >
            <SearchIcon className="h-5 w-5 text-[#6B7280] shrink-0" strokeWidth={2} />
            <span className="text-[14px] font-medium text-[#6B7280] flex-1 truncate">חפש ספקים, הצעות וקטגוריות</span>
          </button>
        </div>

        {/* Estimated savings — premium hero card */}
        <section className="px-5 mt-4">
          <button
            onClick={() => navigate("/resident/my-offers")}
            className="w-full text-right rounded-[22px] p-4 flex items-center gap-4 active:scale-[0.99] transition-transform"
            style={{
              background: "linear-gradient(135deg,#0A1F3D 0%, #14305F 100%)",
              boxShadow: SHADOWS.press,
            }}
          >
            <div
              className="h-12 w-12 rounded-[14px] flex items-center justify-center shrink-0"
              style={{ background: "rgba(212,175,55,0.18)" }}
            >
              <PiggyBank className="h-[22px] w-[22px] text-[#D4AF37]" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold tracking-wider uppercase text-[#D4AF37]/90">חיסכון משוער</div>
              <div className="text-[24px] font-extrabold text-white mt-0.5 leading-none tabular-nums">
                {formatILS(estimatedSavings)}
              </div>
              <div className="text-[12px] text-white/70 mt-1.5 font-medium">נחסכו בזכות רכישות קבוצתיות</div>
            </div>
            <ChevronLeft className="h-[18px] w-[18px] text-white/60 shrink-0" strokeWidth={2.2} />
          </button>
        </section>

        {/* Stats — 3 mini cards */}
        <section className="px-5 mt-4 grid grid-cols-3 gap-3">
          <StatCard icon={Store} label="ספקים באזור" value={areaSuppliersCount} accent="#0A1F3D" tint="rgba(10,31,61,0.05)" onClick={() => navigate("/resident/categories")} />
          <StatCard icon={Sparkles} label="הצעות פעילות" value={areaDeals.length} accent="#D4AF37" tint="rgba(212,175,55,0.08)" onClick={() => navigate("/resident/deals")} />
          <StatCard icon={Briefcase} label="הצעות שלי" value={joinedCount} accent="#22C55E" tint="rgba(34,197,94,0.08)" onClick={() => navigate("/resident/my-offers")} />
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
              <h2 className="text-[18px] font-extrabold text-[#0A1F3D] tracking-tight">התקדמות הפרויקט</h2>
              <span className="text-[11px] font-semibold text-[#6B7280] tracking-wide">
                שלב {currentIdx + 1} מתוך {STAGES.length} · {completionPct}% הושלם
              </span>
            </div>
          </div>

          {/* Progress track */}
          <div className="relative h-2 rounded-full bg-[#ECEEF2] overflow-hidden mb-4">
            <div
              className="absolute inset-y-0 right-0 rounded-full transition-all duration-700"
              style={{
                width: `${completionPct}%`,
                background: "linear-gradient(90deg,#D4AF37,#E8C96B)",
                boxShadow: "0 0 10px rgba(212,175,55,0.45)",
              }}
            />
          </div>

          {/* Stage cards */}
          <div className="space-y-2.5">
            {STAGES.map((stage, i) => {
              const done = i < currentIdx;
              const cur = i === currentIdx;
              const Icon = stage.icon;
              const theme = STAGE_THEMES.find((t) => t.id === stage.id);
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
                    boxShadow: "0 4px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)",
                    transition: `transform ${MOTION.base} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
                  }}
                >
                  <div
                    className="h-11 w-11 rounded-[14px] flex items-center justify-center shrink-0"
                    style={{
                      background: cur ? accent! : done ? "#22C55E1F" : tint,
                      color: cur ? "#FFFFFF" : done ? "#22C55E" : (theme?.accent ?? "#6B7280"),
                      boxShadow: cur ? SHADOWS.pill : "none",
                    }}
                  >
                    {done ? <Check className="h-5 w-5" strokeWidth={2.8} /> : <span className="text-[16px] font-extrabold tabular-nums">{i + 1}</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={2} style={{ color: cur ? (theme?.accent ?? "#D4AF37") : "#9CA3AF" }} />
                      <h3 className="text-[16px] font-bold leading-tight tracking-tight text-[#0A1F3D] truncate">
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
                    <p className="text-[13px] font-medium text-[#5B6675] mt-1 leading-snug line-clamp-1">{stage.description}</p>
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
      className="bg-white rounded-[20px] p-3.5 shadow-[0_4px_12px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] flex flex-col items-start gap-2 active:scale-[0.97] transition-[transform,box-shadow] text-right"
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
