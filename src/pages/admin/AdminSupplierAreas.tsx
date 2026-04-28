import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useRegions } from "@/hooks/useRegions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Save, Globe, MapPin } from "lucide-react";

interface SupplierRow {
  id: string;
  business_name: string;
  serves_all_country: boolean;
}

export default function AdminSupplierAreas() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const { regions, cities, citiesByRegion } = useRegions();

  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set());
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [servesAll, setServesAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!supplierId) return;
      const [s, r, c] = await Promise.all([
        supabase.from("suppliers").select("id,business_name,serves_all_country").eq("id", supplierId).maybeSingle(),
        supabase.from("supplier_regions").select("region_id").eq("supplier_id", supplierId),
        supabase.from("supplier_cities").select("city_id").eq("supplier_id", supplierId),
      ]);
      setSupplier(s.data as SupplierRow | null);
      setServesAll(s.data?.serves_all_country ?? false);
      setSelectedRegions(new Set((r.data ?? []).map((x: { region_id: string }) => x.region_id)));
      setSelectedCities(new Set((c.data ?? []).map((x: { city_id: string }) => x.city_id)));
      setLoading(false);
    })();
  }, [supplierId]);

  const toggleRegion = (id: string) => {
    const s = new Set(selectedRegions);
    if (s.has(id)) {
      s.delete(id);
      // Remove cities of that region
      const regionCities = citiesByRegion(id).map((c) => c.id);
      const newCities = new Set(selectedCities);
      regionCities.forEach((cid) => newCities.delete(cid));
      setSelectedCities(newCities);
    } else {
      s.add(id);
    }
    setSelectedRegions(s);
  };

  const toggleCity = (id: string) => {
    const s = new Set(selectedCities);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedCities(s);
  };

  const save = async () => {
    if (!supplierId) return;
    setSaving(true);
    try {
      // Update supplier flag
      await supabase.from("suppliers").update({ serves_all_country: servesAll }).eq("id", supplierId);

      // Replace regions
      await supabase.from("supplier_regions").delete().eq("supplier_id", supplierId);
      if (selectedRegions.size > 0) {
        await supabase.from("supplier_regions").insert(
          [...selectedRegions].map((region_id) => ({ supplier_id: supplierId, region_id }))
        );
      }
      // Replace cities
      await supabase.from("supplier_cities").delete().eq("supplier_id", supplierId);
      if (selectedCities.size > 0) {
        await supabase.from("supplier_cities").insert(
          [...selectedCities].map((city_id) => ({ supplier_id: supplierId, city_id }))
        );
      }
      toast.success("אזורי השירות נשמרו");
      navigate("/admin/suppliers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MobileShell><div className="p-8 text-center">טוען…</div></MobileShell>;
  if (!supplier) return <MobileShell><div className="p-8 text-center">ספק לא נמצא</div></MobileShell>;

  return (
    <MobileShell>
      <PageHeader title="אזורי שירות" subtitle={supplier.business_name} back />

      <div className="px-5 -mt-4 relative z-10 space-y-4 pb-32">
        <label className="gb-card p-4 flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={servesAll}
            onChange={(e) => setServesAll(e.target.checked)}
            className="h-5 w-5 accent-primary"
          />
          <Globe className="h-5 w-5 text-gold" />
          <div className="flex-1">
            <div className="font-bold text-sm">משרת את כל הארץ</div>
            <div className="text-[11px] text-muted-foreground">הספק יוצג לכל הדיירים בכל מקום</div>
          </div>
        </label>

        {!servesAll && (
          <>
            <div className="gb-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-gold" />
                <h3 className="font-bold text-sm">אזורים</h3>
                <span className="text-[11px] text-muted-foreground mr-auto">{selectedRegions.size} נבחרו</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {regions.map((r) => {
                  const active = selectedRegions.has(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggleRegion(r.id)}
                      className={
                        "h-10 rounded-xl text-xs font-bold border transition px-3 " +
                        (active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border")
                      }
                    >
                      {r.name_he}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedRegions.size > 0 && (
              <div className="gb-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-sm">ערים ספציפיות (אופציונלי)</h3>
                  <span className="text-[11px] text-muted-foreground mr-auto">{selectedCities.size} נבחרו</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  אם לא תבחר ערים — הספק יוצג לכל העיר באזורים שנבחרו.
                </p>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                  {[...selectedRegions].map((rid) => {
                    const region = regions.find((r) => r.id === rid);
                    const regionCities = citiesByRegion(rid);
                    if (!region || regionCities.length === 0) return null;
                    return (
                      <div key={rid}>
                        <div className="text-[11px] font-bold text-muted-foreground mb-1.5">{region.name_he}</div>
                        <div className="flex flex-wrap gap-1">
                          {regionCities.map((c) => {
                            const active = selectedCities.has(c.id);
                            return (
                              <button
                                key={c.id}
                                onClick={() => toggleCity(c.id)}
                                className={
                                  "px-2.5 py-1 rounded-full text-[11px] font-bold border transition " +
                                  (active
                                    ? "bg-gold/20 text-primary border-gold"
                                    : "bg-card text-foreground border-border")
                                }
                              >
                                {c.name_he}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[480px] px-4 pb-20 pt-3 bg-gradient-to-t from-background via-background to-background/0">
          <Button
            onClick={save}
            disabled={saving}
            className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold"
          >
            <Save className="h-4 w-4 ml-2" />
            {saving ? "שומר…" : "שמירה"}
          </Button>
        </div>
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
