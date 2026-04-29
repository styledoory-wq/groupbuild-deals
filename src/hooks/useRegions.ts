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

const FALLBACK_REGIONS: Region[] = [
  { id: "north", slug: "north", name_he: "צפון", display_order: 10 },
  { id: "upper_galilee", slug: "upper_galilee", name_he: "גליל עליון", display_order: 20 },
  { id: "lower_galilee", slug: "lower_galilee", name_he: "גליל תחתון", display_order: 30 },
  { id: "golan", slug: "golan", name_he: "רמת הגולן", display_order: 40 },
  { id: "valleys", slug: "valleys", name_he: "עמקים", display_order: 50 },
  { id: "haifa_krayot", slug: "haifa_krayot", name_he: "חיפה והקריות", display_order: 60 },
  { id: "sharon", slug: "sharon", name_he: "שרון", display_order: 70 },
  { id: "center", slug: "center", name_he: "מרכז", display_order: 80 },
  { id: "gush_dan", slug: "gush_dan", name_he: "גוש דן", display_order: 90 },
  { id: "jerusalem_area", slug: "jerusalem_area", name_he: "ירושלים והסביבה", display_order: 100 },
  { id: "south", slug: "south", name_he: "דרום", display_order: 110 },
];

const FALLBACK_CITIES: City[] = [
  { id: "zefat", name_he: "צפת", region_id: "upper_galilee" },
  { id: "tiberias", name_he: "טבריה", region_id: "lower_galilee" },
  { id: "karmiel", name_he: "כרמיאל", region_id: "lower_galilee" },
  { id: "hatzor", name_he: "חצור הגלילית", region_id: "upper_galilee" },
  { id: "rosh_pina", name_he: "ראש פינה", region_id: "upper_galilee" },
  { id: "kiryat_shmona", name_he: "קריית שמונה", region_id: "upper_galilee" },
  { id: "nahariya", name_he: "נהריה", region_id: "lower_galilee" },
  { id: "akko", name_he: "עכו", region_id: "lower_galilee" },
  { id: "haifa", name_he: "חיפה", region_id: "haifa_krayot" },
  { id: "tel_aviv", name_he: "תל אביב-יפו", region_id: "gush_dan" },
  { id: "jerusalem", name_he: "ירושלים", region_id: "jerusalem_area" },
  { id: "beer_sheva", name_he: "באר שבע", region_id: "south" },
];

export function useRegions() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [r, c] = await Promise.all([
          supabase.from("regions").select("*").order("display_order"),
          supabase.from("cities").select("*").order("name_he"),
        ]);
        if (!active) return;
        const dbRegions = ((r.data ?? []) as Region[]).filter(Boolean);
        const dbCities = ((c.data ?? []) as City[]).filter(Boolean);
        setRegions(dbRegions.length > 0 ? dbRegions : FALLBACK_REGIONS);
        setCities(dbCities.length > 0 ? dbCities : FALLBACK_CITIES);
      } catch {
        if (!active) return;
        setRegions(FALLBACK_REGIONS);
        setCities(FALLBACK_CITIES);
      } finally {
        if (active) setLoading(false);
      }
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
