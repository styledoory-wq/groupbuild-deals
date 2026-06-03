import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, ChevronLeft, Search as SearchIcon, Bell, LogOut,
  PencilRuler, Hammer, Plug, Palette, Trees, Sparkles, Store, Briefcase, BellPlus,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import { DealCardSkeleton } from "@/components/deals/DealCardSkeleton";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StageId = "planning" | "structure" | "systems" | "finishes" | "outdoor";

const STAGES: { id: StageId; title: string; icon: typeof PencilRuler }[] = [
  { id: "planning",  title: "תכנון ועיצוב",  icon: PencilRuler },
  { id: "structure", title: "שלד ובנייה",    icon: Hammer },
  { id: "systems",   title: "מערכות הבית",  icon: Plug },
  { id: "finishes",  title: "גמרים",         icon: Palette },
  { id: "outdoor",   title: "חוץ ופיתוח",   icon: Trees },
];

interface DbDeal extends RealDealCardData {}

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const { user, authReady, logout } = useApp();

  const [profile, setProfile] = useState<{ full_name: string; city: string; project_id: string | null }>({
    full_name: "",
    city: "",
    project_id: null,
  });
  const [currentStage, setCurrentStage] = useState<StageId>("planning");
  const [stageProgress, setStageProgress] = useState(0); // 0–100
  const [areaDeals, setAreaDeals] = useState<DbDeal[]>([]);
  const [areaSuppliersCount, setAreaSuppliersCount] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [activeDealsCount, setActiveDealsCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady || !user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const uid = user.id;

        // Profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,city,project_id")
          .eq("id", uid)
          .maybeSingle();
        const fullName = prof?.full_name ?? user.name ?? "דייר";
        const city = prof?.city ?? "";
        const projectId = (prof?.project_id as string | null) ?? null;

        // Project current stage
        let stage: StageId = "planning";
        if (projectId) {
          const { data: proj } = await supabase
            .from("projects")
            .select("current_stage")
            .eq("id", projectId)
            .maybeSingle();
          const s = (proj?.current_stage as string | undefined) ?? "planning";
          if (["planning","structure","systems","finishes","outdoor"].includes(s)) stage = s as StageId;
        }

        // Stage progress = (index / total) approximation if no real metric stored
        const idx = STAGES.findIndex((x) => x.id === stage);
        setStageProgress(Math.round(((idx + 0.5) / STAGES.length) * 100));

        // Match deals via RPC (city → council → region → nationwide), filtered by stage
        const { data: matches } = await supabase.rpc("get_matching_deals_for_user", {
          _stage_filter: stage,
          _limit: 30,
        });
        const dealIds = (matches ?? []).map((m: { deal_id: string }) => m.deal_id);

        let nextAreaDeals: DbDeal[] = [];
        let suppliersInArea = new Set<string>();

        if (dealIds.length) {
          const { data: deals } = await supabase
            .from("deals")
            .select("id,title,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,cover_image_url,gallery_images")
            .in("id", dealIds);
          const supIds = Array.from(new Set((deals ?? []).map((d) => d.supplier_id as string)));
          const { data: sups } = supIds.length
            ? await supabase.from("suppliers").select("id,business_name,logo_url").in("id", supIds)
            : { data: [] as Array<{ id: string; business_name: string; logo_url: string | null }> };
          const sMap = new Map((sups ?? []).map((s) => [s.id as string, s]));
          nextAreaDeals = (deals ?? []).map((d) => {
            const s = sMap.get(d.supplier_id as string);
            suppliersInArea.add(d.supplier_id as string);
            return {
              ...(d as unknown as DbDeal),
              supplier_name: s?.business_name ?? null,
              supplier_logo_url: s?.logo_url ?? null,
            };
          });
        }

        // Joined / active deals counts
        const { data: interests } = await supabase
          .from("deal_interests")
          .select("deal_id,status")
          .eq("user_id", uid)
          .eq("is_deleted", false);
        const joinedIds = Array.from(new Set((interests ?? []).map((i) => i.deal_id as string)));
        let activeCount = 0;
        if (joinedIds.length) {
          const { data: jdeals } = await supabase
            .from("deals")
            .select("id,status")
            .in("id", joinedIds);
          activeCount = (jdeals ?? []).filter((d) => d.status === "active").length;
        }

        // Unread notifications
        const { count: notifCount } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("is_read", false)
          .eq("is_deleted", false);

        if (cancelled) return;
        setProfile({ full_name: fullName, city, project_id: projectId });
        setCurrentStage(stage);
        setAreaDeals(nextAreaDeals);
        setAreaSuppliersCount(suppliersInArea.size);
        setJoinedCount(joinedIds.length);
        setActiveDealsCount(activeCount);
        setUnreadNotifications(notifCount ?? 0);
      } catch (e) {
        console.error("[ResidentDashboard] load error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authReady, user?.id, user?.name]);

  const currentStageMeta = useMemo(
    () => STAGES.find((s) => s.id === currentStage) ?? STAGES[0],
    [currentStage],
  );
  const CurrentIcon = currentStageMeta.icon;

  const handleSubscribe = async () => {
    if (!user?.id) return;
    await supabase.from("notification_settings").upsert(
      { user_id: user.id, new_offer_push_enabled: true, new_offer_email_enabled: true },
      { onConflict: "user_id" },
    );
    toast.success("נשלח אליך עדכון ברגע שתופיע הצעה באזורך");
  };

  return (
    <MobileShell>
      {/* === Compact header === */}
      <header className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/resident/notifications")}
              className="relative h-10 w-10 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center shadow-[0_2px_8px_-4px_rgba(15,30,60,0.10)]"
              aria-label="התראות"
            >
              <Bell className="h-[18px] w-[18px] text-[#0A1F3D]" strokeWidth={2} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E74C3C] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
            <button
              onClick={async () => { await logout(); toast.success("התנתקת"); navigate("/", { replace: true }); }}
              className="h-10 w-10 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center"
              aria-label="התנתקות"
            >
              <LogOut className="h-[16px] w-[16px] text-[#475569]" strokeWidth={2} />
            </button>
          </div>
          <div className="text-right">
            <h1 className="text-fs-lg font-extrabold text-[#0A1F3D] leading-tight tracking-tight">
              שלום, {profile.full_name || "דייר"}
            </h1>
            <button
              onClick={() => navigate("/resident/profile/edit")}
              className="mt-0.5 flex items-center gap-1 text-fs-xs text-[#475569] font-medium ms-auto"
            >
              <span>{profile.city || "הגדר אזור"}</span>
              <MapPin className="h-3 w-3 text-[#C9A961]" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* === Single search bar === */}
      <div className="px-5">
        <button
          onClick={() => navigate("/resident/search")}
          className="w-full h-11 rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_2px_10px_-6px_rgba(15,30,60,0.10)] flex items-center justify-between px-4 text-[#475569]"
        >
          <SearchIcon className="h-[18px] w-[18px]" strokeWidth={2} />
          <span className="text-fs-sm font-medium">חפש ספקים והצעות</span>
        </button>
      </div>

      {/* === KPI cards === */}
      <div className="px-5 mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "הצעות", val: areaDeals.length, icon: Sparkles, to: "/resident/deals" },
          { label: "ספקים", val: areaSuppliersCount, icon: Store, to: "/resident/categories" },
          { label: "שלי", val: joinedCount, icon: Briefcase, to: "/resident/my-offers" },
          { label: "פעילות", val: activeDealsCount, icon: Sparkles, to: "/resident/my-offers" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <button
              key={k.label}
              onClick={() => navigate(k.to)}
              className="bg-white rounded-xl py-3 px-1 border border-[#E2E8F0] shadow-[0_2px_8px_-6px_rgba(15,30,60,0.08)] flex flex-col items-center active:scale-[0.97] transition-transform"
            >
              <Icon className="h-[14px] w-[14px] text-[#94a3b8] mb-1" strokeWidth={2} />
              <div className="text-[1.35rem] font-extrabold text-[#0A1F3D] leading-none gb-num">{k.val}</div>
              <div className="text-[10px] text-[#475569] mt-1 font-medium">{k.label}</div>
            </button>
          );
        })}
      </div>

      {/* === Horizontal stage progress === */}
      <section className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-fs-sm font-bold text-[#0A1F3D]">שלבי הפרויקט</h2>
          <span className="text-fs-xs text-[#94a3b8]">{stageProgress}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const isCurrent = s.id === currentStage;
            const isPast = STAGES.findIndex((x) => x.id === currentStage) > i;
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/resident/categories?stage=${s.id}`)}
                className={
                  "flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl border transition-all " +
                  (isCurrent
                    ? "bg-[#0A1F3D] border-[#C9A961] text-white"
                    : isPast
                      ? "bg-[#C9A961]/10 border-[#C9A961]/40 text-[#0A1F3D]"
                      : "bg-white border-[#E2E8F0] text-[#94a3b8]")
                }
                aria-label={s.title}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span className="text-[9px] font-semibold leading-tight text-center px-0.5 line-clamp-1">{s.title}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* === Current stage card === */}
      <section className="px-5 mt-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#0A1F3D] to-[#13325E] text-white p-4 shadow-[0_8px_24px_-12px_rgba(10,31,61,0.5)]">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end text-fs-xs text-[#C9A961] uppercase tracking-[0.14em] font-semibold">
                <span>השלב הנוכחי</span>
              </div>
              <div className="text-fs-lg font-extrabold mt-1 tracking-tight">{currentStageMeta.title}</div>
              <div className="text-fs-xs text-white/70 mt-1">
                {areaDeals.length} הצעות זמינות באזור שלך
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <CurrentIcon className="h-6 w-6 text-[#C9A961]" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-[#C9A961] rounded-full transition-all"
              style={{ width: `${stageProgress}%` }}
            />
          </div>
          <button
            onClick={() => navigate(`/resident/categories?stage=${currentStage}`)}
            className="mt-3 w-full h-10 rounded-xl bg-[#C9A961] text-[#0A1F3D] font-bold text-fs-sm flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
          >
            צפה בהצעות
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </section>

      {/* === Recommended offers === */}
      <section className="px-5 mt-5 pb-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-fs-sm font-bold text-[#0A1F3D]">הצעות מומלצות עבורך</h2>
          {areaDeals.length > 0 && (
            <button
              onClick={() => navigate("/resident/deals")}
              className="text-fs-xs text-[#475569] font-medium flex items-center gap-0.5"
            >
              לכולן
              <ChevronLeft className="h-3 w-3" strokeWidth={2} />
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            <DealCardSkeleton />
            <DealCardSkeleton />
          </div>
        )}

        {!loading && areaDeals.length === 0 && (
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#F3E9CC] flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-[#B8923F]" strokeWidth={2} />
            </div>
            <p className="text-fs-sm font-bold text-[#0A1F3D]">אין עדיין הצעות זמינות באזור שלך</p>
            <p className="text-fs-xs text-[#475569] mt-1 leading-relaxed">
              ברגע שספק מהאזור שלך יפרסם הצעה לשלב הנוכחי, נעדכן אותך מיד.
            </p>
            <button
              onClick={handleSubscribe}
              className="mt-4 h-10 px-4 rounded-xl bg-[#0A1F3D] text-white font-bold text-fs-sm inline-flex items-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <BellPlus className="h-4 w-4" strokeWidth={2} />
              עדכן אותי כשיש הצעה חדשה
            </button>
          </div>
        )}

        {!loading && areaDeals.length > 0 && (
          <div className="space-y-3">
            {areaDeals.slice(0, 4).map((d) => (
              <RealDealCard key={d.id} data={d} onClick={() => navigate(`/resident/deals/${d.id}`)} />
            ))}
          </div>
        )}
      </section>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
