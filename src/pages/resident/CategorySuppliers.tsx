import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, MapPin, Sparkles, Star } from "lucide-react";
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
  serves_all_country: boolean;
  is_active: boolean;
  approval_status: string;
}

export default function CategorySuppliers() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { categories } = useApp();
  const { regions, cities } = useRegions();

  const cat = categories.find((c) => c.id === categoryId);

  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);
  const [loading, setLoading] = useState(true);

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
        if (cityId === "all") return false;
      }
      if (cityId !== "all" && supplierIdsByCity && !supplierIdsByCity.has(s.id)) {
        if (regionId === "all") return false;
        return false;
      }
      return true;
    });
  }, [suppliers, regionId, cityId, supplierIdsByRegion, supplierIdsByCity]);

  const areaLabel =
    cityId !== "all"
      ? cities.find((c) => c.id === cityId)?.name_he
      : regionId !== "all"
        ? regions.find((r) => r.id === regionId)?.name_he
        : "כל הארץ";

  return (
    <MobileShell>
      {/* Luxury hero */}
      <header className="bg-gradient-hero text-primary-foreground px-6 pt-9 pb-16 rounded-b-[28px] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

        <button
          onClick={() => navigate(-1)}
          className="relative inline-flex items-center gap-1 text-[11px] text-primary-foreground/70 hover:text-gold transition-smooth mb-5"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה לתחומים
        </button>

        <div className="relative animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/12 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-[11px] font-medium text-primary-foreground/90">
              {filteredSuppliers.length} ספקים זמינים · {areaLabel}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            {cat?.icon && (
              <div className="h-12 w-12 rounded-2xl bg-white/8 border border-gold/20 flex items-center justify-center text-2xl shadow-soft">
                {cat.icon}
              </div>
            )}
            <div>
              <h1 className="text-[24px] leading-[1.15] font-extrabold">
                <span className="gb-gold-text">{cat?.name ?? "ספקים"}</span>
              </h1>
              <p className="text-primary-foreground/65 text-[12px] mt-0.5">ספקים מובילים בתחום</p>
            </div>
          </div>
          <div className="gb-divider-gold" />
        </div>
      </header>

      <div className="px-5 -mt-10 relative z-10 space-y-3 pb-6">
        {/* Filters card */}
        <div className="gb-card p-4 animate-fade-up">
          <div className="flex items-center gap-1.5 mb-3">
            <MapPin className="h-3.5 w-3.5 text-gold" />
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
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
        {loading ? (
          <div className="gb-card p-10 text-center">
            <div className="h-8 w-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">טוען ספקים...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="gb-card p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-3">
              <MapPin className="h-6 w-6 text-gold" />
            </div>
            <p className="text-sm font-bold text-foreground">אין ספקים זמינים באזור זה</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed max-w-[240px] mx-auto">
              נסו להרחיב את הסינון לכל האזורים, או חזרו אלינו בקרוב — ספקים חדשים מצטרפים כל הזמן.
            </p>
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
                <h3 className="font-bold text-foreground text-[15px] truncate">{s.business_name}</h3>
                {s.short_description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {s.short_description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <SupplierRatingBadge supplierId={s.id} showEmpty={false} />
                  {s.serves_all_country && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/15 text-primary border border-gold/20">
                      ארצי
                    </span>
                  )}
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 text-gold" /> מאומת
                  </span>
                </div>
              </div>
              <ChevronLeft className="h-5 w-5 text-gold shrink-0 group-hover:-translate-x-0.5 transition-smooth" strokeWidth={2} />
            </Link>
          ))
        )}
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
