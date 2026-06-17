import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, MapPin, Sparkles, Star, UserPlus, Wrench, Package } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { useApp } from "@/store/AppStore";
import { useRegions } from "@/hooks/useRegions";
import { supabase } from "@/integrations/supabase/client";

interface DbSupplier {
  id: string;
  business_name: string;
  short_description: string | null;
  description: string | null;
  logo_url: string | null;
  categories: string[];
  service_areas: string[];
  serves_all_country: boolean;
  is_active: boolean;
  approval_status: string;
  supplier_kind: "service" | "product" | null;
  offers_services: boolean | null;
  offers_products: boolean | null;
}

const NATIONAL_AREA = "כל הארץ";

export default function CategorySuppliers() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { categories } = useApp();
  const { regions, cities } = useRegions();

  const [activeCategoryId, setActiveCategoryId] = useState<string>(categoryId ?? "all");

  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [regionId, setRegionId] = useState<string>("all");
  const [cityId, setCityId] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<"all" | "service" | "product">("all");
  // search removed per UX request
  const [supplierRegionIds, setSupplierRegionIds] = useState<Record<string, string[]>>({});
  const [supplierCityIds, setSupplierCityIds] = useState<Record<string, string[]>>({});
  const [supplierCouncilIds, setSupplierCouncilIds] = useState<Record<string, string[]>>({});

  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  useEffect(() => {
    setActiveCategoryId(categoryId ?? "all");
  }, [categoryId]);

  // Initialize filter from resident profile
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
      if (prof?.region) {
        const r = regions.find((x) => x.slug === prof.region);
        if (r) setRegionId(r.id);
      }
      if (prof?.city) {
        const c = cities.find((x) => x.name_he === prof.city);
        if (c) setCityId(c.id);
      }
    })();
  }, [regions, cities]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);

      // Hard safety timeout — never get stuck on the spinner
      const safety = window.setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, 8000);

      try {
        // Primary query — must succeed for the screen to be useful
        const suppliersResult = await supabase
          .from("suppliers")
          .select(
            "id,business_name,short_description,description,logo_url,categories,service_areas,serves_all_country,is_active,approval_status,supplier_kind,offers_services,offers_products",
          )
          .eq("is_active", true)
          .in("approval_status", ["approved", "active"])
          .order("business_name");

        if (cancelled) return;
        if (suppliersResult.error) throw suppliersResult.error;

        const list = ((suppliersResult.data ?? []) as DbSupplier[]).map((s) => ({
          ...s,
          categories: s.categories ?? [],
          service_areas: s.service_areas ?? [],
        }));
        setSuppliers(list);
        setLoading(false); // Show suppliers immediately

        // Secondary queries — non-blocking, used for richer area filtering
        const [regionsResult, citiesResult, councilsResult] = await Promise.all([
          supabase.from("supplier_regions").select("supplier_id,region_id"),
          supabase.from("supplier_cities").select("supplier_id,city_id"),
          supabase.from("supplier_councils").select("supplier_id,council_id"),
        ]);
        if (cancelled) return;

        const regionMap: Record<string, string[]> = {};
        (regionsResult.data ?? []).forEach((row: { supplier_id: string; region_id: string }) => {
          regionMap[row.supplier_id] = [...(regionMap[row.supplier_id] ?? []), row.region_id];
        });
        const cityMap: Record<string, string[]> = {};
        (citiesResult.data ?? []).forEach((row: { supplier_id: string; city_id: string }) => {
          cityMap[row.supplier_id] = [...(cityMap[row.supplier_id] ?? []), row.city_id];
        });
        const councilMap: Record<string, string[]> = {};
        (councilsResult.data ?? []).forEach((row: { supplier_id: string; council_id: string }) => {
          councilMap[row.supplier_id] = [...(councilMap[row.supplier_id] ?? []), row.council_id];
        });
        setSupplierRegionIds(regionMap);
        setSupplierCityIds(cityMap);
        setSupplierCouncilIds(councilMap);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "שגיאה בטעינה");
        setSuppliers([]);
      } finally {
        window.clearTimeout(safety);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCities = useMemo(
    () => (regionId === "all" ? cities : cities.filter((c) => c.region_id === regionId)),
    [cities, regionId],
  );

  const isNationalSupplier = (s: DbSupplier) => {
    const regionCount = supplierRegionIds[s.id]?.length ?? 0;
    const cityCount = supplierCityIds[s.id]?.length ?? 0;
    const councilCount = supplierCouncilIds[s.id]?.length ?? 0;
    return s.serves_all_country || s.service_areas.includes(NATIONAL_AREA) || (regionCount === 0 && cityCount === 0 && councilCount === 0 && s.service_areas.length === 0);
  };

  // Strict hierarchy match: city → council → exact region → nationwide.
  // No fuzzy "north matches any north" heuristic — Haifa ≠ Upper Galilee.
  const matchesArea = (s: DbSupplier) => {
    if (regionId === "all" && cityId === "all") return true;
    if (isNationalSupplier(s)) return true;

    const selectedRegion = regions.find((r) => r.id === regionId) ?? null;
    const selectedCity = cities.find((c) => c.id === cityId) ?? null;
    const selectedCityRegion = selectedCity ? regions.find((r) => r.id === selectedCity.region_id) ?? null : null;
    const selectedCityCouncilId = selectedCity?.council_id ?? null;
    const serviceAreas = new Set(s.service_areas ?? []);
    const sRegionIds = supplierRegionIds[s.id] ?? [];
    const sCityIds = supplierCityIds[s.id] ?? [];
    const sCouncilIds = supplierCouncilIds[s.id] ?? [];

    if (cityId !== "all" && selectedCity) {
      if (sCityIds.includes(selectedCity.id) || serviceAreas.has(selectedCity.name_he)) return true;
      if (selectedCityCouncilId && sCouncilIds.includes(selectedCityCouncilId)) return true;
      if (sRegionIds.includes(selectedCity.region_id) || (selectedCityRegion && serviceAreas.has(selectedCityRegion.name_he))) return true;
      return false;
    }

    if (regionId !== "all" && selectedRegion) {
      if (sRegionIds.includes(selectedRegion.id) || serviceAreas.has(selectedRegion.name_he)) return true;
    }

    return false;
  };


  const filteredSuppliers = useMemo(() => {
    const byCategory = activeCategoryId === "all"
      ? suppliers
      : suppliers.filter((s) => (s.categories ?? []).includes(activeCategoryId));

    const supplierOffers = (s: DbSupplier) => ({
      service: Boolean(s.offers_services) || s.supplier_kind === "service",
      product: Boolean(s.offers_products) || s.supplier_kind === "product",
    });
    const byKind = kindFilter === "all"
      ? byCategory
      : byCategory.filter((s) => supplierOffers(s)[kindFilter]);

    const byArea = byKind.filter(matchesArea);
    if (byArea.length > 0 || (regionId === "all" && cityId === "all")) return byArea;
    return byKind.filter(isNationalSupplier);
  }, [suppliers, activeCategoryId, regionId, cityId, kindFilter, supplierRegionIds, supplierCityIds, supplierCouncilIds, regions, cities]);

  const areaLabel =
    cityId !== "all"
      ? cities.find((c) => c.id === cityId)?.name_he
      : regionId !== "all"
        ? regions.find((r) => r.id === regionId)?.name_he
        : "כל הארץ";

  return (
    <MobileShell>
      {/* Luxury hero */}
      <header className="bg-white text-[#1F2937] px-6 pt-9 pb-16 rounded-b-[28px] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

        <button
          onClick={() => navigate(-1)}
          className="relative inline-flex items-center gap-1 text-fs-xs text-[#6B7280] hover:text-gold transition-smooth mb-5"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה לתחומים
        </button>

        <div className="relative animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F4F6FA] border border-[#ECEEF2] mb-4">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-fs-xs font-medium text-[#1F2937]/85">
              {filteredSuppliers.length} ספקים זמינים · {areaLabel}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            {activeCategory?.icon && (
              <div className="h-12 w-12 rounded-2xl bg-[#F4F6FA] border border-gold/20 flex items-center justify-center text-2xl shadow-soft">
                {activeCategory.icon}
              </div>
            )}
            <div>
              <h1 className="text-fs-xl leading-[1.15] font-extrabold">
                <span className="gb-gold-text">{activeCategory?.name ?? "ספקים"}</span>
              </h1>
              <p className="text-[#1F2937]/65 text-fs-xs mt-0.5">ספקים מובילים בתחום</p>
            </div>
          </div>
          <div className="gb-divider-gold" />
        </div>
      </header>

      <div className="px-5 -mt-10 relative z-10 space-y-3 pb-6">
        {/* Marketplace controls */}
        <div className="gb-card p-4 animate-fade-up space-y-3">
          {/* Kind filter */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-fs-xs uppercase tracking-wider font-bold text-muted-foreground">סוג ספק</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { v: "all", label: "הכול", Icon: Sparkles },
                { v: "service", label: "בעלי מקצוע", Icon: Wrench },
                { v: "product", label: "ספקי מוצרים", Icon: Package },
              ].map(({ v, label, Icon }) => {
                const active = kindFilter === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setKindFilter(v as typeof kindFilter)}
                    className={
                      "h-10 rounded-xl text-fs-xs font-bold inline-flex items-center justify-center gap-1.5 border transition-all " +
                      (active
                        ? "bg-gradient-to-br from-gold/20 to-gold/5 text-primary border-gold shadow-[0_0_0_2px_hsl(var(--gold)/0.15)]"
                        : "bg-card text-muted-foreground border-border hover:border-gold/40")
                    }
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <MapPin className="h-3.5 w-3.5 text-gold" />
            <span className="text-fs-xs uppercase tracking-wider font-bold text-muted-foreground">
              סינון לפי אזור
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
                setCityId("all");
              }}
              className="h-11 rounded-xl bg-card border border-border px-3 text-sm text-foreground focus:border-gold focus:outline-none transition-smooth"
            >
              <option value="all">כל האזורים</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name_he}</option>
              ))}
            </select>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="h-11 rounded-xl bg-card border border-border px-3 text-sm text-foreground focus:border-gold focus:outline-none transition-smooth disabled:opacity-50"
              disabled={regionId === "all" && filteredCities.length === 0}
            >
              <option value="all">כל הערים</option>
              {filteredCities.map((c) => (
                <option key={c.id} value={c.id}>{c.name_he}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
        {loading ? (
          <div className="gb-card p-10 text-center">
            <div className="h-8 w-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">טוען ספקים...</p>
          </div>
        ) : loadError ? (
          <div className="gb-card p-8 text-center">
            <p className="text-sm font-bold text-foreground">שגיאה בטעינה</p>
            <p className="text-fs-xs text-muted-foreground mt-1.5">נסו לרענן את המסך בעוד רגע.</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="gb-card p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="h-6 w-6 text-gold" />
            </div>
            <p className="text-sm font-bold text-foreground">לא נמצאו ספקים</p>
            <p className="text-fs-xs text-muted-foreground mt-1.5 leading-relaxed max-w-[240px] mx-auto">
              שנה אזור או הזמן ספקים להצטרף כדי לפתוח עוד אפשרויות לדיירים.
            </p>
            <button
              type="button"
              onClick={() => { setRegionId("all"); setCityId("all"); }}
              className="mt-4 h-10 px-4 rounded-xl bg-[#1F2937] text-white text-xs font-bold shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)]"
            >
              שנה אזור
            </button>
          </div>
        ) : (
          filteredSuppliers.map((s, idx) => (
            <Link
              key={s.id}
              to={`/suppliers/${s.id}`}
              className="gb-card p-4 flex items-center gap-3 hover:shadow-elevated hover:-translate-y-0.5 transition-smooth group relative overflow-hidden animate-fade-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="absolute -top-10 -left-10 h-20 w-20 rounded-full bg-gold/8 blur-2xl group-hover:bg-gold/15 transition-smooth pointer-events-none" />
              <SupplierLogo name={s.business_name} logoUrl={s.logo_url} size="lg" />
              <div className="flex-1 min-w-0 relative">
                <h3 className="font-bold text-foreground text-fs-base truncate">{s.business_name}</h3>
                {s.short_description && (
                  <p className="text-fs-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {s.short_description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <SupplierRatingBadge supplierId={s.id} showEmpty={false} />
                  {(() => {
                    const isSvc = Boolean(s.offers_services) || s.supplier_kind === "service";
                    const isProd = Boolean(s.offers_products) || s.supplier_kind === "product";
                    if (isSvc && isProd) return (
                      <span className="text-fs-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500/15 to-emerald-500/15 text-primary border border-gold/30 inline-flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5 text-gold" /> שירות + מוצרים
                      </span>
                    );
                    if (isSvc) return (
                      <span className="text-fs-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/30 inline-flex items-center gap-1">
                        <Wrench className="h-2.5 w-2.5" /> בעל מקצוע
                      </span>
                    );
                    if (isProd) return (
                      <span className="text-fs-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 inline-flex items-center gap-1">
                        <Package className="h-2.5 w-2.5" /> ספק מוצרים
                      </span>
                    );
                    return null;
                  })()}
                  {s.serves_all_country && (
                    <span className="text-fs-xs font-bold px-2 py-0.5 rounded-full bg-gold/15 text-primary border border-gold/20">
                      ארצי
                    </span>
                  )}
                  <span className="text-fs-xs font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 text-gold" /> מאומת
                  </span>
                </div>
              </div>
              <ChevronLeft className="h-5 w-5 text-gold shrink-0 group-hover:-translate-x-0.5 transition-smooth" strokeWidth={2} />
            </Link>
          ))
        )}
        </div>
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
