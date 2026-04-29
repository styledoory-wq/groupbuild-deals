import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, MapPin, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
}

/**
 * Combobox רב-בחירה עם חיפוש — לאזורים, ערים ו"כל הארץ".
 * נשען על טבלאות regions/cities ב-DB.
 */
export function AreasCombobox({ value, onChange, placeholder = "חפש או בחר אזור / עיר..." }: Props) {
  const { regions, cities, regionById, cityById, loading } = useRegions();
  const [open, setOpen] = useState(false);

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
    onChange({
      servesAllCountry: !value.servesAllCountry,
      regionIds: [],
      cityIds: [],
    });
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

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-11 rounded-xl justify-between font-normal text-right"
            disabled={loading}
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 text-gold" />
              {selectedChips.length > 0
                ? `${selectedChips.length} אזורי שירות נבחרו`
                : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 z-50 bg-popover"
          align="start"
          dir="rtl"
        >
          <Command shouldFilter={true}>
            <CommandInput placeholder="חפש אזור או עיר..." className="text-right" />
            <CommandList className="max-h-72">
              <CommandEmpty>לא נמצאו תוצאות</CommandEmpty>

              <CommandGroup heading="כיסוי כללי">
                <CommandItem value="כל הארץ" onSelect={toggleAll} className="cursor-pointer">
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      value.servesAllCountry ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <Globe className="ml-2 h-4 w-4 text-gold" />
                  כל הארץ
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="אזורים">
                {regions.map((r) => {
                  const active = value.regionIds.includes(r.id);
                  return (
                    <CommandItem
                      key={r.id}
                      value={`אזור ${r.name_he}`}
                      onSelect={() => toggleRegion(r.id)}
                      className="cursor-pointer"
                    >
                      <Check className={cn("ml-2 h-4 w-4", active ? "opacity-100" : "opacity-0")} />
                      {r.name_he}
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="ערים">
                {cities.map((c) => {
                  const region = regionById(c.region_id);
                  const active = value.cityIds.includes(c.id);
                  return (
                    <CommandItem
                      key={c.id}
                      value={`${c.name_he} ${region?.name_he ?? ""}`}
                      onSelect={() => toggleCity(c.id)}
                      className="cursor-pointer"
                    >
                      <Check className={cn("ml-2 h-4 w-4", active ? "opacity-100" : "opacity-0")} />
                      <span>{c.name_he}</span>
                      {region && (
                        <span className="mr-2 text-[11px] text-muted-foreground">· {region.name_he}</span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedChips.map((chip) => (
            <span
              key={`${chip.type}-${chip.id}`}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border",
                chip.type === "all"
                  ? "bg-gold/15 text-primary border-gold/40"
                  : chip.type === "region"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card text-foreground border-border",
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
