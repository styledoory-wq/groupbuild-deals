import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Search as SearchIcon, ChevronLeft, User as UserIcon,
  Sparkles, Store, Briefcase, PencilRuler, Hammer, Plug, Palette, Trees,
  Info, BellPlus, Triangle, Armchair, Users2, Wrench, Wind, Lightbulb,
  Brush, LayoutGrid, Bath, Sprout, Fence, Sun, Users,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { fetchDealJoinerCounts } from "@/lib/dealCounts";
import { toast } from "sonner";

type StageId = "planning" | "structure" | "systems" | "finishes" | "outdoor";

const STAGES: { id: StageId; title: string; short: string; icon: typeof PencilRuler; description: string }[] = [
  { id: "planning",  title: "תכנון ועיצוב", short: "תכנון ועיצוב", icon: PencilRuler, description: "כל מה שקשור לתכנון, עיצוב וקבלת ההחלטות הראשונות לבית שלכם." },
  { id: "structure", title: "שלד ובנייה",    short: "שלד ובנייה",   icon: Hammer,      description: "שלב הבנייה — קונסטרוקציה, איטום, גג ומעטפת." },
  { id: "systems",   title: "מערכות הבית",  short: "מערכות הבית", icon: Plug,        description: "חשמל, אינסטלציה, מיזוג ומערכות חכמות." },
  { id: "finishes",  title: "גמרים",         short: "גמרים",         icon: Palette,     description: "ריצוף, צבע, מטבחים, חדרי רחצה וגמרים פנימיים." },
  { id: "outdoor",   title: "חוץ ופיתוח",   short: "חוץ ופיתוח",   icon: Trees,       description: "גינון, חצרות, גדרות ופיתוח חיצוני." },
];

