import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronDown, MapPin, ShieldCheck, Sparkles, Star, UserPlus, Wrench, Package, SlidersHorizontal } from "lucide-react";
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

type SupplierCategoryRow = { supplier_id: string; category_id: string };

const CATEGORY_ID_ALIASES: Record<string, string> = {
  architect: "sc-arch",
  "interior-designer": "sc-interior",
  consultant: "sc-consultants",
  "construction-supervisor": "sc-supervision",
  contractor: "sc-contractors",
  "turnkey-contractor": "s-cont-turnkey",
  skeleton: "sc-skeleton",
  cladding: "sc-cladding",
  windows: "sc-windows",
  doors: "sc-doors",
  "security-door": "s-door-security",
  electric: "sc-elec",
  lighting: "sc-lighting",
  plumbing: "sc-plumb",
  ac: "sc-climate",
  "smart-home": "sc-smart",
  painting: "sc-paint",
  flooring: "sc-floor",
  gypsum: "sc-gypsum",
  carpentry: "sc-carpentry",
  closets: "sc-closets",
  kitchen: "sc-kitchen",
  bath: "sc-bath",
  sanitary: "s-bath-sanitary",
  showers: "s-bath-showers",
  garden: "sc-garden",
  pergola: "s-hard-pergola",
  cleaning: "sc-cleaning",
  intercom: "sc-security",
  elevators: "s-mnt-elevator",
  c_1778448823740: "sc-solar",
};

const NATIONAL_AREA = "כל הארץ";

