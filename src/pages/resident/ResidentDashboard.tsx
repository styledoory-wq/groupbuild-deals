import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon, MapPin, Sparkles, Store, Users, Flame,
  PencilRuler, Hammer, Plug, ShieldCheck, Palette, ChefHat, Trees, KeyRound, PiggyBank, Calculator,
  TrendingUp, Check,
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
  { id: "planning",     title: "תכנון ועיצוב",       description: "אדריכלות ועיצוב פנים",            icon: PencilRuler, dbStage: "planning" },
  { id: "structure",    title: "שלד ובנייה",          description: "קונסטרוקציה ואיטום",              icon: Hammer,      dbStage: "structure" },
  { id: "systems",      title: "מערכות הבית",         description: "חשמל, אינסטלציה, מיזוג",          icon: Plug,        dbStage: "systems" },
  { id: "openings",     title: "פתחים ובטחון",        description: "דלתות וחלונות",                    icon: ShieldCheck, dbStage: "openings" },
  { id: "finishes",     title: "גמרים",                description: "ריצוף וצבע",                        icon: Palette,     dbStage: "finishes" },
  { id: "kitchen-bath", title: "מטבחים ואמבטיות",     description: "מטבח וחדרי רחצה",                 icon: ChefHat,     dbStage: "kitchen-bath" },
  { id: "outdoor",      title: "חצר ופיתוח",          description: "גינון וגדרות",                     icon: Trees,       dbStage: "outdoor" },
  { id: "moving",       title: "כניסה לבית",          description: "הובלה וריהוט",                     icon: KeyRound,    dbStage: "moving" },
];

interface MiniDeal {
  id: string;
  title: string;
  cover_image_url: string | null;
  supplier_name: string | null;
  discount_percentage?: number | null;
  deposit_required?: boolean | null;
  deposit_amount?: number | null;
  created_at?: string;
  joiners?: number;
}

