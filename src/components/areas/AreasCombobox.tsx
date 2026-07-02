import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, MapPin, X, Globe, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRegions } from "@/hooks/useRegions";

export interface AreasComboboxValue {
  servesAllCountry: boolean;
  regionIds: string[];
  cityIds: string[];
}

interface Props {
  value: AreasComboboxValue;
  onChange: (v: AreasComboboxValue) => void;
  placeholder?: string;
  /** When true, hides "All country" and cities — regions only (used for audience targeting). */
  regionsOnly?: boolean;
}

/**
 * Multi-select combobox with Hebrew-friendly substring search.
 * We handle filtering manually (not cmdk's built-in scoring) so small
 * settlements like "בר יוחאי" are actually findable.
 */
export function AreasCombobox({
  value,
  onChange,
  placeholder = "חפש או בחר אזור / עיר / יישוב...",
  regionsOnly = false,
}: Props) {
  const { regions, cities, regionById, cityById, loading } = useRegions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const norm = (s: string) => s.replace(/["'׳״]/g, "").replace(/\s+/g, " ").trim();
  const q = norm(query).toLowerCase();

  const filteredRegions = useMemo(() => {
    if (!q) return regions;
    return regions.filter((r) => norm(r.name_he).toLowerCase().includes(q));
  }, [regions, q]);

  const filteredCities = useMemo(() => {
    if (regionsOnly) return [];
    if (!q) return cities.slice(0, 40); // don't dump all 600 on open
    return cities.filter((c) => {
      const name = norm(c.name_he).toLowerCase();
      const region = regionById(c.region_id)?.name_he ?? "";
      return name.includes(q) || norm(region).toLowerCase().includes(q);
    });
  }, [cities, q, regionById, regionsOnly]);

  const showAllCountry = !regionsOnly && (!q || "כל הארץ".includes(q));

  const selectedChips = useMemo(() => {
    if (value.servesAllCountry) {
      return [{ id: "all", label: "כל הארץ", type: "all" as const }];
    }
    const r = value.regionIds
      .map((id) => regionById(id))
      .filter(Boolean)
      .map((r) => ({ id: r!.id, label: r!.name_he, type: "region" as const }));
    const c = value.cityIds
      .map((id) => cityById(id))
      .filter(Boolean)
      .map((c) => ({ id: c!.id, label: c!.name_he, type: "city" as const }));
    return [...r, ...c];
  }, [value, regionById, cityById]);

  const toggleAll = () => {
    onChange({ servesAllCountry: !value.servesAllCountry, regionIds: [], cityIds: [] });
  };
  const toggleRegion = (id: string) => {
    const next = value.regionIds.includes(id)
      ? value.regionIds.filter((x) => x !== id)
      : [...value.regionIds, id];
    onChange({ ...value, servesAllCountry: false, regionIds: next });
  };
  const toggleCity = (id: string) => {
    const next = value.cityIds.includes(id)
      ? value.cityIds.filter((x) => x !== id)
      : [...value.cityIds, id];
    onChange({ ...value, servesAllCountry: false, cityIds: next });
  };
  const removeChip = (chip: { id: string; type: "all" | "region" | "city" }) => {
    if (chip.type === "all") onChange({ servesAllCountry: false, regionIds: [], cityIds: [] });
    if (chip.type === "region") toggleRegion(chip.id);
    if (chip.type === "city") toggleCity(chip.id);
  };

  const noResults =
    q.length > 0 && filteredRegions.length === 0 && filteredCities.length === 0 && !showAllCountry;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-11 rounded-[16px] justify-between font-medium text-right"
            disabled={loading}
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 text-[#0E6B5A]" />
              {selectedChips.length > 0
                ? `${selectedChips.length} ${regionsOnly ? "אזורי יעד נבחרו" : "אזורי שירות נבחרו"}`
                : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 z-50 bg-popover max-h-[60vh] overflow-hidden"
          align="start"
          dir="rtl"
        >
          <div className="flex flex-col max-h-[60vh]">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#ECEEF2] bg-white sticky top-0">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חפש אזור, עיר או יישוב..."
                className="flex-1 h-9 bg-transparent outline-none text-[14px] font-medium placeholder:text-[#9CA3AF]"
                dir="rtl"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-destructive p-1"
                  aria-label="נקה חיפוש"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 py-1">
              {showAllCountry && (
                <div className="px-1">
                  <div className="px-2 pt-2 pb-1 text-[11px] font-bold text-[#6B7280]">כיסוי כללי</div>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[14px] font-medium rounded-[10px] hover:bg-[#F4F6FA] text-right"
                  >
                    <Check className={cn("h-4 w-4", value.servesAllCountry ? "opacity-100 text-[#0E6B5A]" : "opacity-0")} />
                    <Globe className="h-4 w-4 text-[#0E6B5A]" />
                    כל הארץ
                  </button>
                </div>
              )}

              {filteredRegions.length > 0 && (
                <div className="px-1 mt-1">
                  <div className="px-2 pt-2 pb-1 text-[11px] font-bold text-[#6B7280]">אזורים</div>
                  {filteredRegions.map((r) => {
                    const active = value.regionIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleRegion(r.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[14px] font-medium rounded-[10px] hover:bg-[#F4F6FA] text-right"
                      >
                        <Check className={cn("h-4 w-4", active ? "opacity-100 text-[#0E6B5A]" : "opacity-0")} />
                        {r.name_he}
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredCities.length > 0 && (
                <div className="px-1 mt-1">
                  <div className="px-2 pt-2 pb-1 text-[11px] font-bold text-[#6B7280]">
                    ערים ויישובים {!q && `(מציג ${filteredCities.length} — חפש לצמצום)`}
                  </div>
                  {filteredCities.map((c) => {
                    const region = regionById(c.region_id);
                    const active = value.cityIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCity(c.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[14px] font-medium rounded-[10px] hover:bg-[#F4F6FA] text-right"
                      >
                        <Check className={cn("h-4 w-4", active ? "opacity-100 text-[#0E6B5A]" : "opacity-0")} />
                        <span>{c.name_he}</span>
                        {region && (
                          <span className="mr-auto text-[11px] text-muted-foreground">{region.name_he}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {noResults && (
                <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                  לא נמצאו תוצאות עבור "{query}".
                  <br />
                  נסה שם אחר או בחר אזור רחב יותר.
                </div>
              )}
            </div>

            {selectedChips.length > 0 && (
              <div className="border-t border-[#ECEEF2] p-2 bg-[#FAFBFC]">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full h-9 rounded-[10px] bg-[#0E6B5A] text-white text-[13px] font-bold"
                >
                  סיום · {selectedChips.length} נבחרו
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedChips.map((chip) => (
            <span
              key={`${chip.type}-${chip.id}`}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-fs-xs font-extrabold shadow-[0_1px_3px_rgba(10,31,61,0.06)]",
                chip.type === "all"
                  ? "bg-[#F4F6FA] text-[#1F2937]"
                  : chip.type === "region"
                    ? "bg-[#EAF2FF] text-[#2F6BFF]"
                    : "bg-white text-[#1F2937] border border-[#ECEEF2]",
              )}
            >
              {chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip)}
                className="hover:text-destructive"
                aria-label={`הסר ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
