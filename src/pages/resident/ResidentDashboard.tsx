import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, TrendingDown, ArrowLeft, MapPin, ChevronLeft, Pencil } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { DealCard } from "@/components/deals/DealCard";
import { formatILS, getActiveTier, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { useRegions } from "@/hooks/useRegions";

interface AreaSupplier {
  id: string;
  business_name: string;
  serves_all_country: boolean;
}

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const { user, projects, deals, categories, deposits } = useApp();
  const { regions, cities } = useRegions();

  const [profileCity, setProfileCity] = useState<string>("");
  const [profileRegion, setProfileRegion] = useState<string>("");
  const [areaSuppliers, setAreaSuppliers] = useState<AreaSupplier[] | null>(null);

  // Load resident's chosen area + suppliers serving it
  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("city,region")
        .eq("id", uid)
        .maybeSingle();
      const city = prof?.city ?? "";
      const region = prof?.region ?? "";
      setProfileCity(city);
      setProfileRegion(region);

      // Find region & city ids
      const regionRow = regions.find((r) => r.slug === region);
      const cityRow = cities.find((c) => c.name_he === city);

      // Always include suppliers serving the entire country
      const orParts: string[] = ["serves_all_country.eq.true"];
      const supplierIdSets: Promise<string[]>[] = [];

      if (regionRow) {
        supplierIdSets.push(
          (async () => {
            const { data } = await supabase
              .from("supplier_regions")
              .select("supplier_id")
              .eq("region_id", regionRow.id);
            return (data ?? []).map((r) => r.supplier_id);
          })()
        );
      }
      if (cityRow) {
        supplierIdSets.push(
          (async () => {
            const { data } = await supabase
              .from("supplier_cities")
              .select("supplier_id")
              .eq("city_id", cityRow.id);
            return (data ?? []).map((r) => r.supplier_id);
          })()
        );
      }
      const idLists = await Promise.all(supplierIdSets);
      const ids = Array.from(new Set(idLists.flat()));
      if (ids.length) orParts.push(`id.in.(${ids.join(",")})`);

      const { data: sups } = await supabase
        .from("suppliers")
        .select("id,business_name,serves_all_country")
        .eq("is_active", true)
        .or(orParts.join(","));
      setAreaSuppliers((sups ?? []) as AreaSupplier[]);
    })();
  }, [regions, cities]);

  const project = projects.find((p) => p.id === user?.projectId) || projects[0] || null;
  const projectDeals = project ? deals.filter((d) => d.projectId === project.id) : [];

  // Filter mock deals by matching their supplier business name to area suppliers
  // (mock deals reference mock suppliers; this is a transitional bridge while
  // suppliers move to DB. If no area is set, show project deals as before.)
  const hasArea = !!(profileCity || profileRegion);
  const filteredAreaDeals = hasArea && areaSuppliers
    ? projectDeals // keep project filter; supplier filtering joins later
    : projectDeals;

  const myDeposits = deposits.filter((d) => d.userId === user?.id);
  const totalSavings = myDeposits.reduce((sum, dep) => {
    const deal = deals.find((d) => d.id === dep.dealId);
    if (!deal) return sum;
    const tier = getActiveTier(deal);
    return sum + (deal.originalPrice - tier.price);
  }, 0);

  const areaLabel = profileCity || regions.find((r) => r.slug === profileRegion)?.name_he || "";
  const noSuppliers = hasArea && areaSuppliers !== null && areaSuppliers.length === 0;

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
                <span>{project ? "הפרויקט שלך" : "האזור שלך"}</span>
              </div>
              <div className="font-semibold text-base">
                {project?.name || areaLabel || "הגדר אזור / פרויקט"}
              </div>
              <div className="text-[11px] text-primary-foreground/55 mt-0.5">
                {project ? `${project.city} · דירה ${user?.apartment || "-"}` : "השלם את הפרופיל לחוויה מותאמת"}
              </div>
            </div>
            <ChevronLeft className="h-5 w-5 text-gold" strokeWidth={1.75} />
          </div>
        </button>
      </header>

      <div className="px-5 -mt-8 relative z-10 mb-7">
        <div className="gb-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">סך החיסכון שלך</p>
              <p className="text-[28px] font-semibold text-primary mt-1.5 tracking-tight">{formatILS(totalSavings)}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-muted/60 border border-border flex items-center justify-center">
              <TrendingDown className="h-[18px] w-[18px] text-gold" strokeWidth={1.75} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-base font-semibold text-primary">{myDeposits.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1">עסקאות פעילות</div>
            </div>
            <div className="text-center border-x border-border">
              <div className="text-base font-semibold text-primary">{projectDeals.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1">בפרויקט שלך</div>
            </div>
            <div className="text-center">
              <div className="text-base font-semibold gb-gold-text">{categories.length}</div>
              <div className="text-[10px] text-muted-foreground mt-1">קטגוריות</div>
            </div>
          </div>
        </div>
      </div>

      <section className="px-5 mb-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground">קטגוריות פופולריות</h2>
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

      <section className="px-5 space-y-3">
        <div className="mb-1">
          <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={1.75} />
            ספקים ועסקאות באזור שלך
          </h2>
          {hasArea ? (
            <p className="text-[11px] text-muted-foreground mt-1">
              מציגים ספקים שמגיעים ל: <span className="font-semibold text-foreground">{areaLabel}</span>
              {areaSuppliers && (
                <span className="text-muted-foreground"> · {areaSuppliers.length} ספקים פעילים</span>
              )}
            </p>
          ) : (
            <button
              onClick={() => navigate("/resident/profile/edit")}
              className="text-[11px] text-gold mt-1 underline-offset-4 hover:underline flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" /> הגדירו עיר ואזור כדי לסנן ספקים רלוונטיים
            </button>
          )}
        </div>

        {noSuppliers ? (
          <div className="gb-card p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-muted/60 border border-border flex items-center justify-center mx-auto mb-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">כרגע אין ספקים פעילים באזור שלך</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              נשמח לעדכן אותך כשיצטרפו ספקים חדשים לאזור {areaLabel}.
            </p>
          </div>
        ) : (
          filteredAreaDeals.slice(0, 4).map((d) => <DealCard key={d.id} deal={d} />)
        )}
      </section>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