interface MiniDeal { id: string; title: string; cover_image_url: string | null; supplier_name: string | null }

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [council, setCouncil] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  const [currentStage, setCurrentStage] = useState<StageId>("planning");
  const [stageProgress, setStageProgress] = useState(20);
  const [stageCategories, setStageCategories] = useState<{ id: string; name: string; icon: string }[]>([]);

  const [areaDeals, setAreaDeals] = useState<MiniDeal[]>([]);
  const [areaSuppliersCount, setAreaSuppliersCount] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [groupResidents, setGroupResidents] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!authReady || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const uid = user.id;

        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,city,project_id,city_id")
          .eq("id", uid)
          .maybeSingle();

        const fname = prof?.full_name ?? user.name ?? "דייר";
        const cityName = prof?.city ?? "";
        let councilName = "";
        if (prof?.city_id) {
          const { data: cityRow } = await supabase
            .from("cities")
            .select("council_id")
            .eq("id", prof.city_id)
            .maybeSingle();
          if (cityRow?.council_id) {
            const { data: c } = await supabase
              .from("regional_councils")
              .select("name_he")
              .eq("id", cityRow.council_id)
              .maybeSingle();
            councilName = c?.name_he ?? "";
          }
        }

        let stage: StageId = "planning";
        if (prof?.project_id) {
          const { data: proj } = await supabase
            .from("projects")
            .select("current_stage")
            .eq("id", prof.project_id)
            .maybeSingle();
          const s = (proj?.current_stage as string | undefined) ?? "planning";
          if (["planning","structure","systems","finishes","outdoor"].includes(s)) stage = s as StageId;
        }
        const idx = STAGES.findIndex((x) => x.id === stage);
        const progress = Math.round(((idx + 0.2) / STAGES.length) * 100);

        const { data: cats } = await supabase
          .from("categories")
          .select("id,name,icon")
          .eq("stage", stage)
          .eq("is_active", true)
          .eq("is_deleted", false)
          .order("display_order")
          .limit(3);

        const { data: matches } = await supabase.rpc("get_matching_deals_for_user", {
          _stage_filter: stage,
          _limit: 12,
        });
        const dealIds = (matches ?? []).map((m: { deal_id: string }) => m.deal_id);

        let nextDeals: MiniDeal[] = [];
        let suppliers = new Set<string>();
        let totalJoiners = 0;
        if (dealIds.length) {
          const { data: deals } = await supabase
            .from("deals")
            .select("id,title,supplier_id,cover_image_url")
            .in("id", dealIds);
          const supIds = Array.from(new Set((deals ?? []).map((d) => d.supplier_id as string)));
          const { data: sups } = supIds.length
            ? await supabase.from("suppliers").select("id,business_name").in("id", supIds)
            : { data: [] as Array<{ id: string; business_name: string }> };
          const sMap = new Map((sups ?? []).map((s) => [s.id as string, s.business_name as string]));
          nextDeals = (deals ?? []).map((d) => {
            suppliers.add(d.supplier_id as string);
            return {
              id: d.id as string,
              title: d.title as string,
              cover_image_url: (d.cover_image_url as string) ?? null,
              supplier_name: sMap.get(d.supplier_id as string) ?? null,
            };
          });
          const counts = await fetchDealJoinerCounts(nextDeals.map((d) => d.id));
          totalJoiners = Object.values(counts).reduce((a, b) => a + b, 0);
        }

        const { data: interests } = await supabase
          .from("deal_interests")
          .select("deal_id")
          .eq("user_id", uid)
          .eq("is_deleted", false);
        const joined = new Set((interests ?? []).map((i) => i.deal_id as string)).size;

        const { count: notifCount } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("is_read", false)
          .eq("is_deleted", false);

        if (cancelled) return;
        setFullName(fname);
        setCity(cityName);
        setCouncil(councilName);
        setProjectId(prof?.project_id ?? null);
        setCurrentStage(stage);
        setStageProgress(progress);
        setStageCategories((cats ?? []).map((c) => ({ id: c.id, name: c.name, icon: c.icon })));
        setAreaDeals(nextDeals);
        setAreaSuppliersCount(suppliers.size);
        setJoinedCount(joined);
        setGroupResidents(totalJoiners);
        setUnreadNotifications(notifCount ?? 0);
      } catch (e) {
        console.error("[ResidentDashboard] load error", e);
      }
    })();
    return () => { cancelled = true; };
  }, [authReady, user?.id, user?.name]);

  const stageMeta = useMemo(() => STAGES.find((s) => s.id === currentStage) ?? STAGES[0], [currentStage]);
  const StageIcon = stageMeta.icon;
  const heroDeal = areaDeals[0];

  const handleSubscribe = async () => {
    if (!user?.id) return;
    await supabase.from("notification_settings").upsert(
      { user_id: user.id, new_offer_push_enabled: true, new_offer_email_enabled: true },
      { onConflict: "user_id" },
    );
    toast.success("נשלח אליך עדכון ברגע שתופיע הצעה באזורך");
  };

  // Progress ring geometry
  const R = 22, C = 2 * Math.PI * R;

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full text-white"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, #0E2A55 0%, #071C3B 55%, #04122A 100%)",
      }}
    >
      <div
        className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + var(--nav-h) + 12px)" }}
      >
        {/* === Header === */}
        <header className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/resident/notifications")}
            className="relative h-11 w-11 rounded-full border border-white/12 bg-white/[0.04] flex items-center justify-center"
            aria-label="התראות"
          >
            <Bell className="h-[18px] w-[18px] text-white/80" strokeWidth={2} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E74C3C] text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate("/resident/profile")}
            className="flex items-center gap-3 min-w-0"
          >
            <div className="text-right min-w-0">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[17px] font-bold tracking-tight truncate">שלום {fullName || "דייר"}</span>
                <span aria-hidden>👋</span>
              </div>
              <div className="text-[12px] text-white/60 mt-0.5 truncate">
                {city || "הגדר אזור"}{council ? ` · ${council}` : ""}
              </div>
            </div>
            <div className="h-11 w-11 rounded-full bg-white/[0.06] border border-[#C9A961]/40 flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-[#C9A961]" strokeWidth={2} />
            </div>
          </button>
        </header>

        {/* === Search === */}
        <div className="px-5">
          <button
            onClick={() => navigate("/resident/search")}
            className="w-full h-11 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-between px-4 text-white/60"
          >
            <SearchIcon className="h-[18px] w-[18px]" strokeWidth={2} />
            <span className="text-[13px] font-medium">חפש ספקים, קטגוריות, מוצרים…</span>
          </button>
        </div>

        {/* === 3 KPI cards === */}
        <div className="px-5 mt-4 grid grid-cols-3 gap-2.5">
          {[
            { label: "הצעות", sub: "הצעות פעילות", val: areaDeals.length, Icon: Sparkles, to: "/resident/deals" },
            { label: "ספקים", sub: "ספקים באזור", val: areaSuppliersCount, Icon: Store, to: "/resident/categories" },
            { label: "שלי",   sub: "הצעות שהצטרפת", val: joinedCount, Icon: Briefcase, to: "/resident/my-offers" },
          ].map((k) => (
            <button
              key={k.label}
              onClick={() => navigate(k.to)}
              className="rounded-2xl bg-white/[0.04] border border-white/10 py-3 px-2 flex flex-col items-center active:scale-[0.97] transition-transform"
            >
              <k.Icon className="h-[18px] w-[18px] text-[#C9A961] mb-1.5" strokeWidth={2} />
              <div className="text-[26px] font-extrabold leading-none gb-num">{k.val}</div>
              <div className="text-[12px] text-white/85 mt-1.5 font-semibold">{k.label}</div>
              <div className="text-[10px] text-white/45 mt-0.5">{k.sub}</div>
            </button>
          ))}
        </div>

        {/* === Stage stepper === */}
        <section className="px-5 mt-5">
          <div className="flex items-center justify-end gap-1.5 mb-3">
            <h2 className="text-[13px] font-bold text-white">תהליך הבית שלי</h2>
            <Info className="h-3.5 w-3.5 text-[#C9A961]" strokeWidth={2} />
          </div>
          <div className="relative">
            {/* connector line */}
            <div className="absolute top-3.5 right-3 left-3 h-px bg-white/12" />
            <div
              className="absolute top-3.5 right-3 h-px bg-[#C9A961] transition-all"
              style={{
                width: `calc((100% - 24px) * ${STAGES.findIndex((s) => s.id === currentStage) / (STAGES.length - 1)})`,
              }}
            />
            <div className="grid grid-cols-5 gap-1">
              {STAGES.map((s, i) => {
                const isCurrent = s.id === currentStage;
                const isPast = STAGES.findIndex((x) => x.id === currentStage) > i;
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/resident/categories?stage=${s.id}`)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={
                        "relative z-10 h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-bold border " +
                        (isCurrent
                          ? "bg-[#C9A961] border-[#C9A961] text-[#0A1F3D]"
                          : isPast
                            ? "bg-[#C9A961]/15 border-[#C9A961]/60 text-[#C9A961]"
                            : "bg-transparent border-white/20 text-white/45")
                      }
                    >
                      {i + 1}
                    </span>
                    <span className={"text-[10px] leading-tight text-center px-0.5 " + (isCurrent ? "text-[#C9A961] font-bold" : "text-white/55 font-medium")}>
                      {s.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* === Featured current-stage card === */}
        <section className="px-5 mt-5">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
            <div className="grid grid-cols-[42%_1fr]">
              {/* image side */}
              <div className="relative h-full min-h-[200px] bg-[#0A1F3D]">
                {heroDeal?.cover_image_url ? (
                  <img src={heroDeal.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#13325E] to-[#071C3B]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#04122A]/85 via-transparent to-transparent" />
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur text-[10px] font-bold text-[#C9A961] border border-[#C9A961]/40">
                  שלב נוכחי
                </span>
                {groupResidents > 0 && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/55 backdrop-blur rounded-full px-2.5 py-1">
                    <Sparkles className="h-3 w-3 text-[#C9A961]" strokeWidth={2.5} />
                    <span className="text-[11px] font-bold text-white">{groupResidents}</span>
                    <span className="text-[10px] text-white/70">דיירים בקבוצה</span>
                  </div>
                )}
              </div>

              {/* content side */}
              <div className="p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="relative h-12 w-12 shrink-0">
                    <svg viewBox="0 0 50 50" className="h-12 w-12 -rotate-90">
                      <circle cx="25" cy="25" r={R} stroke="rgba(255,255,255,0.12)" strokeWidth="4" fill="none" />
                      <circle
                        cx="25" cy="25" r={R}
                        stroke="#C9A961" strokeWidth="4" fill="none" strokeLinecap="round"
                        strokeDasharray={C}
                        strokeDashoffset={C - (C * stageProgress) / 100}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#C9A961]">
                      {stageProgress}%
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[18px] font-extrabold tracking-tight leading-tight">{stageMeta.title}</div>
                  </div>
                </div>

                <p className="mt-2 text-[12px] text-white/70 leading-relaxed text-right line-clamp-2">
                  {stageMeta.description}
                </p>

                {stageCategories.length > 0 && (
                  <>
                    <div className="my-3 h-px bg-white/10" />
                    <div className="grid grid-cols-3 gap-1.5">
                      {stageCategories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => navigate(`/resident/categories/${c.id}`)}
                          className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                        >
                          <span className="text-[18px] leading-none">{c.icon}</span>
                          <span className="text-[10px] text-white/70 text-center line-clamp-1 leading-tight">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <button
                  onClick={() => navigate(`/resident/categories?stage=${currentStage}`)}
                  className="mt-3 h-10 rounded-xl bg-[#C9A961] text-[#0A1F3D] font-extrabold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={3} />
                  צפה בהצעות
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* === Recommended offers entry === */}
        <section className="px-5 mt-3.5">
          {areaDeals.length > 0 ? (
            <button
              onClick={() => navigate("/resident/deals")}
              className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
            >
              <ChevronLeft className="h-4 w-4 text-white/55" strokeWidth={2} />
              <div className="flex items-center gap-3 min-w-0 text-right">
                <div className="min-w-0">
                  <div className="text-[14px] font-bold leading-tight">עסקאות מומלצות עבורך</div>
                  <div className="text-[11px] text-white/55 mt-0.5 truncate">הצעות שנבחרו במיוחד עבורך</div>
                </div>
                <div className="h-9 w-9 rounded-xl bg-[#C9A961]/15 border border-[#C9A961]/30 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-[#C9A961]" strokeWidth={2} />
                </div>
              </div>
            </button>
          ) : (
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 text-center">
              <p className="text-[13px] font-bold">אין עדיין הצעות זמינות באזור שלך</p>
              <p className="text-[11px] text-white/55 mt-1">נעדכן אותך מיד כשתופיע הצעה לשלב הנוכחי.</p>
              <button
                onClick={handleSubscribe}
                className="mt-3 h-9 px-4 rounded-xl bg-[#C9A961] text-[#0A1F3D] text-[12px] font-bold inline-flex items-center gap-1.5"
              >
                <BellPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
                עדכן אותי כשיש הצעה חדשה
              </button>
            </div>
          )}
        </section>
      </div>

      <BottomNav role="resident" />
    </div>
  );
}
