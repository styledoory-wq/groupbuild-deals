import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, MapPin, ChevronLeft, Heart, TrendingUp } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { useRegions } from "@/hooks/useRegions";

interface DbDeal extends RealDealCardData {
  is_demo?: boolean | null;
}

// Construction-flow stage groups (matches order in mockData.ts)
const STAGE_GROUPS: { title: string; ids: string[] }[] = [
  { title: "תכנון ועיצוב", ids: ["architect", "interior-designer", "consultant"] },
  { title: "שלד ובנייה", ids: ["contractor", "skeleton", "gypsum"] },
  { title: "מערכות הבית", ids: ["electric", "plumbing", "ac", "smart-home"] },
  { title: "פתחים ובידוד", ids: ["windows", "doors", "security-door"] },
  { title: "ריצוף וחיפויים", ids: ["flooring", "cladding", "painting"] },
  { title: "מטבח ואמבט", ids: ["kitchen", "bath", "showers", "sanitary"] },
  { title: "נגרות וגימורים", ids: ["carpentry", "closets", "lighting"] },
  { title: "חוץ ופיתוח", ids: ["garden", "pergola", "cleaning"] },
];

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const { user, categories } = useApp();
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
            .order("created_at", { ascending: false });
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

  // Group categories by construction stages, preserving any extras at the end
  const stageSections = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const used = new Set<string>();
    const sections = STAGE_GROUPS.map((g) => ({
      title: g.title,
      items: g.ids
        .map((id) => {
          const c = byId.get(id);
          if (c) used.add(id);
          return c;
        })
        .filter((c): c is NonNullable<typeof c> => !!c),
    })).filter((s) => s.items.length > 0);
    const extras = categories.filter((c) => !used.has(c.id));
    if (extras.length) sections.push({ title: "נוספים", items: extras });
    return sections;
  }, [categories]);

  return (
    <MobileShell>
      {/* Hero */}
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-8 pb-12 rounded-b-[28px] relative overflow-hidden">
        <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
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

      {/* My joined offers */}
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

      {/* Recommended deals in your area */}
      <section className="px-5 space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={2} />
            מומלץ באזור שלך
          </h2>
          {hasArea && areaLabel && (
            <span className="text-[11px] text-muted-foreground">{areaLabel}</span>
          )}
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
          <>
            {areaDeals.slice(0, 3).map((d) => (
              <RealDealCard key={d.id} deal={d} />
            ))}
            {areaDeals.length > 3 && (
              <Link
                to="/resident/deals"
                className="block text-center text-[12px] gb-gold-text font-semibold py-2"
              >
                לכל ההצעות באזור ({areaDeals.length}) →
              </Link>
            )}
          </>
        )}
      </section>

      {/* Categories by construction stage */}
      <section className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-gold" strokeWidth={2} />
            תחומים לפי שלבי בנייה
          </h2>
          <Link to="/resident/categories" className="text-[11px] gb-gold-text font-semibold flex items-center gap-1">
            הכל <ArrowLeft className="h-3 w-3" strokeWidth={2} />
          </Link>
        </div>

        <div className="space-y-4">
          {stageSections.map((section, idx) => (
            <div key={section.title} className="gb-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {idx + 1}
                </div>
                <h3 className="text-[12px] font-semibold text-foreground tracking-tight">
                  {section.title}
                </h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground">{section.items.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {section.items.map((c) => (
                  <Link
                    key={c.id}
                    to={`/resident/categories/${c.id}`}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-border bg-background hover:border-gold/50 hover:bg-gold/5 transition-smooth"
                  >
                    <span className="text-[20px] leading-none">{c.icon}</span>
                    <span className="text-[10px] text-center text-foreground leading-tight line-clamp-2">
                      {c.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