export default function CategorySuppliers({ initialCategoryId }: { initialCategoryId?: string } = {}) {
  const { categoryId: routeCategoryId } = useParams();
  const categoryId = initialCategoryId ?? routeCategoryId;
  const navigate = useNavigate();
  const { categories } = useApp();
  const { regions, cities } = useRegions();

  const [activeCategoryId, setActiveCategoryId] = useState<string>(CATEGORY_ID_ALIASES[categoryId ?? ""] ?? categoryId ?? "all");

  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [regionId, setRegionId] = useState<string>("all");
  const [cityId, setCityId] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<"all" | "service" | "product">("all");
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  const [supplierRegionIds, setSupplierRegionIds] = useState<Record<string, string[]>>({});
  const [supplierCityIds, setSupplierCityIds] = useState<Record<string, string[]>>({});
  const [supplierCouncilIds, setSupplierCouncilIds] = useState<Record<string, string[]>>({});

  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const relevantCategoryIds = useMemo(() => {
    if (activeCategoryId === "all") return [];
    // Include the selected category and ONLY its descendants — never the parent or siblings.
    // Previously we also added the parent (and then expanded ALL its children), which caused
    // clicking a sub-category to show every supplier under the parent tree.
    const ids = new Set<string>([activeCategoryId]);
    let changed = true;
    while (changed) {
      changed = false;
      categories.forEach((c) => {
        if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
          ids.add(c.id);
          changed = true;
        }
      });
    }
    return Array.from(ids);
  }, [activeCategoryId, categories]);

  useEffect(() => {
    setActiveCategoryId(CATEGORY_ID_ALIASES[categoryId ?? ""] ?? categoryId ?? "all");
  }, [categoryId]);

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
      const safety = window.setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, 8000);

      try {
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
        const supplierIds = list.map((s) => s.id);
        const { data: categoryJoins } = supplierIds.length
          ? await supabase.from("supplier_categories").select("supplier_id,category_id").in("supplier_id", supplierIds)
          : { data: [] };
        const categoriesBySupplier: Record<string, string[]> = {};
        ((categoryJoins ?? []) as SupplierCategoryRow[]).forEach((row) => {
          (categoriesBySupplier[row.supplier_id] ||= []).push(row.category_id);
        });
        const withNewCategories = list.map((s) => ({
          ...s,
          categories: categoriesBySupplier[s.id]?.length ? categoriesBySupplier[s.id] : s.categories,
        }));
        setSuppliers(withNewCategories);
        setLoading(false);

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
      : suppliers.filter((s) => (s.categories ?? []).some((id) => relevantCategoryIds.includes(id)));

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
  }, [suppliers, activeCategoryId, relevantCategoryIds, regionId, cityId, kindFilter, supplierRegionIds, supplierCityIds, supplierCouncilIds, regions, cities]);

  const areaLabel =
    cityId !== "all"
      ? cities.find((c) => c.id === cityId)?.name_he
      : regionId !== "all"
        ? regions.find((r) => r.id === regionId)?.name_he
        : "כל הארץ";

  const nationalCount = useMemo(
    () => filteredSuppliers.filter(isNationalSupplier).length,
    [filteredSuppliers, supplierRegionIds, supplierCityIds, supplierCouncilIds],
  );

  const kinds: { v: "all" | "service" | "product"; label: string; Icon: typeof Sparkles }[] = [
    { v: "all", label: "הכול", Icon: Sparkles },
    { v: "service", label: "בעלי מקצוע", Icon: Wrench },
    { v: "product", label: "ספקי מוצרים", Icon: Package },
  ];

  return (
    <MobileShell>
      <div className="bg-slate-50 min-h-screen pb-24" dir="rtl">
        <div className="px-4 pt-3 max-w-2xl mx-auto">
          {/* Sticky Header */}
          <header className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md pb-3 pt-2 -mx-4 px-4">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-700 transition mb-2"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              חזרה לתחומים
            </button>

            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                {activeCategory?.icon && (
                  <div className="h-11 w-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl shrink-0 shadow-sm">
                    {activeCategory.icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-[20px] leading-tight font-bold text-slate-900 truncate">
                    {activeCategory?.name ?? "ספקים"}
                  </h1>
                  <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                    {filteredSuppliers.length} ספקים זמינים · {areaLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary chips */}
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar -mx-1 px-1">
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-100 whitespace-nowrap">
                <Star className="h-3 w-3 fill-current" />
                ספקים מאומתים
              </div>
              {nationalCount > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-100 whitespace-nowrap">
                  <Sparkles className="h-3 w-3" />
                  {nationalCount} פועלים ארצית
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 whitespace-nowrap">
                <ShieldCheck className="h-3 w-3" />
                ביקורות אמיתיות
              </div>
            </div>

            {/* Filter chips */}
            <nav className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 border-b border-slate-200/70">
              {kinds.map(({ v, label, Icon }) => {
                const active = kindFilter === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setKindFilter(v)}
                    className={
                      "whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-bold inline-flex items-center gap-1.5 transition-all border " +
                      (active
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300")
                    }
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                );
              })}
              <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
              <button
                type="button"
                onClick={() => setShowAreaPicker((v) => !v)}
                className={
                  "whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-bold inline-flex items-center gap-1.5 transition-all border " +
                  (regionId !== "all" || cityId !== "all"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200")
                }
              >
                <MapPin className="h-3 w-3" />
                {areaLabel}
                <ChevronDown className={`h-3 w-3 transition-transform ${showAreaPicker ? "rotate-180" : ""}`} />
              </button>
            </nav>

            {showAreaPicker && (
              <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm grid grid-cols-2 gap-2 animate-fade-in">
                <select
                  value={regionId}
                  onChange={(e) => {
                    setRegionId(e.target.value);
                    setCityId("all");
                  }}
                  className="h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-[13px] text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="all">כל האזורים</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name_he}</option>
                  ))}
                </select>
                <select
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-[13px] text-slate-700 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                  disabled={regionId === "all" && filteredCities.length === 0}
                >
                  <option value="all">כל הערים</option>
                  {filteredCities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_he}</option>
                  ))}
                </select>
              </div>
            )}
          </header>

          {/* Suppliers list */}
          <main className="mt-4 space-y-3">
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center shadow-sm">
                <div className="h-8 w-8 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-sm">טוען ספקים...</p>
              </div>
            ) : loadError ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
                <p className="text-sm font-bold text-slate-900">שגיאה בטעינה</p>
                <p className="text-xs text-slate-500 mt-1.5">נסו לרענן את המסך בעוד רגע.</p>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
                <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">לא נמצאו ספקים</p>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-[260px] mx-auto">
                  שנה אזור או הזמן ספקים להצטרף כדי לפתוח עוד אפשרויות לדיירים.
                </p>
                <button
                  type="button"
                  onClick={() => { setRegionId("all"); setCityId("all"); }}
                  className="mt-4 h-10 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700"
                >
                  שנה אזור
                </button>
              </div>
            ) : (
              filteredSuppliers.map((s, idx) => {
                const isSvc = Boolean(s.offers_services) || s.supplier_kind === "service";
                const isProd = Boolean(s.offers_products) || s.supplier_kind === "product";
                const isNational = isNationalSupplier(s);
                const isFeatured = idx === 0;

                return (
                  <article
                    key={s.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden animate-fade-up"
                    style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                  >
                    <Link to={`/suppliers/${s.id}`} className="block p-4">
                      <div className="flex gap-3">
                        <div className="shrink-0">
                          <SupplierLogo name={s.business_name} logoUrl={s.logo_url} size="lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <h3 className="text-[15px] font-bold text-slate-900 truncate">{s.business_name}</h3>
                                {isFeatured && (
                                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">מומלץ</span>
                                )}
                              </div>
                              {s.short_description && (
                                <p className="text-[12.5px] text-slate-600 leading-relaxed line-clamp-2">
                                  {s.short_description}
                                </p>
                              )}
                            </div>
                            <div className="text-left shrink-0">
                              <SupplierRatingBadge supplierId={s.id} showEmpty={false} />
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {isNational ? "כל הארץ" : (s.service_areas?.slice(0, 2).join(" · ") || "אזור ייעודי")}
                            </span>
                            {isSvc && isProd ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                <Sparkles className="h-3 w-3 text-emerald-600" />
                                שירות + מוצרים
                              </span>
                            ) : isSvc ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                                <Wrench className="h-3 w-3" /> בעל מקצוע
                              </span>
                            ) : isProd ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <Package className="h-3 w-3" /> ספק מוצרים
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="bg-slate-50/60 border-t border-slate-100 px-4 py-2.5 flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-[11px] font-medium text-slate-600">זמין לעבודות</span>
                      </div>
                      <Link
                        to={`/suppliers/${s.id}`}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold transition-colors shadow-sm"
                      >
                        הצעת מחיר
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </main>
        </div>
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