type FeedItem =
  | { kind: "deal"; deal: MiniDeal }
  | { kind: "activity"; dealId: string; dealTitle: string; joiners: number };

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

        const validIds = STAGES.map((s) => s.id) as string[];
        const profStage = (prof?.current_stage as string | undefined) ?? "";
        const projStage = (projectResult.data?.current_stage as string | undefined) ?? "";
        const chosen = (validIds.includes(profStage) ? profStage : validIds.includes(projStage) ? projStage : "planning") as StageId;
        const stage: StageId = chosen;

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
          dealIds.length ? supabase.from("deals").select("id,title,supplier_id,cover_image_url,discount_percentage,deposit_required,deposit_amount,created_at,price_before_discount,price_after_discount").in("id", dealIds).eq("is_deleted", false) : Promise.resolve({ data: [] }),
          joinedIds.length
            ? supabase.from("deals").select("price_after_discount,price_before_discount").in("id", joinedIds)
            : Promise.resolve({ data: [] }),
        ]);

        const savings = ((joinedDealsRes.data ?? []) as { price_after_discount: number | null; price_before_discount: number | null }[])
          .reduce((sum, d) => {
            const before = Number(d.price_before_discount ?? 0);
            const after = Number(d.price_after_discount ?? 0);
            const diff = before > after ? before - after : 0;
            return sum + diff;
          }, 0);

        const deals = (dealsRes.data ?? []) as { id: string; title: string; supplier_id: string; cover_image_url: string | null; discount_percentage: number | null; deposit_required: boolean | null; deposit_amount: number | null; created_at: string }[];
        let nextDeals: MiniDeal[] = [];
        if (deals.length) {
          const supIds = Array.from(new Set(deals.map((d) => d.supplier_id)));
          const [sups, joinerCounts] = await Promise.all([
            supabase.from("suppliers").select("id,business_name").in("id", supIds),
            fetchDealJoinerCounts(deals.map((d) => d.id)),
          ]);
          const sMap = new Map(((sups.data ?? []) as { id: string; business_name: string }[]).map((s) => [s.id, s.business_name]));
          nextDeals = deals.map((d) => ({
            id: d.id,
            title: d.title,
            cover_image_url: d.cover_image_url,
            supplier_name: sMap.get(d.supplier_id) ?? null,
            discount_percentage: d.discount_percentage,
            deposit_required: d.deposit_required,
            deposit_amount: d.deposit_amount,
            created_at: d.created_at,
            joiners: joinerCounts[d.id] ?? 0,
          }));
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

  // Interleave deals + activity items (FB-style mixed feed)
  const feedItems = useMemo<FeedItem[]>(() => {
    const out: FeedItem[] = [];
    areaDeals.forEach((d, i) => {
      out.push({ kind: "deal", deal: d });
      // Every 2 deals, insert an activity card if there are joiners
      if (i % 2 === 1 && d.joiners && d.joiners > 0) {
        out.push({ kind: "activity", dealId: d.id, dealTitle: d.title, joiners: d.joiners });
      }
    });
    return out;
  }, [areaDeals]);

  const STAGE_TINTS: Record<string, string> = {
    planning: "#EEF4FF", structure: "#FFF5EB", systems: "#ECFEFF", openings: "#F0FDF4",
    finishes: "#F5F3FF", "kitchen-bath": "#EAF7F2", outdoor: "#F7FEE7", moving: "#FEF2F2",
  };

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F7F5F0", fontFamily: "'Epilogue', system-ui, sans-serif" }}>
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)] px-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        {/* Top bar */}
        <header className="pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/resident/notifications")}
              className="h-10 w-10 rounded-full bg-white border border-[#ECEEF2] flex items-center justify-center shadow-sm active:scale-95 transition-transform"
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
            <p className="text-[13px] text-[#6B7280] mt-1">הקהילה שלך קונה יחד וחוסכת</p>
          </div>
          {city && (
            <button
              onClick={() => navigate("/resident/profile/edit")}
              className="shrink-0 inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white border border-[#ECEEF2] text-[12px] font-semibold text-[#1F2937] shadow-sm active:scale-95 transition-transform"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#0E6B5A]" />
              <MapPin className="h-3 w-3 text-[#6B7280]" strokeWidth={2.4} />
              <span>{city}</span>
            </button>
          )}
        </section>

        {/* === STORIES: project stages (Instagram-style) === */}
        <section className="mt-4 -mx-5 px-5">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {STAGES.map((stage, idx) => {
              const isCurrent = stage.id === currentStage;
              const isPast = idx < currentIdx;
              const tint = STAGE_TINTS[stage.id] ?? "#F4F6FA";
              const Icon = stage.icon;
              return (
                <button
                  key={stage.id}
                  onClick={() => navigate(`/resident/categories?stage=${stage.id}`)}
                  className="shrink-0 flex flex-col items-center gap-1.5 w-[68px] active:scale-95 transition-transform"
                  aria-label={stage.title}
                >
                  <div
                    className={`relative h-[64px] w-[64px] rounded-full flex items-center justify-center ${
                      isCurrent
                        ? "p-[2.5px] bg-gradient-to-tr from-[#0E6B5A] to-[#34A88E]"
                        : isPast
                        ? "p-[2px] bg-[#0E6B5A]/30"
                        : "p-[2px] bg-[#E5E7EB]"
                    }`}
                  >
                    <div
                      className="h-full w-full rounded-full flex items-center justify-center"
                      style={{ background: tint }}
                    >
                      {isPast ? (
                        <Check className="h-5 w-5 text-[#0E6B5A]" strokeWidth={3} />
                      ) : (
                        <Icon className="h-5 w-5 text-[#1F2937]" strokeWidth={2.2} />
                      )}
                    </div>
                    {isCurrent && (
                      <span className="absolute -bottom-0.5 right-1/2 translate-x-1/2 bg-[#0E6B5A] text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold leading-none whitespace-nowrap shadow-md">
                        עכשיו
                      </span>
                    )}
                  </div>
                  <span className={`text-[10.5px] font-bold leading-tight text-center px-0.5 line-clamp-2 ${isCurrent ? "text-[#0E6B5A]" : "text-[#1F2937]"}`}>
                    {stage.title}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Progress bar under stories */}
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%`, background: "linear-gradient(90deg,#0E6B5A,#34A88E)" }}
              />
            </div>
            <span className="text-[10px] font-bold text-[#6B7280] tabular-nums">{completionPct}%</span>
          </div>
        </section>

        {/* === HERO: Savings === */}
        <section className="mt-4">
          <button
            onClick={() => navigate("/resident/my-offers")}
            className="w-full text-right relative overflow-hidden rounded-[28px] p-6 shadow-[0_10px_40px_-12px_rgba(14,107,90,0.35)] active:scale-[0.99] transition-transform"
            style={{ background: "linear-gradient(135deg,#0E6B5A 0%,#0A5547 60%,#063C33 100%)" }}
          >
            {/* decorative blobs */}
            <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-8 w-56 h-56 rounded-full bg-[#34A88E]/20 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                  <Flame className="h-3 w-3" strokeWidth={2.6} />
                  חיסכון מצטבר
                </span>
                <PiggyBank className="h-6 w-6 text-white/40" strokeWidth={2} />
              </div>

              <div className="text-white/70 text-[12px] font-medium mb-1">סך הכל חסכת</div>
              <div className="text-white text-[40px] font-extrabold leading-none tabular-nums tracking-tight animate-fade-in" style={{ fontFamily: "'Urbanist'" }}>
                {formatILS(estimatedSavings)}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <HeroStat value={joinedCount} label="הצעות שלי" />
                <HeroStat value={areaDeals.length} label="פעילות עכשיו" />
                <HeroStat value={areaSuppliersCount} label="ספקים באזור" />
              </div>
            </div>
          </button>
        </section>

        {/* === Quick actions === */}
        <section className="mt-3 grid grid-cols-3 gap-2.5">
          <QuickAction icon={SearchIcon} label="חפש" tint="#EEF4FF" color="#2563EB" onClick={() => navigate("/resident/search")} />
          <QuickAction icon={Calculator} label="תקציב" tint="#F5F3FF" color="#7C3AED" onClick={() => navigate("/resident/budget-planner")} />
          <QuickAction icon={Store} label="ספקים" tint="#FFF5EB" color="#EA580C" onClick={() => navigate("/resident/search")} />
        </section>

        {/* === FEED: deals + community activity === */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[18px] font-extrabold text-[#1F2937] tracking-tight" style={{ fontFamily: "'Urbanist'" }}>
                בשבילך עכשיו
              </h2>
              <p className="text-[12px] text-[#6B7280] mt-0.5">הצעות חמות ופעילות הקהילה שלך</p>
            </div>
            <button
              onClick={() => navigate("/resident/deals")}
              className="text-[12px] font-bold text-[#0E6B5A] hover:underline"
            >
              הכל ←
            </button>
          </div>

          {feedItems.length === 0 ? (
            <div className="bg-white border border-[#ECEEF2] rounded-2xl p-8 text-center">
              <Sparkles className="h-8 w-8 text-[#6B7280] mx-auto mb-2" />
              <p className="text-[13px] text-[#6B7280] font-medium">עדיין אין הצעות פעילות באזור שלך</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedItems.map((item, idx) =>
                item.kind === "deal" ? (
                  <DealFeedCard key={`d-${item.deal.id}-${idx}`} deal={item.deal} onClick={() => navigate(`/resident/deals/${item.deal.id}`)} />
                ) : (
                  <ActivityFeedCard key={`a-${item.dealId}-${idx}`} title={item.dealTitle} joiners={item.joiners} onClick={() => navigate(`/resident/deals/${item.dealId}`)} />
                )
              )}
            </div>
          )}
        </section>
      </div>
      <BottomNav role="resident" />
    </div>
  );
}

/* ============ Sub-components ============ */

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-2.5 border border-white/15">
      <div className="text-white text-[18px] font-extrabold leading-none tabular-nums" style={{ fontFamily: "'Urbanist'" }}>{value}</div>
      <div className="text-white/70 text-[10px] font-medium mt-1 leading-tight">{label}</div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, tint, color, onClick }: { icon: typeof SearchIcon; label: string; tint: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-[#ECEEF2] rounded-2xl p-3 flex flex-col items-center gap-1.5 shadow-[0_2px_10px_-4px_rgba(10,31,61,0.06)] active:scale-[0.96] transition-transform"
    >
      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: tint }}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} style={{ color }} />
      </div>
      <span className="text-[12px] font-bold text-[#1F2937]" style={{ fontFamily: "'Urbanist'" }}>{label}</span>
    </button>
  );
}

function DealFeedCard({ deal, onClick }: { deal: MiniDeal; onClick: () => void }) {
  const discount = deal.discount_percentage ?? 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-right bg-white border border-[#ECEEF2] rounded-[22px] overflow-hidden shadow-[0_4px_16px_-8px_rgba(10,31,61,0.12)] hover:shadow-[0_8px_28px_-10px_rgba(10,31,61,0.20)] hover:-translate-y-0.5 transition-all active:scale-[0.99] animate-fade-in"
    >
      {/* Image */}
      <div className="relative h-44 bg-[#F4F6FA] overflow-hidden">
        {deal.cover_image_url ? (
          <img src={deal.cover_image_url} alt={deal.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-[#D1D5DB]" />
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-3 right-3 bg-[#0E6B5A] text-white text-[12px] font-extrabold px-2.5 py-1 rounded-full shadow-md tabular-nums" style={{ fontFamily: "'Urbanist'" }}>
            {discount}%- 
          </div>
        )}
        {deal.joiners && deal.joiners > 0 ? (
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur text-[#1F2937] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md inline-flex items-center gap-1">
            <Users className="h-3 w-3 text-[#0E6B5A]" strokeWidth={2.6} />
            {deal.joiners} הצטרפו
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="p-4">
        {deal.supplier_name && (
          <div className="text-[11px] text-[#6B7280] font-semibold mb-1">{deal.supplier_name}</div>
        )}
        <div className="text-[15px] font-extrabold text-[#1F2937] leading-tight line-clamp-2" style={{ fontFamily: "'Urbanist'" }}>
          {deal.title}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[11px] text-[#0E6B5A] font-bold">
            <TrendingUp className="h-3 w-3" strokeWidth={2.6} />
            פעיל עכשיו
          </span>
          <span className="text-[12px] font-bold text-[#0E6B5A]">לפרטים ←</span>
        </div>
      </div>
    </button>
  );
}

function ActivityFeedCard({ title, joiners, onClick }: { title: string; joiners: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-right bg-[#F0FAF7] border border-[#0E6B5A]/15 rounded-[20px] p-4 flex items-center gap-3 hover:bg-[#E6F4EF] transition-colors active:scale-[0.99] animate-fade-in"
    >
      {/* Avatar stack */}
      <div className="relative shrink-0 flex">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-9 w-9 rounded-full border-2 border-[#F0FAF7] flex items-center justify-center text-white text-[11px] font-bold"
            style={{
              background: ["#0E6B5A", "#34A88E", "#1F4D45"][i],
              marginRight: i === 0 ? 0 : -12,
              zIndex: 3 - i,
              fontFamily: "'Urbanist'",
            }}
          >
            {["א", "ר", "מ"][i]}
          </div>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-[#0E6B5A] font-bold mb-0.5 inline-flex items-center gap-1">
          <Users className="h-3 w-3" strokeWidth={2.6} />
          {joiners} שכנים הצטרפו
        </div>
        <div className="text-[13px] font-bold text-[#1F2937] leading-tight line-clamp-1" style={{ fontFamily: "'Urbanist'" }}>
          {title}
        </div>
      </div>

      <div className="shrink-0 text-[11px] font-bold text-[#0E6B5A] bg-white border border-[#0E6B5A]/20 px-3 py-1.5 rounded-full">
        הצטרף
      </div>
    </button>
  );
}
