import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon, MapPin, Sparkles, Store, Briefcase,
  PencilRuler, Hammer, Plug, ShieldCheck, Palette, ChefHat, Trees, KeyRound, PiggyBank, Calculator,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupportButton } from "@/components/SupportButton";
import { DocumentsButton } from "@/components/DocumentsButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useApp, formatILS } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { fetchDealJoinerCounts } from "@/lib/dealCounts";
import { type StageId } from "@/lib/designSystem";

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

const FILTERS = ["הכל", "מבצעים", "חדש", "פיקדון נמוך"];

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

        const [matchesResult, citySupResult, councilSupResult, regionSupResult, nationwideResult, paidDepositsResult, freeInterestsResult] = await Promise.all([
          supabase.rpc("get_matching_deals_for_user", { _stage_filter: stage, _limit: 8 }),
          prof?.city_id ? supabase.from("supplier_cities").select("supplier_id").eq("city_id", prof.city_id) : Promise.resolve({ data: [] }),
          councilId ? supabase.from("supplier_councils").select("supplier_id").eq("council_id", councilId) : Promise.resolve({ data: [] }),
          regionId ? supabase.from("supplier_regions").select("supplier_id").eq("region_id", regionId) : Promise.resolve({ data: [] }),
          supabase.from("suppliers").select("id").eq("serves_all_country", true).eq("is_active", true).eq("is_deleted", false).in("approval_status", ["approved", "active"]),
          supabase.from("deposits").select("deal_id").eq("user_id", uid).eq("status", "paid").eq("is_deleted", false),
          supabase.from("deal_interests").select("deal_id").eq("user_id", uid).eq("is_deleted", false).in("status", ["interested", "approved", "committed", "joined"]),
        ]);

        const dealIds = ((matchesResult.data ?? []) as { deal_id: string }[]).map((m) => m.deal_id);
        const supplierIds = new Set<string>();
        (citySupResult.data ?? []).forEach((r: { supplier_id: string }) => supplierIds.add(r.supplier_id));
        (councilSupResult.data ?? []).forEach((r: { supplier_id: string }) => supplierIds.add(r.supplier_id));
        (regionSupResult.data ?? []).forEach((r: { supplier_id: string }) => supplierIds.add(r.supplier_id));
        (nationwideResult.data ?? []).forEach((r: { id: string }) => supplierIds.add(r.id));
        const paidDealIds = ((paidDepositsResult.data ?? []) as { deal_id: string }[]).map((i) => i.deal_id);
        const candidateFreeDealIds = Array.from(new Set(((freeInterestsResult.data ?? []) as { deal_id: string }[]).map((i) => i.deal_id)));
        let freeDealIds: string[] = [];
        if (candidateFreeDealIds.length) {
          const { data: freeDeals } = await supabase
            .from("deals")
            .select("id,deposit_required,deposit_amount")
            .in("id", candidateFreeDealIds)
            .eq("is_deleted", false);
          freeDealIds = ((freeDeals ?? []) as { id: string; deposit_required: boolean | null; deposit_amount: number | null }[])
            .filter((d) => !d.deposit_required || Number(d.deposit_amount ?? 0) <= 0)
            .map((d) => d.id);
        }
        const joinedIds = Array.from(new Set([...paidDealIds, ...freeDealIds]));
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

  const STAGE_TINTS: Record<string, string> = {
    planning: "#EEF4FF", structure: "#FFF5EB", systems: "#ECFEFF", openings: "#F0FDF4",
    finishes: "#F5F3FF", "kitchen-bath": "#FFF7ED", outdoor: "#F7FEE7", moving: "#FEF2F2",
  };

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F8F8F6", fontFamily: "'Epilogue', system-ui, sans-serif" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)] px-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        {/* Top bar */}
        <header className="pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/resident/notifications")}
              className="h-10 w-10 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm active:scale-95 transition-transform"
              aria-label="התראות"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </button>
            <SupportButton />
            <DocumentsButton />
          </div>
          <ProfileAvatar fallbackName={fullName} />
        </header>

        {/* Greeting + city pill */}
        <section className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[26px] leading-[1.15] font-extrabold tracking-tight text-[#1F2937]" style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}>
              שלום, {fullName || "דייר"}
            </h1>
            <p className="text-[13px] text-[#6B7280] mt-1">מצא הצעות קבוצתיות חדשות באזור שלך</p>
          </div>
          {city && (
            <button
              onClick={() => navigate("/resident/profile/edit")}
              className="shrink-0 inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white border border-[#E5E7EB] text-[12px] font-semibold text-[#1F2937] shadow-sm active:scale-95 transition-transform"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
              <MapPin className="h-3 w-3 text-[#6B7280]" strokeWidth={2.4} />
              <span>{city}</span>
            </button>
          )}
        </section>

        {/* Search bar */}
        <div className="mt-4">
          <button
            onClick={() => navigate("/resident/search")}
            className="w-full h-13 py-3.5 rounded-2xl bg-white border border-[#E5E7EB] flex items-center gap-3 px-4 text-right shadow-sm active:scale-[0.99] transition-transform"
          >
            <SearchIcon className="h-[18px] w-[18px] text-[#6B7280] shrink-0" strokeWidth={2} />
            <span className="text-[13px] font-medium text-[#6B7280] flex-1 truncate">חפש ספקים, הצעות וקטגוריות</span>
          </button>
        </div>

        {/* Bento Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Savings Hero - full width */}
          <button
            onClick={() => navigate("/resident/my-offers")}
            className="col-span-2 bg-white border border-[#E5E7EB] p-5 rounded-[24px] shadow-sm relative overflow-hidden text-right active:scale-[0.99] transition-transform"
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[#16A34A] bg-[#F0FDF4] px-3 py-1 rounded-full text-[11px] font-bold border border-[#DCFCE7]">חסכון קבוצתי</span>
                <PiggyBank className="h-5 w-5 text-[#16A34A]/30" strokeWidth={2} />
              </div>
              <div className="text-[28px] font-extrabold text-[#1F2937] leading-none tabular-nums" style={{ fontFamily: "'Urbanist'" }}>
                {formatILS(estimatedSavings)}
              </div>
              <p className="text-[12px] text-[#6B7280] mt-1 mb-4">נחסכו בזכות רכישות קבוצתיות</p>
              <div className="w-full bg-[#2563EB] text-white py-2.5 rounded-xl font-bold text-[13px] shadow-md border border-[#1F2937]" style={{ fontFamily: "'Urbanist'" }}>
                פירוט החסכון המלא
              </div>
            </div>
            <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-[#16A34A]/5 rounded-full blur-3xl" />
          </button>

          {/* Budget Card - left */}
          <button
            onClick={() => navigate("/resident/budget-planner")}
            className="bg-white border border-[#E5E7EB] p-4 rounded-[24px] shadow-sm flex flex-col justify-between text-right active:scale-[0.98] transition-transform min-h-[160px]"
          >
            <div>
              <div className="w-9 h-9 bg-[#F5F3FF] rounded-xl flex items-center justify-center mb-2">
                <Calculator className="h-[18px] w-[18px] text-[#7C3AED]" strokeWidth={2.2} />
              </div>
              <div className="font-extrabold text-[14px] text-[#1F2937] leading-tight" style={{ fontFamily: "'Urbanist'" }}>מחשבון תקציב</div>
              <div className="text-[11px] text-[#6B7280] mt-1">חשב עלויות שיפוץ</div>
            </div>
            <div className="mt-3 border-2 border-[#7C3AED] text-[#7C3AED] py-1.5 rounded-lg text-[12px] font-bold bg-[#F5F3FF] text-center" style={{ fontFamily: "'Urbanist'" }}>
              נהל תקציב
            </div>
          </button>

          {/* Stats stack - right column */}
          <div className="flex flex-col gap-2">
            <BentoStat icon={Store} label="ספקים באזור" value={areaSuppliersCount} tint="#FFF5EB" color="#EA580C" onClick={() => navigate("/resident/search")} />
            <BentoStat icon={Sparkles} label="הצעות פעילות" value={areaDeals.length} tint="#FFFBEB" color="#C9A227" onClick={() => navigate("/resident/deals")} />
            <BentoStat icon={Briefcase} label="הצעות שלי" value={joinedCount} tint="#F0FDF4" color="#16A34A" onClick={() => navigate("/resident/my-offers")} />
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map((f) => {
            const active = f === activeFilter;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`shrink-0 h-9 px-4 rounded-full text-[12px] font-bold transition-all border ${
                  active
                    ? "bg-[#2563EB] text-white border-[#C9A227] shadow-md shadow-[#C9A227]/25"
                    : "bg-white text-[#1F2937] border-[#E5E7EB] shadow-sm"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Project Progress */}
        <section className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[17px] font-extrabold text-[#1F2937] tracking-tight" style={{ fontFamily: "'Urbanist'" }}>שלבי הפרויקט</h2>
            <span className="text-[11px] font-bold text-[#6B7280]">
              {currentIdx + 1}/{STAGES.length} · {completionPct}%
            </span>
          </div>

          <div className="relative h-2 rounded-full bg-[#E5E7EB] overflow-hidden mb-3">
            <div
              className="absolute inset-y-0 right-0 rounded-full transition-all duration-700"
              style={{
                width: `${completionPct}%`,
                background: "linear-gradient(90deg,#C9A227,#E8C96B)",
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {STAGES.map((stage, idx) => {
              const isCurrent = stage.id === currentStage;
              const isPast = idx < currentIdx;
              const tint = STAGE_TINTS[stage.id] ?? "#F4F6FA";
              const Icon = stage.icon;
              return (
                <button
                  key={stage.id}
                  onClick={() => navigate(`/resident/categories?stage=${stage.id}`)}
                  className={`relative p-3 rounded-2xl flex flex-col items-center justify-center text-center transition-all active:scale-95 ${
                    isCurrent
                      ? "border-2 border-[#2563EB] shadow-sm"
                      : isPast
                      ? "border border-[#E5E7EB] opacity-90"
                      : "border border-[#E5E7EB] opacity-70"
                  }`}
                  style={{ background: tint, minHeight: 78 }}
                >
                  {isCurrent && (
                    <span className="absolute -top-1.5 right-1/2 translate-x-1/2 bg-[#2563EB] text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap">נוכחי</span>
                  )}
                  <Icon className="h-4 w-4 mb-1 text-[#1F2937]" strokeWidth={2.2} />
                  <span className="text-[11px] font-bold text-[#1F2937] leading-tight">{stage.title}</span>
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

function BentoStat({ icon: Icon, label, value, tint, color, onClick }: { icon: typeof Sparkles; label: string; value: number; tint: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-[#E5E7EB] p-2.5 rounded-2xl flex items-center gap-2.5 shadow-sm active:scale-[0.97] transition-transform text-right flex-1"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: tint }}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-extrabold text-[#1F2937] leading-none tabular-nums" style={{ fontFamily: "'Urbanist'" }}>{value}</div>
        <div className="text-[10px] text-[#6B7280] font-medium leading-tight mt-0.5">{label}</div>
      </div>
    </button>
  );
}

