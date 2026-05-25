import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, MapPin, ChevronLeft, Heart, Search, LogOut, Compass, Hammer, Plug, Palette, Trees, PencilRuler, Tag } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import { DealCardSkeleton } from "@/components/deals/DealCardSkeleton";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRegions } from "@/hooks/useRegions";
import { cachedQuery, getCachedValue } from "@/lib/clientCache";

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
      {/* Cinematic hero */}
      <header className="gb-aurora text-primary-foreground px-5 pt-6 pb-12 rounded-b-[32px] relative overflow-hidden">
        <span aria-hidden className="gb-particle gb-particle-1 h-1 w-1 top-20 left-12" />
        <span aria-hidden className="gb-particle gb-particle-2 h-1.5 w-1.5 top-32 right-16" />
        <span aria-hidden className="gb-particle gb-particle-3 h-1 w-1 top-12 right-1/3" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(70% 60% at 50% 0%, #000 0%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(70% 60% at 50% 0%, #000 0%, transparent 75%)",
          }}
        />

        <div className="flex items-center justify-between mb-5 relative">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="gb-live-dot" />
              <p className="text-primary-foreground/60 text-[10px] uppercase tracking-[0.18em] font-medium">פלטפורמה פעילה</p>
            </div>
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight truncate">
              שלום, <span className="gb-text-gold">{user?.name?.split(" ")[0] || "דייר"}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await logout();
                toast.success("התנתקת");
                navigate("/", { replace: true });
              }}
              className="h-10 w-10 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center transition-smooth hover:bg-white/15 backdrop-blur"
              aria-label="התנתקות"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => navigate("/resident/profile")}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/40 flex items-center justify-center font-bold text-sm transition-smooth hover:from-gold/40 backdrop-blur"
              aria-label="פרופיל"
            >
              {user?.name?.charAt(0) || "ד"}
            </button>
          </div>
        </div>

        <div className="relative space-y-3">
          <button
            onClick={() => navigate("/resident/profile/edit")}
            className="w-full bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-right hover:bg-white/[0.10] transition-smooth flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-1.5 text-[10px] gb-text-gold uppercase tracking-[0.15em] mb-0.5 font-bold">
                <MapPin className="h-3 w-3" strokeWidth={2} />
                <span>האזור שלך</span>
              </div>
              <div className="font-semibold text-[15px]">{areaLabel || "הגדר אזור"}</div>
            </div>
            <ChevronLeft className="h-4 w-4 text-gold" strokeWidth={2} />
          </button>

          <button
            onClick={() => navigate("/resident/categories")}
            className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold gb-pulse-glow flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
          >
            <Search className="h-4 w-4" strokeWidth={2.5} />
            מצא ספקים באזור שלי
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-6 relative">
          <div className="gb-stat-pill">
            <div className="text-[22px] font-extrabold leading-none tracking-tight">{areaDeals.length}</div>
            <div className="text-[10px] text-primary-foreground/65 mt-1 uppercase tracking-wider">הצעות</div>
          </div>
          <div className="gb-stat-pill">
            <div className="text-[22px] font-extrabold leading-none tracking-tight">{areaSuppliersCount}</div>
            <div className="text-[10px] text-primary-foreground/65 mt-1 uppercase tracking-wider">ספקים</div>
          </div>
          <div className="gb-stat-pill">
            <div className="text-[22px] font-extrabold leading-none tracking-tight gb-text-gold">{joinedDeals.length}</div>
            <div className="text-[10px] text-primary-foreground/65 mt-1 uppercase tracking-wider">הצטרפת</div>
          </div>
        </div>
      </header>

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

      {!loading && joinedDeals.length > 0 && (
        <section className="mt-9 mb-8">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-[13px] font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Heart className="h-3.5 w-3.5 text-gold fill-gold" strokeWidth={2} />
              ההצעות שלך
            </h2>
            <Link to="/resident/my-offers" className="text-[11px] gb-gold-text font-bold flex items-center gap-1 hover:gap-1.5 transition-all">
              הכל <ArrowLeft className="h-3 w-3" strokeWidth={2.5} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 snap-x snap-mandatory no-scrollbar">
            {joinedDeals.slice(0, 5).map((d) => (
              <div key={d.id} className="snap-start shrink-0 w-[78%]">
                <RealDealCard deal={d} />
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && <section className="px-5 space-y-3 mt-9 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={2} />
            הצעות מומלצות
          </h2>
          <Link to="/resident/deals" className="text-[11px] gb-gold-text font-bold flex items-center gap-1 hover:gap-1.5 transition-all">
            הכל <ArrowLeft className="h-3 w-3" strokeWidth={2.5} />
          </Link>
        </div>

        {!hasArea ? (
          <button
            onClick={() => navigate("/resident/profile/edit")}
            className="w-full gb-tile-dark p-5 text-right group"
          >
            <div className="flex items-start gap-3 relative">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/40 flex items-center justify-center shrink-0 shadow-[0_0_16px_hsl(44_53%_54%_/_0.3)]">
                <MapPin className="h-[18px] w-[18px] text-gold" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold">הגדירו את האזור שלכם</p>
                <p className="text-[11px] text-primary-foreground/65 mt-1 leading-relaxed">
                  כדי שנציג לכם הצעות מותאמות מהספקים שמשרתים את האזור.
                </p>
              </div>
              <ChevronLeft className="h-4 w-4 text-gold mt-1 group-hover:-translate-x-1 transition-transform" strokeWidth={2} />
            </div>
          </button>
        ) : noAreaDeals ? (
          <div className="gb-card p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-gold/15 to-gold/5 border border-gold/25 flex items-center justify-center mb-3">
              <Tag className="h-5 w-5 text-gold" strokeWidth={2} />
            </div>
            <p className="text-[13px] font-bold text-foreground">אין כרגע הצעות פעילות באזור שלך</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              נעדכן אותך כשיתווספו הצעות חדשות באזור {areaLabel}.
            </p>
            <Link to="/resident/categories" className="inline-block mt-3 text-[11px] gb-gold-text font-bold">
              עיין בקטגוריות →
            </Link>
          </div>
        ) : (
          areaDeals
            .filter((d) => !joinedDeals.some((jd) => jd.id === d.id))
            .slice(0, 2)
            .map((d) => <RealDealCard key={d.id} deal={d} />)
        )}
      </section>}

      {!loading && <section className="px-5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-gold" strokeWidth={2} />
            שלבי בנייה
          </h2>
          <span className="text-[10px] text-muted-foreground">בחרו שלב</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {STAGES.map((s, idx) => {
            const Icon = s.icon;
            const featured = idx === 0;
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/resident/categories?stage=${s.id}`)}
                className={
                  "gb-tile-dark p-3.5 text-right group relative " +
                  (featured ? "col-span-2 flex items-center gap-3" : "flex flex-col items-start gap-2.5")
                }
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="absolute top-2.5 left-2.5 text-[9px] font-bold gb-text-gold tracking-[0.18em] opacity-70">
                  0{idx + 1}
                </div>
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-gold/25 to-gold/5 border border-gold/30 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.15)]">
                  <Icon className="h-[18px] w-[18px] text-gold" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <h3 className="text-[13px] font-bold leading-tight">{s.title}</h3>
                  <p className="text-[10px] text-primary-foreground/55 mt-1 line-clamp-1">{s.desc}</p>
                </div>
                {featured && (
                  <ChevronLeft className="h-4 w-4 text-gold opacity-60 group-hover:opacity-100 group-hover:-translate-x-1 transition-all shrink-0" strokeWidth={2} />
                )}
              </button>
            );
          })}
        </div>
      </section>}

      <BottomNav role="resident" />
    </MobileShell>
  );
}
