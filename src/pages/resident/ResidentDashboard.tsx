import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, TrendingDown, ArrowLeft, MapPin, ChevronLeft, Pencil, Heart } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { useRegions } from "@/hooks/useRegions";

interface DbDeal extends RealDealCardData {
  is_demo?: boolean | null;
}

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

        // Resolve supplier IDs serving the user's area (regions + cities + national)
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

        // Active deals from those suppliers
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

        // Deals the user joined
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
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-9 pb-14 rounded-b-[24px] relative overflow-hidden">
        <div className="flex items-center justify-between mb-7 relative">
          <div>
            <p className="text-primary-foreground/55 text-[11px] uppercase tracking-wider">שלום</p>
            <h1 className="text-[26px] font-semibold mt-1 tracking-tight">{user?.name || "דייר"}</h1>
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
          className="w-full bg-white/[0.06] backdrop-blur border border-white/10 rounded-2xl p-4 text-right hover:bg-white/[0.10] transition-smooth"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-gold uppercase tracking-wider mb-1.5">
                <MapPin className="h-3 w-3" strokeWidth={1.75} />
                <span>האזור שלך</span>
              </div>
              <div className="font-semibold text-base">
                {areaLabel || "הגדר אזור"}
              </div>
              <div className="text-[11px] text-primary-foreground/55 mt-0.5">
                {hasArea ? "להחלפה — לחץ כאן" : "השלם את הפרופיל לחוויה מותאמת"}
              </div>
            </div>
            <ChevronLeft className="h-5 w-5 text-gold" strokeWidth={1.75} />
          </div>
        </button>
      </header>

      {/* Stats */}
      <div className="px-5 -mt-8 relative z-10 mb-7">
        <div className="gb-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">ההצעות שלך</p>
              <p className="text-[28px] font-semibold text-primary mt-1.5 tracking-tight">{joinedDeals.length}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-muted/60 border border-border flex items-center justify-center">
              <Heart className="h-[18px] w-[18px] text-gold" strokeWidth={1.75} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-base font-semibold text-primary">{areaDeals.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1">הצעות באזור</div>
            </div>
            <div className="text-center border-x border-border">
              <div className="text-base font-semibold text-primary">{areaSuppliersCount}</div>
              <div className="text-[10px] text-muted-foreground mt-1">ספקים זמינים</div>
            </div>
            <div className="text-center">
              <div className="text-base font-semibold gb-gold-text">{joinedDeals.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1">הצטרפת</div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories shortcut */}
      <section className="px-5 mb-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground">קטגוריות</h2>
          <Link to="/resident/categories" className="text-xs gb-gold-text font-medium flex items-center gap-1">
            הכל <ArrowLeft className="h-3 w-3" strokeWidth={1.75} />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
          {categories.slice(0, 8).map((c) => (
            <Link key={c.id} to={`/resident/categories/${c.id}`} className="shrink-0 w-20 flex flex-col items-center gap-2 group">
              <div className="h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center text-xl group-hover:border-gold/50 transition-smooth">
                {c.icon}
              </div>
              <span className="text-[10px] text-center text-foreground leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* My joined offers */}
      {joinedDeals.length > 0 && (
        <section className="px-5 space-y-3 mb-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-gold" strokeWidth={1.75} />
              ההצעות שלך
            </h2>
            <Link to="/resident/my-offers" className="text-xs gb-gold-text font-medium flex items-center gap-1">
              הכל <ArrowLeft className="h-3 w-3" strokeWidth={1.75} />
            </Link>
          </div>
          {joinedDeals.slice(0, 2).map((d) => (
            <RealDealCard key={d.id} deal={d} />
          ))}
        </section>
      )}

      {/* Area deals */}
      <section className="px-5 space-y-3 pb-6">
        <div className="mb-1">
          <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={1.75} />
            הצעות פעילות באזור שלך
          </h2>
          {hasArea ? (
            <p className="text-[11px] text-muted-foreground mt-1">
              באזור: <span className="font-semibold text-foreground">{areaLabel}</span>
              {!loading && <span className="text-muted-foreground"> · {areaDeals.length} הצעות</span>}
            </p>
          ) : (
            <button
              onClick={() => navigate("/resident/profile/edit")}
              className="text-[11px] text-gold mt-1 underline-offset-4 hover:underline flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" /> הגדירו אזור כדי לראות הצעות מותאמות
            </button>
          )}
        </div>

        {loading ? (
          <div className="gb-card p-8 text-center text-sm text-muted-foreground">טוען הצעות…</div>
        ) : noAreaDeals ? (
          <div className="gb-card p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-muted/60 border border-border flex items-center justify-center mx-auto mb-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">כרגע אין הצעות פעילות באזור שלך</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              נעדכן אותך כשיתווספו הצעות חדשות באזור {areaLabel}.
            </p>
            <Link to="/resident/categories" className="inline-block mt-3 text-xs gb-gold-text font-bold">
              עיין בכל הקטגוריות →
            </Link>
          </div>
        ) : areaDeals.length === 0 ? (
          <Link to="/resident/categories" className="block gb-card p-6 text-center hover:border-gold/40 transition-smooth">
            <p className="text-sm font-semibold text-foreground">גלה ספקים והצעות</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">עיין בקטגוריות כדי לראות מה זמין</p>
          </Link>
        ) : (
          areaDeals.slice(0, 4).map((d) => <RealDealCard key={d.id} deal={d} />)
        )}
      </section>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
