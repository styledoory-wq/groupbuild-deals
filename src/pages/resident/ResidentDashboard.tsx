import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon, MapPin, Sparkles, Store, Users, Flame,
  PencilRuler, Hammer, Plug, ShieldCheck, Palette, ChefHat, Trees, KeyRound, Calculator,
  TrendingUp, Check, ChevronLeft, Heart, Ticket,
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

  const feedItems = useMemo<FeedItem[]>(() => {
    const out: FeedItem[] = [];
    areaDeals.forEach((d, i) => {
      out.push({ kind: "deal", deal: d });
      if (i % 2 === 1 && d.joiners && d.joiners > 0) {
        out.push({ kind: "activity", dealId: d.id, dealTitle: d.title, joiners: d.joiners });
      }
    });
    return out;
  }, [areaDeals]);

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full bg-[#F2F2F7]">
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

        {/* === Project stages — Apple-style segmented strip === */}
        <SectionHeader
          title="שלבי הפרויקט"
          subtitle={`${completionPct}% הושלם`}
          action={
            <button
              onClick={() => navigate(`/resident/categories?stage=${currentStage}`)}
              className="text-[14px] font-medium text-[#0E6B5A]"
            >
              לקטגוריות
            </button>
          }
        />
        <div className="px-5 mt-3">
          <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-sm p-4">
            <div className="flex items-center gap-1.5 mb-3">
              {STAGES.map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-1 rounded-full ${idx <= currentIdx ? "bg-[#0E6B5A]" : "bg-[#F2F2F7]"}`}
                />
              ))}
            </div>
            <div className="-mx-1 px-1 overflow-x-auto no-scrollbar">
              <div className="flex gap-2">
                {STAGES.map((stage, idx) => {
                  const isCurrent = stage.id === currentStage;
                  const isPast = idx < currentIdx;
                  const Icon = stage.icon;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => navigate(`/resident/categories?stage=${stage.id}`)}
                      className={`shrink-0 flex flex-col items-center gap-1.5 w-[68px] py-2 rounded-2xl active:scale-95 transition ${
                        isCurrent ? "bg-[#0E6B5A]/8" : ""
                      }`}
                    >
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center ${
                          isCurrent
                            ? "bg-[#0E6B5A] text-white"
                            : isPast
                            ? "bg-[#0E6B5A]/10 text-[#0E6B5A]"
                            : "bg-[#F2F2F7] text-[#1C1C1E]"
                        }`}
                      >
                        {isPast ? <Check className="h-5 w-5" strokeWidth={2.6} /> : <Icon className="h-5 w-5" strokeWidth={2.2} />}
                      </div>
                      <span className={`text-[10.5px] font-medium leading-tight text-center line-clamp-2 ${isCurrent ? "text-[#0E6B5A]" : "text-[#1C1C1E]"}`}>
                        {stage.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* === Quick actions === */}
        <SectionHeader title="פעולות מהירות" />
        <section className="px-5 mt-3 grid grid-cols-3 gap-3">
          <QuickAction icon={SearchIcon} label="חפש" onClick={() => navigate("/resident/search")} />
          <QuickAction icon={Calculator} label="תקציב" onClick={() => navigate("/resident/budget-planner")} />
          <QuickAction icon={Store} label="ספקים" onClick={() => navigate("/resident/search")} />
        </section>

        {/* === FEED === */}
        <SectionHeader
          title="בשבילך עכשיו"
          subtitle="הצעות חמות באזורך"
          action={<button onClick={() => navigate("/resident/deals")} className="text-[14px] font-medium text-[#0E6B5A]">הצג הכל</button>}
        />
        <div className="px-5 mt-3">
          {feedItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-sm p-7 text-center">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-[#F2F2F7] flex items-center justify-center mb-3">
                <Sparkles className="h-5 w-5 text-[#8E8E93]" />
              </div>
              <p className="text-[13px] text-[#8E8E93] font-medium">עדיין אין הצעות פעילות באזור שלך</p>
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
        </div>
      </div>
      <BottomNav role="resident" />
    </div>
  );
}

/* ============ Sub-components ============ */

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl p-4 border bg-white border-[#E5E5EA] shadow-sm">
      <div className="text-[11px] font-medium text-[#8E8E93] mb-1">{label}</div>
      <div className={`text-[20px] font-bold tracking-tight leading-none tabular-nums truncate ${accent ? "text-[#0E6B5A]" : "text-[#1C1C1E]"}`}>{value}</div>
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

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof SearchIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-[#E5E5EA] rounded-3xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition"
    >
      <div className="h-10 w-10 rounded-2xl bg-[#F2F2F7] flex items-center justify-center">
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
      className="w-full text-right bg-white border border-[#E5E5EA] rounded-3xl overflow-hidden shadow-sm active:scale-[0.99] transition"
    >
      <div className="relative h-44 bg-[#F2F2F7] overflow-hidden">
        {deal.cover_image_url ? (
          <img src={deal.cover_image_url} alt={deal.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-[#D1D1D6]" />
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-3 right-3 bg-[#1C1C1E] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full tabular-nums">
            {discount}%-
          </div>
        )}
        {deal.joiners && deal.joiners > 0 ? (
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur text-[#1C1C1E] text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm inline-flex items-center gap-1">
            <Users className="h-3 w-3 text-[#0E6B5A]" strokeWidth={2.4} />
            {deal.joiners} הצטרפו
          </div>
        ) : null}
      </div>
      <div className="p-4">
        {deal.supplier_name && (
          <div className="text-[11px] text-[#8E8E93] font-medium mb-1 truncate">{deal.supplier_name}</div>
        )}
        <div className="text-[15px] font-semibold text-[#1C1C1E] tracking-tight leading-tight line-clamp-2">
          {deal.title}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[11px] text-[#0E6B5A] font-semibold">
            <TrendingUp className="h-3 w-3" strokeWidth={2.4} /> פעיל עכשיו
          </span>
          <span className="text-[12px] font-semibold text-[#0E6B5A]">לפרטים ←</span>
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
