import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, MapPin, Star } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
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
  serves_all_country: boolean;
  is_active: boolean;
  approval_status: string;
}

export default function CategorySuppliers() {
  const { categoryId } = useParams();
  const { categories } = useApp();
  const { regions, cities } = useRegions();

  const cat = categories.find((c) => c.id === categoryId);

  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [regionId, setRegionId] = useState<string>("all");
  const [cityId, setCityId] = useState<string>("all");
  const [supplierIdsByRegion, setSupplierIdsByRegion] = useState<Set<string> | null>(null);
  const [supplierIdsByCity, setSupplierIdsByCity] = useState<Set<string> | null>(null);

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

  // Load active approved suppliers for this category
  useEffect(() => {
    (async () => {
      if (!categoryId) return;
      setLoading(true);
      const { data } = await supabase
        .from("suppliers")
        .select("id,business_name,short_description,description,logo_url,categories,serves_all_country,is_active,approval_status")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .contains("categories", [categoryId]);
      setSuppliers((data ?? []) as DbSupplier[]);
      setLoading(false);
    })();
  }, [categoryId]);

  // Load supplier ids for selected region
  useEffect(() => {
    (async () => {
      if (regionId === "all") {
        setSupplierIdsByRegion(null);
        return;
      }
      const { data } = await supabase
        .from("supplier_regions")
        .select("supplier_id")
        .eq("region_id", regionId);
      setSupplierIdsByRegion(new Set((data ?? []).map((r) => r.supplier_id)));
    })();
  }, [regionId]);

  // Load supplier ids for selected city
  useEffect(() => {
    (async () => {
      if (cityId === "all") {
        setSupplierIdsByCity(null);
        return;
      }
      const { data } = await supabase
        .from("supplier_cities")
        .select("supplier_id")
        .eq("city_id", cityId);
      setSupplierIdsByCity(new Set((data ?? []).map((r) => r.supplier_id)));
    })();
  }, [cityId]);

  const filteredCities = useMemo(
    () => (regionId === "all" ? cities : cities.filter((c) => c.region_id === regionId)),
    [cities, regionId],
  );

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (s.serves_all_country) return true;
      if (regionId !== "all" && supplierIdsByRegion && !supplierIdsByRegion.has(s.id)) {
        // could still match by city — fall through to city check
        if (cityId === "all") return false;
      }
      if (cityId !== "all" && supplierIdsByCity && !supplierIdsByCity.has(s.id)) {
        if (regionId === "all") return false;
        // if region matched, allow even if city not matched? require city when chosen
        return false;
      }
      return true;
    });
  }, [suppliers, regionId, cityId, supplierIdsByRegion, supplierIdsByCity]);

  return (
    <MobileShell>
      <PageHeader
        title={cat ? `${cat.icon}  ${cat.name}` : "ספקים"}
        subtitle={`${filteredSuppliers.length} ספקים זמינים`}
      />

      <div className="px-5 -mt-4 relative z-10 space-y-3">
        {/* Filters */}
        <div className="gb-card p-3 grid grid-cols-2 gap-2">
          <select
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value);
              setCityId("all");
            }}
            className="h-10 rounded-xl bg-card border border-border px-3 text-xs text-foreground"
          >
            <option value="all">כל האזורים</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name_he}</option>
            ))}
          </select>
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="h-10 rounded-xl bg-card border border-border px-3 text-xs text-foreground"
            disabled={regionId === "all" && filteredCities.length === 0}
          >
            <option value="all">כל הערים</option>
            {filteredCities.map((c) => (
              <option key={c.id} value={c.id}>{c.name_he}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="gb-card p-8 text-center">
            <p className="text-muted-foreground text-sm">טוען ספקים...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="gb-card p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted/60 border border-border flex items-center justify-center mx-auto mb-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">אין ספקים זמינים בקטגוריה ובאזור זה</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              נסו לשנות את הסינון או לחזור מאוחר יותר.
            </p>
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <Link
              key={s.id}
              to={`/suppliers/${s.id}`}
              className="gb-card p-4 flex items-center gap-3 hover:shadow-elevated hover:-translate-y-0.5 transition-smooth"
            >
              <SupplierLogo name={s.business_name} logoUrl={s.logo_url} size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-sm truncate">{s.business_name}</h3>
                {s.short_description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {s.short_description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  {s.serves_all_country && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/15 text-primary">
                      ארצי
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 text-gold" /> חדש
                  </span>
                </div>
              </div>
              <ChevronLeft className="h-5 w-5 text-gold shrink-0" strokeWidth={1.75} />
            </Link>
          ))
        )}
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
