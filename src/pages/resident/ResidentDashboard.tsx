import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Sparkles, Users, Flame,
  PencilRuler, Hammer, Plug, ShieldCheck, Palette, ChefHat, Trees, KeyRound, Calculator,
  TrendingUp, Check, ChevronLeft, Heart, Ticket, Building2, Plus, ClipboardList,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupportButton } from "@/components/SupportButton";
import { DocumentsButton } from "@/components/DocumentsButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useApp, formatILS } from "@/store/AppStore";
import { useProjectSummary } from "@/lib/projectStore";
import { supabase } from "@/integrations/supabase/client";
import { fetchDealJoinerCounts } from "@/lib/dealCounts";
import { type StageId } from "@/lib/designSystem";
import { getJourney, type JourneyId, VALID_JOURNEY_IDS } from "@/lib/journeys";
import { QuoteRequestSheet } from "@/components/committee/QuoteRequestSheet";
import { HelpButton } from "@/components/OnboardingFlow";
import { SmartImg } from "@/components/ui/SmartImg";
import { ProjectStagesStepper } from "@/components/project/ProjectStagesStepper";
import { getStagesLite } from "@/lib/projectStagesLite";
import { CURRENT_IDX_KEY } from "@/lib/projectStore";
import { InviteSupplierCard } from "@/components/resident/InviteSupplierCard";
import { InviteSupplierSheet } from "@/components/resident/InviteSupplierSheet";
import { getCreditSummary } from "@/lib/supplierReferral";

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
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [currentStage, setCurrentStage] = useState<StageId>("planning");
  const [journey, setJourney] = useState<JourneyId>("new_build");
  const [areaDeals, setAreaDeals] = useState<MiniDeal[]>([]);
  const [areaSuppliersCount, setAreaSuppliersCount] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [estimatedSavings, setEstimatedSavings] = useState(0);
  const [isCommittee, setIsCommittee] = useState(false);
  const [committeeStats, setCommitteeStats] = useState<{ active_deals: number; joiners: number; savings: number } | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; business_name: string; categories?: string[] | null }[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showInviteCard, setShowInviteCard] = useState(true);
  const [inviteRewardAmount, setInviteRewardAmount] = useState(100);

  useEffect(() => {
    if (!authReady || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const uid = user.id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,city,project_id,city_id,region_id,current_stage,journey")
          .eq("id", uid).maybeSingle();

        const jrRaw = (prof as { journey?: string | null } | null)?.journey ?? "new_build";
        const jr = (VALID_JOURNEY_IDS.includes(jrRaw as JourneyId) ? jrRaw : "new_build") as JourneyId;

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

        const journeyMeta = getJourney(jr);
        const journeyStageIds = journeyMeta.stages as string[];
        const validIds = STAGES.map((s) => s.id) as string[];
        const profStage = (prof?.current_stage as string | undefined) ?? "";
        const projStage = (projectResult.data?.current_stage as string | undefined) ?? "";
        // Pick a stage that's valid for this journey. Single-purchase has no stages -> no filter.
        const allowed = journeyStageIds.length ? journeyStageIds : validIds;
        const chosen = (allowed.includes(profStage) ? profStage : allowed.includes(projStage) ? projStage : (allowed[0] ?? "planning")) as StageId;
        const stage: StageId = chosen;
        // NOTE: intentionally do NOT pass _stage_filter — categories.stage is not
        // always populated, and strict stage matching hides valid deals. We surface
        // all matching-by-location deals and let the user browse.
        void stage;

        const { resolveMyProjectId } = await import("@/lib/projectClient");
        const sharedPid = await resolveMyProjectId(uid);
        const paidDepositsQ = supabase.from("deposits").select("deal_id").eq("status", "paid").eq("is_deleted", false);
        const freeInterestsQ = supabase.from("deal_interests").select("deal_id").eq("is_deleted", false).in("status", ["interested", "approved", "committed", "joined"]);

        const [matchesResult, directCityDealsResult, citySupResult, councilSupResult, regionSupResult, nationwideResult, paidDepositsResult, freeInterestsResult] = await Promise.all([
          supabase.rpc("get_matching_deals_for_user", { _limit: 12 }),
          // Deal-level coverage is the strongest signal. This also supports older
          // resident profiles that have a city name but no normalized city_id.
          cityName
            ? supabase
                .from("deals")
                .select("id")
                .eq("status", "active")
                .eq("is_deleted", false)
                .overlaps("service_areas", [cityName])
                .order("created_at", { ascending: false })
                .limit(12)
            : Promise.resolve({ data: [] }),
          prof?.city_id ? supabase.from("supplier_cities").select("supplier_id").eq("city_id", prof.city_id) : Promise.resolve({ data: [] }),
          councilId ? supabase.from("supplier_councils").select("supplier_id").eq("council_id", councilId) : Promise.resolve({ data: [] }),
          regionId ? supabase.from("supplier_regions").select("supplier_id").eq("region_id", regionId) : Promise.resolve({ data: [] }),
          supabase.from("suppliers").select("id").eq("serves_all_country", true).eq("is_active", true).eq("is_deleted", false).in("approval_status", ["approved", "active"]),
          sharedPid ? paidDepositsQ.eq("project_id", sharedPid) : paidDepositsQ.eq("user_id", uid),
          sharedPid ? freeInterestsQ.eq("project_id", sharedPid) : freeInterestsQ.eq("user_id", uid),
        ]);


        const directCityDealIds = ((directCityDealsResult.data ?? []) as { id: string }[]).map((d) => d.id);
        const rpcDealIds = ((matchesResult.data ?? []) as { deal_id: string }[]).map((m) => m.deal_id);
        // Exact deal-area matches come first, followed by broader supplier/location matches.
        const dealIds = Array.from(new Set([...directCityDealIds, ...rpcDealIds]));
        console.log("[Dashboard/ForYou] user location", { cityId: prof?.city_id, councilId, regionId, cityName });
        console.log("[Dashboard/ForYou] matched deals:", { directCity: directCityDealIds.length, total: dealIds.length, rpcError: matchesResult.error ?? "" });

        // Fallback: if location match returns nothing, surface latest active deals so the card
        // is never empty when active deals exist in the system.
        let usedFallback = false;
        let effectiveDealIds = dealIds;
        if (effectiveDealIds.length === 0) {
          const { data: fbDeals, error: fbErr } = await supabase
            .from("deals")
            .select("id")
            .eq("status", "active")
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .limit(8);
          if (fbErr) console.warn("[Dashboard/ForYou] fallback error", fbErr);
          effectiveDealIds = ((fbDeals ?? []) as { id: string }[]).map((d) => d.id);
          usedFallback = effectiveDealIds.length > 0;
          console.log("[Dashboard/ForYou] fallback active deals:", effectiveDealIds.length);
        }
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

        const [supCountRes, dealsRes, vouchersRes] = await Promise.all([
          supplierIds.size
            ? supabase.from("suppliers").select("id", { count: "exact", head: true })
                .in("id", Array.from(supplierIds)).eq("is_active", true).eq("is_deleted", false).in("approval_status", ["approved", "active"])
            : Promise.resolve({ count: 0 }),
          effectiveDealIds.length ? supabase.from("deals").select("id,title,supplier_id,cover_image_url,discount_percentage,deposit_required,deposit_amount,created_at,original_price,discounted_price").in("id", effectiveDealIds).eq("is_deleted", false).eq("status", "active") : Promise.resolve({ data: [] }),
          (sharedPid
            ? supabase.from("vouchers").select("deal_id").eq("project_id", sharedPid).in("status", ["issued", "active", "redeemed"])
            : supabase.from("vouchers").select("deal_id").eq("user_id", uid).in("status", ["issued", "active", "redeemed"])
          ),
        ]);

        // Savings count only deals that actually closed (voucher was issued to the resident).
        const voucherDealIds = Array.from(new Set(((vouchersRes.data ?? []) as { deal_id: string }[]).map((v) => v.deal_id)));
        let savings = 0;
        if (voucherDealIds.length) {
          const { data: completedDeals } = await supabase
            .from("deals")
            .select("original_price,discounted_price")
            .in("id", voucherDealIds);
          savings = ((completedDeals ?? []) as { discounted_price: number | null; original_price: number | null }[])
            .reduce((sum, d) => {
              const before = Number(d.original_price ?? 0);
              const after = Number(d.discounted_price ?? 0);
              const diff = before > after ? before - after : 0;
              return sum + diff;
            }, 0);
        }

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
        console.log("[Dashboard/ForYou] final deals shown:", nextDeals.length, usedFallback ? "(fallback: latest active)" : "(location-matched)");

        const pid = (prof?.project_id as string | null) ?? null;
        if (pid) {
          const { data: proj } = await supabase.from("projects").select("name").eq("id", pid).maybeSingle();
          if (!cancelled) setProjectName((proj as { name?: string } | null)?.name ?? "");
        }
        if (cancelled) return;
        setFullName(fname); setCity(cityName); setProjectId(pid);
        setCurrentStage(stage);
        setJourney(jr);
        setAreaDeals(nextDeals); setAreaSuppliersCount(supCountRes.count ?? 0); setJoinedCount(joined);
        setEstimatedSavings(savings);
      } catch (e) {
        console.error("[ResidentDashboard] load error", e);
      }
    })();
    return () => { cancelled = true; };
  }, [authReady, user?.id, user?.name]);

  // Detect committee role + load building stats
  useEffect(() => {
    if (!authReady || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      const isC = (roles ?? []).some((r) => (r as { role: string }).role === "committee");
      if (cancelled) return;
      setIsCommittee(isC);
      if (!isC) return;
      const { data: s } = await supabase.rpc("get_committee_dashboard" as never, {} as never);
      if (!cancelled && s) setCommitteeStats(s as unknown as { active_deals: number; joiners: number; savings: number });
    })();
    return () => { cancelled = true; };
  }, [authReady, user?.id]);

  // Referral program: fail-open (show card) if fetch fails
  useEffect(() => {
    if (!authReady || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const summary = await getCreditSummary();
        if (cancelled) return;
        setShowInviteCard(summary.program_enabled !== false);
        setInviteRewardAmount(Number(summary.reward_amount) || 100);
      } catch {
        if (!cancelled) setShowInviteCard(true);
      }
    })();
    return () => { cancelled = true; };
  }, [authReady, user?.id]);

  // Load categories & suppliers when quote sheet opens
  useEffect(() => {
    if (!quoteOpen) return;
    let cancelled = false;
    (async () => {
      const [{ data: cats }, { data: sups }] = await Promise.all([
        supabase.from("categories").select("id,name").eq("is_active", true).order("name"),
        supabase.from("suppliers").select("id,business_name,categories").eq("is_active", true).eq("is_deleted", false).in("approval_status", ["approved", "active"]).order("business_name"),
      ]);
      if (cancelled) return;
      setCategories((cats ?? []) as { id: string; name: string }[]);
      setSuppliers((sups ?? []) as { id: string; business_name: string }[]);
    })();
    return () => { cancelled = true; };
  }, [quoteOpen]);

  const journeyMeta = useMemo(() => getJourney(journey), [journey]);
  const journeyStages = useMemo(
    () => STAGES.filter((s) => journeyMeta.stages.includes(s.id)),
    [journeyMeta]
  );
  const currentIdx = useMemo(() => Math.max(0, journeyStages.findIndex((s) => s.id === currentStage)), [currentStage, journeyStages]);
  // Single source of truth: pull real task completion from Project Management (localStorage-mirrored from cloud).
  const projectSummary = useProjectSummary();
  const completionPct = projectSummary.tasksTotal > 0
    ? projectSummary.progressPct
    : (journeyStages.length ? Math.round(((currentIdx + 1) / journeyStages.length) * 100) : 0);

  const feedItems = useMemo<FeedItem[]>(() => {
    // Keep the home feed as a quick taste — up to 5 deals only, no interleaved activity rows.
    return areaDeals.slice(0, 5).map((d) => ({ kind: "deal", deal: d }) as FeedItem);
  }, [areaDeals]);

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full bg-[#F7F5F0]">
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 24px)" }}
      >
        {/* Top bar */}
        <header className="px-5 pt-5 pb-1 flex items-start justify-between">
          <div className="text-right flex-1 min-w-0">
            <div className="text-[13px] text-[#8E8E93] font-medium mb-0.5">שלום,</div>
            <h1 className="text-[28px] font-bold text-[#1C1C1E] leading-[1.1] tracking-[-0.03em] break-words">
              {fullName || "דייר"}
            </h1>
            {city && (
              <button
                onClick={() => navigate("/resident/profile/edit")}
                className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-[#0E6B5A] font-medium active:opacity-70"
              >
                <MapPin className="h-3 w-3" strokeWidth={2.4} /> {city}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/resident/notifications")}
              className="h-10 w-10 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center shadow-sm active:scale-95 transition"
              aria-label="התראות"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </button>
            <SupportButton />
            <DocumentsButton />
            <ProfileAvatar fallbackName={fullName} />
          </div>
        </header>

        {/* === HERO: Savings (brand green tile) === */}
        <section className="px-5 mt-6">
          <button
            onClick={() => navigate("/resident/my-offers")}
            className="w-full text-right rounded-3xl p-6 border border-[#0E6B5A] shadow-[0_10px_30px_-12px_rgba(14,107,90,0.45)] active:scale-[0.99] transition relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,#0E6B5A 0%,#0A5547 60%,#063C33 100%)" }}
          >
            <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-6 w-48 h-48 rounded-full bg-[#34A88E]/25 blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/20">
                  <Flame className="h-3 w-3" strokeWidth={2.4} /> חיסכון מצטבר
                </span>
                <ChevronLeft className="h-4 w-4 text-white/50" strokeWidth={2} />
              </div>
              <div className="text-white/70 text-[12px] font-medium mb-1">סך הכל חסכת</div>
              <div className="text-white text-[36px] font-bold leading-none tabular-nums tracking-[-0.03em]">
                {formatILS(estimatedSavings)}
              </div>
            </div>
          </button>
        </section>

        {/* KPI tiles */}
        <section className="px-5 mt-3 grid grid-cols-3 gap-3">
          <Kpi label="הצעות שלי" value={joinedCount.toString()} />
          <Kpi label="פעילות" value={areaDeals.length.toString()} accent />
          <Kpi label="ספקים" value={areaSuppliersCount.toString()} />
        </section>

        {showInviteCard && (
          <InviteSupplierCard
            rewardAmount={inviteRewardAmount}
            onInvite={() => setInviteOpen(true)}
          />
        )}

        {/* (Project management is now the main quick-action tile below) */}


        {/* === Committee management — only for approved committee reps === */}
        {isCommittee && (
          <section className="px-5 mt-5">
            <div
              className="rounded-3xl p-5 border border-[#0E6B5A]/20 shadow-sm relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#FFFFFF 0%,#E8F1EE 100%)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-2xl bg-[#0E6B5A] flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-white" strokeWidth={2.4} />
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-bold text-[#1C1C1E] tracking-tight leading-tight">ועד הבית שלי</div>
                    <div className="text-[11px] text-[#0E6B5A] font-semibold mt-0.5">נציג מאושר</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/committee")}
                  className="text-[12px] font-semibold text-[#0E6B5A] inline-flex items-center gap-0.5"
                >
                  ניהול <ChevronLeft className="h-3 w-3" strokeWidth={2.4} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <MiniStat label="עסקאות" value={(committeeStats?.active_deals ?? 0).toString()} />
                <MiniStat label="הצטרפו" value={(committeeStats?.joiners ?? 0).toString()} />
                <MiniStat label="חיסכון" value={formatILS(committeeStats?.savings ?? 0)} small />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setQuoteOpen(true)}
                  className="bg-[#0E6B5A] text-white rounded-2xl py-3 px-3 text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.6} /> יזום עסקה
                </button>
                <button
                  onClick={() => navigate("/committee")}
                  className="bg-white border border-[#0E6B5A]/20 text-[#0E6B5A] rounded-2xl py-3 px-3 text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <ClipboardList className="h-3.5 w-3.5" strokeWidth={2.6} /> משימות וניהול
                </button>
              </div>
            </div>
          </section>
        )}



        {/* Project stages carousel moved to Project Management screen — dashboard shows summary only via MyProjectCard */}

        {/* === Single-purchase callout === */}
        {journey === "single_purchase" && (
          <div className="px-5 mt-6">
            <button
              onClick={() => navigate("/resident/categories")}
              className="w-full text-right bg-white rounded-3xl border border-[#E5E5EA] shadow-sm p-5 active:scale-[0.99] transition"
            >
              <div className="text-[12px] text-[#0E6B5A] font-semibold mb-1">חיפוש לפי קטגוריה</div>
              <div className="text-[17px] font-bold text-[#1C1C1E] tracking-tight leading-tight">
                מה אתה צריך עכשיו?
              </div>
              <div className="text-[12px] text-[#8E8E93] mt-1">דפדוף בכל הקטגוריות והעסקאות הזמינות</div>
            </button>
          </div>
        )}

        {/* === My project — synced with Project Management === */}
        <MyProjectCard onOpen={() => navigate("/resident/project-management")} />

        {/* === Group buy CTA === */}
        <div className="px-5 mt-6">
          <button
            onClick={() => navigate("/resident/demand/new")}
            className="w-full text-right bg-gradient-to-l from-[#0E6B5A] to-[#137a68] rounded-3xl p-5 text-white active:scale-[0.99] transition shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] font-semibold opacity-90 mb-1">רכישה קבוצתית</div>
                <div className="text-[16px] font-bold tracking-tight">פתח בקשה חדשה</div>
                <div className="text-[12px] opacity-90 mt-1">נחפש עבורך ספקים במחירים משתלמים</div>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center">
                <Plus className="h-5 w-5" strokeWidth={2.6} />
              </div>
            </div>
          </button>
        </div>

        {/* === Quick actions === */}
        <SectionHeader title="פעולות מהירות" />
        <section className="px-5 mt-3 grid grid-cols-4 gap-2">
          <QuickAction icon={ClipboardList} label="ניהול פרויקט" onClick={() => navigate("/resident/project-management")} />
          <QuickAction icon={ClipboardList} label="הבקשות שלי" onClick={() => navigate("/resident/demands")} />
          <QuickAction icon={Heart} label="מועדפים" onClick={() => navigate("/resident/favorites")} />
          <QuickAction icon={Ticket} label="שוברים" onClick={() => navigate("/resident/my-vouchers")} />
        </section>

        {/* === FEED === */}
        <SectionHeader
          title="בשבילך עכשיו"
          subtitle="הצעות חמות באזורך"
          action={<button onClick={() => navigate("/resident/deals")} className="text-[14px] font-medium text-[#0E6B5A]">הצג הכל</button>}
        />
        <div className="mt-3">
          {feedItems.length === 0 ? (
            <div className="mx-5 bg-white rounded-3xl border border-[#E5E5EA] shadow-sm p-7 text-center">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-[#F7F5F0] flex items-center justify-center mb-3">
                <Sparkles className="h-5 w-5 text-[#8E8E93]" />
              </div>
              <p className="text-[13px] text-[#8E8E93] font-medium">כרגע אין הצעות פעילות. נעדכן ברגע שיפורסמו הצעות חדשות.</p>
            </div>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-5 px-5 pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              dir="rtl"
            >
              {feedItems.map((item, idx) =>
                item.kind === "deal" ? (
                  <DealFeedCard
                    key={`d-${item.deal.id}-${idx}`}
                    deal={item.deal}
                    onClick={() => navigate(`/resident/deals/${item.deal.id}`)}
                  />
                ) : null,
              )}
              <button
                onClick={() => navigate("/resident/deals")}
                className="snap-start shrink-0 w-[120px] rounded-3xl border border-dashed border-[#0E6B5A]/40 bg-white flex flex-col items-center justify-center gap-2 text-[#0E6B5A] active:scale-[0.98] transition"
                style={{ minHeight: 200 }}
              >
                <div className="h-10 w-10 rounded-full bg-[#0E6B5A]/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" strokeWidth={2.4} />
                </div>
                <span className="text-[12px] font-semibold">הצג הכל</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <BottomNav role="resident" />
      <HelpButton role="resident" />

      {isCommittee && quoteOpen && (
        <QuoteRequestSheet
          projectName={projectName}
          projectId={projectId}
          categories={categories}
          suppliers={suppliers}
          onClose={() => setQuoteOpen(false)}
        />
      )}

      <InviteSupplierSheet open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

/* ============ Sub-components ============ */

function MyProjectCard({ onOpen }: { onOpen: () => void }) {
  const p = useProjectSummary();
  const navigate = useNavigate();
  if (!p.hasProject) return null;
  const title = p.info.name || "הפרויקט שלי";
  const stageLabel = p.currentStageTitle || (p.info.projectType ? "פרויקט פעיל" : "בהגדרה");
  const target = p.info.targetDate
    ? (() => {
        const [y, m, d] = p.info.targetDate!.split("-");
        return y && m && d ? `${d}.${m}.${y.slice(2)}` : p.info.targetDate!;
      })()
    : "—";
  const budgetPct = p.budgetTotal > 0 ? Math.min(100, Math.round((p.budgetUsed / p.budgetTotal) * 100)) : 0;
  const stages = getStagesLite(p.info.projectType);
  const currentIdx = Math.min(Math.max(0, p.stageIdx), Math.max(0, stages.length - 1));

  const goToStage = (i: number) => {
    try { localStorage.setItem(CURRENT_IDX_KEY, String(i)); } catch {}
    navigate("/resident/project-management");
  };

  return (
    <div className="px-5 mt-6">
      <SectionHeader
        title="הפרויקט שלי"
        subtitle={`${p.progressPct}% הושלם`}
        action={<button onClick={onOpen} className="text-[14px] font-medium text-[#0E6B5A]">ניהול פרויקט</button>}
      />
      <div className="mt-3 w-full bg-white rounded-3xl border border-[#E5E5EA] shadow-sm p-4">
        <button onClick={onOpen} className="w-full text-right active:scale-[0.99] transition">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[16px] font-bold text-[#1C1C1E] tracking-tight leading-tight truncate">{title}</div>
              <div className="text-[12px] text-[#8E8E93] mt-1 truncate">שלב נוכחי: {stageLabel}</div>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-[#0E6B5A] bg-[#0E6B5A]/10 px-2 py-1 rounded-full">
              {stages.length > 0 ? `שלב ${currentIdx + 1}/${stages.length}` : "פעיל"}
            </span>
          </div>
        </button>

        {/* Numbered-circle stepper — same visual as ProjectManagement */}
        {stages.length > 0 && (
          <div className="mt-3">
            <ProjectStagesStepper
              stages={stages}
              currentIdx={currentIdx}
              onSelect={goToStage}
              compact
            />
          </div>
        )}

        <button onClick={onOpen} className="tap-target w-full text-right active:scale-[0.99] transition">
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniInfo label="יעד" value={target} />
            <MiniInfo
              label="תקציב"
              value={p.budgetTotal > 0 ? `${budgetPct}%` : "—"}
              hint={p.budgetTotal > 0 ? `₪${p.budgetUsed.toLocaleString()} / ₪${p.budgetTotal.toLocaleString()}` : undefined}
            />
            <MiniInfo
              label="חיסכון"
              value={p.groupSavings > 0 ? `₪${p.groupSavings.toLocaleString()}` : "—"}
            />
          </div>
          {p.tasksTotal > 0 && (
            <div className="mt-2 text-[11px] text-[#8E8E93] text-right">
              משימות: {p.tasksDone}/{p.tasksTotal}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}


function MiniInfo({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-[#FAFAF7] rounded-xl p-2.5 text-center border border-[#F1EFEA]">
      <div className="text-[10px] text-[#8E8E93] mb-0.5 font-medium">{label}</div>
      <div className="text-[13px] font-bold text-[#1C1C1E] tabular-nums truncate">{value}</div>
      {hint && <div className="text-[9.5px] text-[#8E8E93] mt-0.5 tabular-nums truncate">{hint}</div>}
    </div>
  );
}


function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl p-4 border bg-white border-[#E5E5EA] shadow-sm">
      <div className="text-[11px] font-medium text-[#8E8E93] mb-1">{label}</div>
      <div className={`text-[20px] font-bold tracking-tight leading-none tabular-nums truncate ${accent ? "text-[#0E6B5A]" : "text-[#1C1C1E]"}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-white/70 backdrop-blur rounded-xl p-2.5 text-center border border-white">
      <div className={`font-bold text-[#1C1C1E] tabular-nums leading-none truncate ${small ? "text-[12px]" : "text-[16px]"}`}>{value}</div>
      <div className="text-[10px] text-[#6B6B6B] mt-1 font-medium">{label}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 mt-8 flex items-end justify-between gap-3">
      <div className="text-right">
        <h2 className="text-[22px] font-bold text-[#1C1C1E] tracking-[-0.02em] leading-tight">{title}</h2>
        {subtitle && <div className="text-[13px] text-[#8E8E93] mt-0.5">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Calculator; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tap-target bg-white border border-[#E5E5EA] rounded-3xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition"
    >
      <div className="h-10 w-10 rounded-2xl bg-[#F7F5F0] flex items-center justify-center">
        <Icon className="h-[18px] w-[18px] text-[#1C1C1E]" strokeWidth={2} />
      </div>
      <span className="text-[12px] font-semibold text-[#1C1C1E] tracking-tight">{label}</span>
    </button>
  );
}

function DealFeedCard({ deal, onClick }: { deal: MiniDeal; onClick: () => void }) {
  const discount = deal.discount_percentage ?? 0;
  return (
    <button
      onClick={onClick}
      className="snap-start shrink-0 basis-[78%] max-w-[300px] text-right bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden shadow-sm active:scale-[0.99] transition flex flex-col"
      style={{ minHeight: 200, maxHeight: 220 }}
    >
      <div className="relative h-[92px] bg-[#F7F5F0] overflow-hidden shrink-0">
        {deal.cover_image_url ? (
          <SmartImg src={deal.cover_image_url} size="card" alt={deal.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-[#D1D1D6]" />
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-[#1C1C1E] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full tabular-nums">
            {discount}%-
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        {deal.supplier_name && (
          <div className="text-[10px] text-[#8E8E93] font-medium mb-0.5 truncate">{deal.supplier_name}</div>
        )}
        <div className="text-[13px] font-semibold text-[#1C1C1E] tracking-tight leading-tight line-clamp-2">
          {deal.title}
        </div>
        <div className="mt-auto pt-2 flex items-center justify-between">
          {discount > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#0E6B5A] font-semibold bg-[#0E6B5A]/10 px-1.5 py-0.5 rounded-full">
              <TrendingUp className="h-2.5 w-2.5" strokeWidth={2.4} /> חיסכון {discount}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#0E6B5A] font-semibold">
              <TrendingUp className="h-2.5 w-2.5" strokeWidth={2.4} /> פעיל
            </span>
          )}
          <span className="text-[11px] font-semibold text-[#0E6B5A]">לפרטים ←</span>
        </div>
      </div>
    </button>
  );
}

function ActivityFeedCard({ title, joiners, onClick }: { title: string; joiners: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-right bg-white border border-[#E5E5EA] rounded-3xl p-4 flex items-center gap-3 shadow-sm active:scale-[0.99] transition"
    >
      <div className="relative shrink-0 flex">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-9 w-9 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px] font-semibold"
            style={{
              background: ["#0E6B5A", "#34A88E", "#1F4D45"][i],
              marginRight: i === 0 ? 0 : -12,
              zIndex: 3 - i,
            }}
          >
            {["א", "ר", "מ"][i]}
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-[#0E6B5A] font-semibold mb-0.5 inline-flex items-center gap-1">
          <Users className="h-3 w-3" strokeWidth={2.4} />
          {joiners} שכנים הצטרפו
        </div>
        <div className="text-[13px] font-semibold text-[#1C1C1E] tracking-tight leading-tight line-clamp-1">
          {title}
        </div>
      </div>
      <div className="shrink-0 text-[11px] font-semibold text-white bg-[#1C1C1E] px-3 py-1.5 rounded-full">
        הצטרף
      </div>
    </button>
  );
}
