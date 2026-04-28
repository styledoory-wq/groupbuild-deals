import { useEffect, useState } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRegions, type Region, type City } from "@/hooks/useRegions";

export default function AdminRegions() {
  const { regions, cities, loading } = useRegions();
  const [tick, setTick] = useState(0);
  const [localRegions, setLocalRegions] = useState<Region[]>([]);
  const [localCities, setLocalCities] = useState<City[]>([]);

  const [newRegionName, setNewRegionName] = useState("");
  const [newRegionSlug, setNewRegionSlug] = useState("");
  const [newCityName, setNewCityName] = useState("");
  const [newCityRegion, setNewCityRegion] = useState("");

  useEffect(() => {
    setLocalRegions(regions);
    setLocalCities(cities);
  }, [regions, cities, tick]);

  const refresh = async () => {
    const [r, c] = await Promise.all([
      supabase.from("regions").select("*").order("display_order"),
      supabase.from("cities").select("*").order("name_he"),
    ]);
    setLocalRegions((r.data ?? []) as Region[]);
    setLocalCities((c.data ?? []) as City[]);
    setTick((t) => t + 1);
  };

  const addRegion = async () => {
    if (!newRegionName.trim() || !newRegionSlug.trim()) {
      toast.error("מלאו שם וסלאג");
      return;
    }
    const { error } = await supabase.from("regions").insert({
      name_he: newRegionName.trim(),
      slug: newRegionSlug.trim(),
      display_order: (localRegions.at(-1)?.display_order ?? 0) + 10,
    });
    if (error) return toast.error(error.message);
    toast.success("האזור נוסף");
    setNewRegionName(""); setNewRegionSlug("");
    refresh();
  };

  const removeRegion = async (id: string) => {
    const { error } = await supabase.from("regions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("האזור נמחק");
    refresh();
  };

  const addCity = async () => {
    if (!newCityName.trim() || !newCityRegion) {
      toast.error("מלאו שם עיר ובחרו אזור");
      return;
    }
    const { error } = await supabase.from("cities").insert({
      name_he: newCityName.trim(),
      region_id: newCityRegion,
    });
    if (error) return toast.error(error.message);
    toast.success("העיר נוספה");
    setNewCityName("");
    refresh();
  };

  const removeCity = async (id: string) => {
    const { error } = await supabase.from("cities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  if (loading) {
    return <MobileShell><div className="p-8 text-center text-muted-foreground">טוען…</div></MobileShell>;
  }

  return (
    <MobileShell>
      <PageHeader title="אזורי שירות" subtitle="ניהול אזורים וערים" />

      <section className="px-5 mb-6 space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">אזורים</h3>
        <div className="gb-card p-3 flex gap-2">
          <Input placeholder="שם אזור" value={newRegionName} onChange={(e) => setNewRegionName(e.target.value)} maxLength={40} className="h-10 rounded-lg" />
          <Input placeholder="slug" value={newRegionSlug} onChange={(e) => setNewRegionSlug(e.target.value)} maxLength={40} dir="ltr" className="h-10 rounded-lg w-32" />
          <Button onClick={addRegion} className="h-10 rounded-lg bg-primary"><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-1.5">
          {localRegions.map((r) => (
            <div key={r.id} className="gb-card p-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gold" />
              <div className="flex-1">
                <div className="text-sm font-semibold">{r.name_he}</div>
                <div className="text-[11px] text-muted-foreground" dir="ltr">{r.slug}</div>
              </div>
              <button onClick={() => removeRegion(r.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg" aria-label="מחק">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 mb-8 space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ערים</h3>
        <div className="gb-card p-3 flex gap-2">
          <Input placeholder="שם עיר" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} maxLength={60} className="h-10 rounded-lg" />
          <select value={newCityRegion} onChange={(e) => setNewCityRegion(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-2 text-sm">
            <option value="">אזור</option>
            {localRegions.map((r) => <option key={r.id} value={r.id}>{r.name_he}</option>)}
          </select>
          <Button onClick={addCity} className="h-10 rounded-lg bg-primary"><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {localCities.map((c) => {
            const reg = localRegions.find((r) => r.id === c.region_id);
            return (
              <div key={c.id} className="gb-card p-3 flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{c.name_he}</div>
                  <div className="text-[11px] text-muted-foreground">{reg?.name_he ?? "—"}</div>
                </div>
                <button onClick={() => removeCity(c.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </MobileShell>
  );
}
