import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, MapPin, ChevronLeft, Heart, Search } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { useRegions } from "@/hooks/useRegions";

interface DbDeal extends RealDealCardData {
  is_demo?: boolean | null;
}

// Top-level construction stages — clicking opens the stage's categories
const STAGES: { id: string; title: string; icon: string; desc: string }[] = [
  { id: "planning", title: "תכנון ועיצוב", icon: "📐", desc: "אדריכלות, עיצוב פנים, יועצים" },
  { id: "structure", title: "שלד ובנייה", icon: "🏗️", desc: "קבלן ראשי, שלד, גבס" },
  { id: "systems", title: "מערכות הבית", icon: "⚡", desc: "חשמל, אינסטלציה, מיזוג, חכם" },
  { id: "finishes", title: "גמרים", icon: "🎨", desc: "ריצוף, צבע, מטבח, אמבט, נגרות" },
  { id: "outdoor", title: "חוץ ופיתוח", icon: "🌿", desc: "גינון, פרגולות, ניקיון לאחר בנייה" },
];

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { regions, cities } = useRegions();

  const [profileCity, setProfileCity] = useState("");
  const [profileRegion, setProfileRegion] = useState("");
  const [areaDeals, setAreaDeals] = useState<DbDeal[]>([]);
  const [joinedDeals, setJoinedDeals] = useState<DbDeal[]>([]);
  const [areaSuppliersCount, setAreaSuppliersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const uid = session.session?.user?.id;
        if (!uid) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: prof } = await supabase
          .from("profiles")
          .select("city,region")
          .eq("id", uid)
          .maybeSingle();
        const city = prof?.city ?? "";
        const region = prof?.region ?? "";
        if (!cancelled) {
          setProfileCity(city);
          setProfileRegion(region);
        }

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
        if (!cancelled) setAreaSuppliersCount(allowedSupplierIds.length);

        if (allowedSupplierIds.length) {
          const { data: deals } = await supabase
            .from("deals")
            .select(
              "id,title,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at",
            )
            .eq("status", "active")
            .eq("is_deleted", false)
            .in("supplier_id", allowedSupplierIds)
            .order("created_at", { ascending: false })
            .limit(20);
          const list = (deals ?? []).map((d) => {
            const sup = supplierMap.get(d.supplier_id as string);
            return {
              ...(d as unknown as DbDeal),
              supplier_name: sup?.business_name ?? null,
              supplier_logo_url: sup?.logo_url ?? null,
            };
          });
          if (!cancelled) setAreaDeals(list);
        } else if (!cancelled) {
          setAreaDeals([]);
        }

        const { data: interests } = await supabase
          .from("deal_interests")
          .select("deal_id")
          .eq("user_id", uid)
          .eq("is_deleted", false);
        const joinedIds = Array.from(new Set((interests ?? []).map((i) => i.deal_id as string)));
        if (joinedIds.length) {
          const { data: jdeals } = await supabase
            .from("deals")
            .select(
              "id,title,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at",
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
          const jlist = (jdeals ?? []).map((d) => {
            const s = jSupMap.get(d.supplier_id as string);
            return {
              ...(d as unknown as DbDeal),
              supplier_name: s?.business_name ?? null,
              supplier_logo_url: s?.logo_url ?? null,
            };
          });
          if (!cancelled) setJoinedDeals(jlist);
        } else if (!cancelled) {
          setJoinedDeals([]);
        }
      } catch (e) {
        console.error("[ResidentDashboard] load error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [regions, cities]);

  const hasArea = !!(profileCity || profileRegion);
  const areaLabel = profileCity || regions.find((r) => r.slug === profileRegion)?.name_he || "";
  const noAreaDeals = hasArea && !loading && areaDeals.length === 0;

  return (
    <MobileShell>
      {/* Hero */}
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-8 pb-14 rounded-b-[28px] relative overflow-hidden">
        <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-gold/5 blur-3xl" />
        <div className="flex items-center justify-between mb-6 relative">
          <div>
            <p className="text-primary-foreground/55 text-[11px] uppercase tracking-wider">שלום</p>
            <h1 className="text-[24px] font-semibold mt-0.5 tracking-tight">{user?.name || "דייר"}</h1>
          </div>
          <button
            onClick={() => navigate("/resident/profile")}
            className="h-11 w-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-primary-foreground font-semibold transition-smooth hover:bg-white/15"
            aria-label="פרופיל"
          >
            {user?.name?.charAt(0) || "ד"}
          </button>
        </div>

        {/* Area chip + Primary CTA */}
        <div className="relative space-y-3">
          <button
            onClick={() => navigate("/resident/profile/edit")}
            className="w-full bg-white/[0.06] backdrop-blur border border-white/10 rounded-2xl px-4 py-3 text-right hover:bg-white/[0.10] transition-smooth flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-gold uppercase tracking-wider mb-0.5">
                <MapPin className="h-3 w-3" strokeWidth={1.75} />
                <span>האזור שלך</span>
              </div>
              <div className="font-semibold text-[15px]">{areaLabel || "הגדר אזור"}</div>
            </div>
            <ChevronLeft className="h-4 w-4 text-gold" strokeWidth={1.75} />
          </button>

          <button
            onClick={() => navigate("/resident/categories")}
            className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" />
            מצא ספקים באזור שלי
          </button>
        </div>
      </header>

      {/* Status card */}
      <div className="px-5 -mt-7 relative z-10 mb-5">
        <div className="gb-card overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-l from-card via-card to-gold/5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">הסטטוס שלך</p>
                <p className="text-[13px] font-semibold text-primary mt-0.5">
                  {joinedDeals.length > 0
                    ? `הצטרפת ל-${joinedDeals.length} ${joinedDeals.length === 1 ? "הצעה" : "הצעות"}`
                    : "עדיין לא הצטרפת להצעות"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
                <Heart className="h-[18px] w-[18px] text-gold" strokeWidth={2} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border">
            <div className="px-3 py-3 text-center">
              <div className="text-[20px] font-semibold text-primary leading-none">{areaDeals.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5">הצעות באזור</div>
            </div>
            <div className="px-3 py-3 text-center">
              <div className="text-[20px] font-semibold text-primary leading-none">{areaSuppliersCount}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5">ספקים זמינים</div>
            </div>
            <div className="px-3 py-3 text-center">
              <div className="text-[20px] font-semibold gb-gold-text leading-none">{joinedDeals.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5">הצטרפת</div>
            </div>
          </div>
        </div>
      </div>

      {/* My joined offers (top 2) */}
      {joinedDeals.length > 0 && (
        <section className="px-5 space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-gold" strokeWidth={2} />
              ההצעות שלך
            </h2>
            <Link to="/resident/my-offers" className="text-[11px] gb-gold-text font-semibold flex items-center gap-1">
              הכל <ArrowLeft className="h-3 w-3" strokeWidth={2} />
            </Link>
          </div>
          {joinedDeals.slice(0, 2).map((d) => (
            <RealDealCard key={d.id} deal={d} />
          ))}
        </section>
      )}

      {/* Recommended deals (max 3) */}
      <section className="px-5 space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={2} />
            הצעות מומלצות
          </h2>
          <Link to="/resident/deals" className="text-[11px] gb-gold-text font-semibold flex items-center gap-1">
            ראה הכל <ArrowLeft className="h-3 w-3" strokeWidth={2} />
          </Link>
        </div>

        {loading ? (
          <div className="gb-card p-6 text-center text-[13px] text-muted-foreground">טוען הצעות…</div>
        ) : !hasArea ? (
          <button
            onClick={() => navigate("/resident/profile/edit")}
            className="w-full gb-card p-5 text-right hover:border-gold/40 transition-smooth"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-gold" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-foreground">הגדירו את האזור שלכם</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  כדי שנציג לכם הצעות מותאמות מהספקים שמשרתים את האזור.
                </p>
              </div>
              <ChevronLeft className="h-4 w-4 text-gold mt-1" />
            </div>
          </button>
        ) : noAreaDeals ? (
          <div className="gb-card p-5 text-center">
            <p className="text-[13px] font-semibold text-foreground">אין כרגע הצעות פעילות באזור שלך</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              נעדכן אותך כשיתווספו הצעות חדשות באזור {areaLabel}.
            </p>
            <Link to="/resident/categories" className="inline-block mt-3 text-[11px] gb-gold-text font-semibold">
              עיין בקטגוריות →
            </Link>
          </div>
        ) : (
          areaDeals.slice(0, 3).map((d) => <RealDealCard key={d.id} deal={d} />)
        )}
      </section>

      {/* Construction stages — top-level only */}
      <section className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-foreground">שלבי בנייה</h2>
          <span className="text-[11px] text-muted-foreground">בחרו שלב לראות תחומים</span>
        </div>

        <div className="space-y-2.5">
          {STAGES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => navigate(`/resident/categories?stage=${s.id}`)}
              className="w-full gb-card p-4 text-right flex items-center gap-3 hover:border-gold/40 hover:shadow-elevated transition-smooth group"
            >
              <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center text-2xl shadow-soft border border-gold/20 shrink-0">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold gb-gold-text">שלב {idx + 1}</span>
                </div>
                <h3 className="text-[14px] font-bold text-foreground leading-tight">{s.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.desc}</p>
              </div>
              <ChevronLeft className="h-4 w-4 text-gold opacity-50 group-hover:opacity-100 transition-smooth shrink-0" />
            </button>
          ))}
        </div>
      </section>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
