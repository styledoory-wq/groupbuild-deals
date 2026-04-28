import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Region {
  id: string;
  slug: string;
  name_he: string;
  display_order: number;
}

export interface City {
  id: string;
  name_he: string;
  region_id: string;
}

export function useRegions() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [r, c] = await Promise.all([
        supabase.from("regions").select("*").order("display_order"),
        supabase.from("cities").select("*").order("name_he"),
      ]);
      if (!active) return;
      setRegions((r.data ?? []) as Region[]);
      setCities((c.data ?? []) as City[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const citiesByRegion = (regionId: string) => cities.filter((c) => c.region_id === regionId);
  const cityById = (id: string) => cities.find((c) => c.id === id) ?? null;
  const regionById = (id: string) => regions.find((r) => r.id === id) ?? null;
  const regionBySlug = (slug: string) => regions.find((r) => r.slug === slug) ?? null;

  return { regions, cities, citiesByRegion, cityById, regionById, regionBySlug, loading };
}
