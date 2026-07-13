import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Category { id: string; name: string; icon: string }

interface Props {
  categories: Category[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Extra classes for the chips scroll area */
  listClassName?: string;
  placeholder?: string;
}

/**
 * Category multi-select with a live search filter.
 * Used in supplier onboarding and in admin supplier create/edit dialogs.
 */
export function CategoryMultiPicker({
  categories,
  value,
  onChange,
  listClassName = "flex flex-wrap gap-1.5 max-h-56 overflow-y-auto",
  placeholder = "חיפוש תחום…",
}: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(s));
  }, [categories, q]);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-9 pr-9 text-fs-sm rounded-xl"
        />
      </div>
      {value.length > 0 && (
        <p className="text-fs-xs text-muted-foreground">נבחרו {value.length} תחומים</p>
      )}
      <div className={listClassName}>
        {filtered.length === 0 ? (
          <p className="text-fs-xs text-muted-foreground py-2">לא נמצאו תחומים תואמים</p>
        ) : (
          filtered.map((c) => {
            const active = value.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-smooth ${
                  active
                    ? "bg-[#0E6B5A] text-white border-[#0E6B5A] font-bold"
                    : "bg-card border-border text-foreground hover:border-[#0E6B5A]/50"
                }`}
              >
                {c.icon} {c.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
