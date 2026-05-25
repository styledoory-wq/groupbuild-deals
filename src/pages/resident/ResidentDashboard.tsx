import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, MapPin, ChevronLeft, Heart, Search, LogOut, Compass, Hammer, Plug, Palette, Trees, PencilRuler, Tag, MessageCircle, Bell, Menu } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import { DealCardSkeleton } from "@/components/deals/DealCardSkeleton";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRegions } from "@/hooks/useRegions";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";
import heroBuilding from "@/assets/dashboard-hero-building.jpg";


interface DbDeal extends RealDealCardData {
  is_demo?: boolean | null;
}

type DashboardData = {
  profileCity: string;
  profileRegion: string;
  areaDeals: DbDeal[];
  joinedDeals: DbDeal[];
  areaSuppliersCount: number;
};

const STAGES: { id: string; title: string; icon: typeof Compass; desc: string }[] = [
  { id: "planning", title: "תכנון ועיצוב", icon: PencilRuler, desc: "אדריכלות, עיצוב פנים, יועצים" },
  { id: "structure", title: "שלד ובנייה", icon: Hammer, desc: "קבלן ראשי, שלד, גבס" },
  { id: "systems", title: "מערכות הבית", icon: Plug, desc: "חשמל, אינסטלציה, מיזוג" },
  { id: "finishes", title: "גמרים", icon: Palette, desc: "ריצוף, צבע, מטבח, נגרות" },
  { id: "outdoor", title: "חוץ ופיתוח", icon: Trees, desc: "גינון, פרגולות, ניקיון" },
];

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const { user, authReady, logout } = useApp();
  const { regions, cities, loading: regionsLoading } = useRegions();

  const [profileCity, setProfileCity] = useState("");
  const [profileRegion, setProfileRegion] = useState("");
  const [areaDeals, setAreaDeals] = useState<DbDeal[]>([]);
  const [joinedDeals, setJoinedDeals] = useState<DbDeal[]>([]);
  const [areaSuppliersCount, setAreaSuppliersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dashboardCacheKey = authReady && user?.id ? `resident-dashboard:${user.id}` : "";
  const cachedDashboard = useMemo(
    () => (dashboardCacheKey ? getCachedValue<DashboardData>(dashboardCacheKey, 5 * 60_000) : null),
    [dashboardCacheKey],
  );

  useEffect(() => {
    if (!authReady) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    // Wait for regions/cities to resolve so we don't double-fetch (causes a visible flash).
    if (regionsLoading) return;
    let cancelled = false;
    if (cachedDashboard) {
      setProfileCity(cachedDashboard.profileCity);
      setProfileRegion(cachedDashboard.profileRegion);
      setAreaDeals(cachedDashboard.areaDeals);
      setJoinedDeals(cachedDashboard.joinedDeals);
      setAreaSuppliersCount(cachedDashboard.areaSuppliersCount);
      setLoading(false);
    } else {
      setLoading(true);
    }
    const safety = window.setTimeout(() => {
      if (!cancelled) {
        setError("טעינת הנתונים נמשכת יותר מדי זמן. נסו לרענן את המסך.");
        setLoading(false);
      }
    }, 12000);
    (async () => {
      try {
        setError(null);
        const uid = user.id;
        const data = await cachedQuery(dashboardCacheKey, async (): Promise<DashboardData> => {

        const { data: prof } = await supabase
          .from("profiles")
          .select("city,region")
          .eq("id", uid)
          .maybeSingle();
        const city = prof?.city ?? "";
        const region = prof?.region ?? "";

        const regionRow = regions.find((r) => r.slug === region);
        const cityRow = cities.find((c) => c.name_he === city);

        const idLists: string[][] = [];
        if (regionRow) {
          const { data } = await supabase
            .from("supplier_regions")
            .select("supplier_id")
            .eq("region_id", regionRow.id);
          idLists.push((data ?? []).map((r) => r.supplier_id));
        }
        if (cityRow) {
          const { data } = await supabase
            .from("supplier_cities")
            .select("supplier_id")
            .eq("city_id", cityRow.id);
          idLists.push((data ?? []).map((r) => r.supplier_id));
        }
        const areaSupplierIds = Array.from(new Set(idLists.flat()));

        const orParts = ["serves_all_country.eq.true"];
        if (areaSupplierIds.length) orParts.push(`id.in.(${areaSupplierIds.join(",")})`);
        const { data: sups } = await supabase
          .from("suppliers")
          .select("id,business_name,logo_url")
          .eq("is_active", true)
          .eq("is_deleted", false)
          .in("approval_status", ["approved", "active"])
          .or(orParts.join(","));
        const supplierMap = new Map((sups ?? []).map((s) => [s.id as string, s]));
        const allowedSupplierIds = (sups ?? []).map((s) => s.id as string);
        let nextAreaDeals: DbDeal[] = [];

        if (allowedSupplierIds.length) {
          const { data: deals } = await supabase
            .from("deals")
            .select(
              "id,title,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,cover_image_url,gallery_images",
            )
            .eq("status", "active")
            .eq("is_deleted", false)
            .in("supplier_id", allowedSupplierIds)
            .order("created_at", { ascending: false })
            .limit(20);
          nextAreaDeals = (deals ?? []).map((d) => {
            const sup = supplierMap.get(d.supplier_id as string);
            return {
              ...(d as unknown as DbDeal),
              supplier_name: sup?.business_name ?? null,
              supplier_logo_url: sup?.logo_url ?? null,
            };
          });
        }

        const { data: interests } = await supabase
          .from("deal_interests")
          .select("deal_id")
          .eq("user_id", uid)
          .eq("is_deleted", false);
        const joinedIds = Array.from(new Set((interests ?? []).map((i) => i.deal_id as string)));
        let nextJoinedDeals: DbDeal[] = [];
        if (joinedIds.length) {
          const { data: jdeals } = await supabase
            .from("deals")
            .select(
              "id,title,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,cover_image_url,gallery_images",
            )
            .in("id", joinedIds);
          const jSupIds = Array.from(new Set((jdeals ?? []).map((d) => d.supplier_id as string)));
          let jSupMap = new Map<string, { business_name: string; logo_url: string | null }>();
          if (jSupIds.length) {
            const { data: jsups } = await supabase
              .from("suppliers")
              .select("id,business_name,logo_url")
              .in("id", jSupIds);
            jSupMap = new Map((jsups ?? []).map((s) => [s.id as string, { business_name: s.business_name as string, logo_url: s.logo_url as string | null }]));
          }
          nextJoinedDeals = (jdeals ?? []).map((d) => {
            const s = jSupMap.get(d.supplier_id as string);
            return {
              ...(d as unknown as DbDeal),
              supplier_name: s?.business_name ?? null,
              supplier_logo_url: s?.logo_url ?? null,
            };
          });
        }
          return { profileCity: city, profileRegion: region, areaDeals: nextAreaDeals, joinedDeals: nextJoinedDeals, areaSuppliersCount: allowedSupplierIds.length };
        }, 5 * 60_000);
        if (!cancelled) {
          setProfileCity(data.profileCity);
          setProfileRegion(data.profileRegion);
          setAreaDeals(data.areaDeals);
          setJoinedDeals(data.joinedDeals);
          setAreaSuppliersCount(data.areaSuppliersCount);
        }
      } catch (e) {
        console.error("[ResidentDashboard] load error", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה בטעינת הדשבורד");
      } finally {
        window.clearTimeout(safety);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [authReady, regions, cities, regionsLoading, user?.id, dashboardCacheKey, cachedDashboard]);

  const hasArea = !!(profileCity || profileRegion);
  const areaLabel = profileCity || regions.find((r) => r.slug === profileRegion)?.name_he || "";
  const noAreaDeals = hasArea && !loading && areaDeals.length === 0;

  return (
    <MobileShell>
      {/* === Architectural luxury hero === */}
      <header className="relative">
        <div className="relative h-[280px] overflow-hidden rounded-b-[28px]">
          <img
            src={heroBuilding}
            alt=""
            width={1280}
            height={768}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#071427]/55 via-[#0A1F3D]/65 to-[#071427]/90" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-l from-[#0A1F3D]/40 via-transparent to-transparent" />

          {/* Top bar — support + logout, both labeled */}
          <div className="relative flex items-center justify-between gap-2 px-5 pt-4">
            <a
              href="https://wa.me/972526247941"
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3 rounded-full bg-white/12 border border-white/25 backdrop-blur flex items-center gap-1.5 text-white hover:bg-white/20 transition-smooth text-[12px] font-semibold"
              aria-label="תמיכה"
            >
              <MessageCircle className="h-[15px] w-[15px]" strokeWidth={2} />
              <span>תמיכה</span>
            </a>
            <button
              onClick={async () => {
                await logout();
                toast.success("התנתקת");
                navigate("/", { replace: true });
              }}
              className="h-9 px-3 rounded-full bg-white/12 border border-white/25 backdrop-blur flex items-center gap-1.5 text-white hover:bg-white/20 transition-smooth text-[12px] font-semibold"
              aria-label="התנתקות"
            >
              <LogOut className="h-[15px] w-[15px]" strokeWidth={2} />
              <span>התנתקות</span>
            </button>
          </div>

          {/* Greeting */}
          <div className="relative px-5 mt-10 text-right">
            <h1 className="text-[26px] sm:text-[28px] font-extrabold text-white leading-[1.15] tracking-tight break-words">
              שלום, {user?.name || "דייר"}
            </h1>
          </div>
        </div>

        {/* Floating navy area card */}
        <div className="px-5 -mt-7 relative z-10">
          <button
            onClick={() => navigate("/resident/profile/edit")}
            className="ios-btn-navy w-full rounded-2xl px-5 py-4 flex items-center justify-between text-right"
          >
            <ChevronLeft className="h-5 w-5 text-white/60 shrink-0" strokeWidth={2} />
            <div>
              <div className="flex items-center gap-1.5 justify-end text-[11px] text-white/60 uppercase tracking-[0.14em] font-semibold">
                <span>האזור שלך</span>
                <MapPin className="h-3 w-3 text-[#C9A961]" strokeWidth={2} />
              </div>
              <div className="text-[17px] font-extrabold text-white mt-0.5 tracking-tight">
                {areaLabel || "הגדר אזור"}
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* Search pill */}
      <div className="px-5 mt-4">
        <button
          onClick={() => navigate("/resident/categories")}
          className="w-full h-12 rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_4px_14px_-6px_rgba(15,30,60,0.10)] flex items-center justify-between px-4 text-[#475569] hover:border-[#C9A961]/40 transition-all"
        >
          <Search className="h-[18px] w-[18px] text-[#475569]" strokeWidth={2} />
          <span className="text-[13px] font-medium">מצא ספקים באזור שלי</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="px-5 mt-4 grid grid-cols-3 gap-3">
        <button
          onClick={() => navigate("/resident/my-offers")}
          className="bg-white rounded-2xl py-4 px-2 border border-[#E2E8F0] shadow-[0_4px_14px_-8px_rgba(15,30,60,0.08)] hover:border-[#C9A961]/40 transition-all text-center"
        >
          <div className="text-[24px] font-extrabold text-[#0A1F3D] leading-none tracking-tight gb-num">{joinedDeals.length}</div>
          <div className="text-[11px] text-[#475569] mt-1.5 font-medium">הצעות שלי</div>
        </button>
        <div className="bg-white rounded-2xl py-4 px-2 border border-[#E2E8F0] shadow-[0_4px_14px_-8px_rgba(15,30,60,0.08)] text-center">
          <div className="text-[24px] font-extrabold text-[#0A1F3D] leading-none tracking-tight gb-num">{areaSuppliersCount}</div>
          <div className="text-[11px] text-[#475569] mt-1.5 font-medium">ספקים</div>
        </div>
        <div className="bg-white rounded-2xl py-4 px-2 border border-[#E2E8F0] shadow-[0_4px_14px_-8px_rgba(15,30,60,0.08)] text-center">
          <div className="text-[24px] font-extrabold text-[#0A1F3D] leading-none tracking-tight gb-num">{areaDeals.length}</div>
          <div className="text-[11px] text-[#475569] mt-1.5 font-medium">הצעות</div>
        </div>
      </div>


      {loading && (
        <div aria-hidden className="px-5 pt-7 pb-8 space-y-7">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 gb-skeleton" />
              <div className="h-3 w-10 gb-skeleton" />
            </div>
            <div className="h-[104px] gb-skeleton" />
          </section>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 gb-skeleton" />
              <div className="h-3 w-10 gb-skeleton" />
            </div>
            <DealCardSkeleton />
            <DealCardSkeleton />
          </section>
          <section className="space-y-3">
            <div className="h-4 w-20 gb-skeleton" />
            <div className="h-[72px] gb-skeleton" />
            <div className="grid grid-cols-2 gap-2.5">
              <div className="h-[132px] gb-skeleton" />
              <div className="h-[132px] gb-skeleton" />
            </div>
          </section>
        </div>
      )}

      {error && (
        <div className="px-5 mt-4">
          <div className="gb-card p-4 border-destructive/30 bg-destructive/10 text-sm text-destructive leading-relaxed">
            {error}
          </div>
        </div>
      )}


      {!loading && !hasArea && (
        <section className="px-5 pt-7">
          <button
            onClick={() => navigate("/resident/profile/edit")}
            className="w-full rounded-2xl p-5 text-right group bg-white/85 backdrop-blur border border-[#C9A961]/45 shadow-[0_4px_14px_-8px_rgba(15,30,60,0.10)] hover:bg-white transition-all"
          >
            <div className="flex items-start gap-3 relative">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#F3E9CC] to-[#FAF4E2] border border-[#C9A961]/40 flex items-center justify-center shrink-0">
                <MapPin className="h-[18px] w-[18px] text-[#B8923F]" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-[#0A1F3D]">הגדירו את האזור שלכם</p>
                <p className="text-[11px] text-[#475569] mt-1 leading-relaxed">
                  כדי שנציג לכם הצעות מותאמות מהספקים שמשרתים את האזור.
                </p>
              </div>
              <ChevronLeft className="h-4 w-4 text-[#B8923F] mt-1 group-hover:-translate-x-1 transition-transform" strokeWidth={2} />
            </div>
          </button>
        </section>
      )}

      {!loading && (
        <section className="px-5 pt-8 pb-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[15px] font-extrabold text-foreground flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-gold" strokeWidth={2} />
              תהליך הבית שלי
            </h2>
            <span className="text-[10px] text-muted-foreground">בחרו שלב להתקדם</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
            עקבו אחרי השלבים — בכל שלב תמצאו הצעות קבוצתיות וספקים בתחום.
          </p>

          <div className="space-y-2.5">
            {STAGES.map((s, idx) => {
              const Icon = s.icon;
              const isCurrent = idx === 0;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/resident/categories?stage=${s.id}`)}
                  className={
                    "w-full h-[68px] rounded-2xl px-4 flex items-center justify-between font-semibold text-[15px] tracking-tight bg-white/85 backdrop-blur border text-[#0A1F3D] hover:bg-white transition-all active:scale-[0.99] shadow-[0_4px_14px_-8px_rgba(15,30,60,0.10)] " +
                    (isCurrent ? "border-[#C9A961]/55 ring-1 ring-[#C9A961]/30" : "border-[#E2E8F0] hover:border-[#C9A961]/45")
                  }
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <span className="flex items-center gap-3 text-right">
                    <span className="relative shrink-0">
                      <span className="h-10 w-10 rounded-xl flex items-center justify-center border bg-gradient-to-br from-[#F3E9CC] to-[#FAF4E2] border-[#C9A961]/40">
                        <Icon className="h-[18px] w-[18px] text-[#B8923F]" strokeWidth={2} />
                      </span>
                      <span className="absolute -bottom-1 -left-1 h-4 w-4 rounded-full bg-[#0A1F3D] border border-[#C9A961]/50 flex items-center justify-center text-[9px] font-bold text-[#C9A961]">
                        {idx + 1}
                      </span>
                    </span>
                    <span className="flex flex-col items-start">
                      <span className="flex items-center gap-2">
                        <span className="text-[14px] font-bold leading-tight">{s.title}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold text-[#B8923F] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-md bg-[#C9A961]/12 border border-[#C9A961]/30">
                            השלב שלך
                          </span>
                        )}
                      </span>
                      <span className="text-[12px] text-[#475569] line-clamp-1 mt-0.5">{s.desc}</span>
                    </span>
                  </span>
                  <ChevronLeft className="h-5 w-5 shrink-0 text-[#94A3B8]" strokeWidth={2} />
                </button>
              );
            })}
          </div>
        </section>
      )}

      <BottomNav role="resident" />
    </MobileShell>
  );
}
