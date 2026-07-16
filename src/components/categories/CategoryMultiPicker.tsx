import { useMemo, useState } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Category {
  id: string;
  name: string;
  icon: string;
  parentId?: string | null;
  level?: number | null;
}

interface Props {
  categories: Category[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Kept for backwards compatibility (unused in the new layout). */
  listClassName?: string;
  placeholder?: string;
}

/**
 * Hierarchical category picker.
 *
 * Categories arrive as a flat list but include `parentId`/`level`. We render
 * a domain-grouped accordion so a supplier picks a domain once and then
 * toggles the specific sub-categories inside it, instead of scanning the
 * entire flat list. A search input filters across all leaves.
 */
export function CategoryMultiPicker({
  categories,
  value,
  onChange,
  placeholder = "חיפוש תחום…",
}: Props) {
  const [q, setQ] = useState("");
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({});

  // Split into domains (level 1 / no parent) and leaves (has parent).
  const { domains, leavesByDomain, leafById } = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const domainMap = new Map<string, Category>();
    const leaves = new Map<string, Category[]>();
    const ORPHAN_ID = "__other__";
    const orphanDomain: Category = { id: ORPHAN_ID, name: "אחר", icon: "📦", level: 1, parentId: null };

    for (const c of categories) {
      const isDomain = !c.parentId || c.level === 1;
      if (isDomain) domainMap.set(c.id, c);
    }
    for (const c of categories) {
      const isDomain = !c.parentId || c.level === 1;
      if (isDomain) continue;
      const parent = c.parentId && domainMap.has(c.parentId) ? c.parentId : ORPHAN_ID;
      if (parent === ORPHAN_ID && !domainMap.has(ORPHAN_ID)) domainMap.set(ORPHAN_ID, orphanDomain);
      const arr = leaves.get(parent) ?? [];
      arr.push(c);
      leaves.set(parent, arr);
    }
    // Domains with no children (flat legacy) → treat the domain itself as a leaf under "אחר".
    const domainsWithChildren = Array.from(domainMap.values()).filter((d) => (leaves.get(d.id)?.length ?? 0) > 0);
    const childlessDomains = Array.from(domainMap.values()).filter(
      (d) => d.id !== ORPHAN_ID && (leaves.get(d.id)?.length ?? 0) === 0,
    );
    if (childlessDomains.length) {
      if (!domainMap.has(ORPHAN_ID)) domainsWithChildren.push(orphanDomain);
      const arr = leaves.get(ORPHAN_ID) ?? [];
      arr.push(...childlessDomains);
      leaves.set(ORPHAN_ID, arr);
      if (!domainsWithChildren.find((d) => d.id === ORPHAN_ID)) domainsWithChildren.push(orphanDomain);
    }

    return { domains: domainsWithChildren, leavesByDomain: leaves, leafById: byId };
  }, [categories]);

  const search = q.trim().toLowerCase();
  const isFiltering = search.length > 0;

  const visibleLeavesByDomain = useMemo(() => {
    if (!isFiltering) return leavesByDomain;
    const out = new Map<string, Category[]>();
    for (const [dId, arr] of leavesByDomain.entries()) {
      const filtered = arr.filter((c) => c.name.toLowerCase().includes(search));
      if (filtered.length) out.set(dId, filtered);
    }
    return out;
  }, [leavesByDomain, isFiltering, search]);

  const visibleDomains = isFiltering
    ? domains.filter((d) => visibleLeavesByDomain.has(d.id))
    : domains;

  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  const toggleDomain = (domainId: string) => {
    const leaves = leavesByDomain.get(domainId) ?? [];
    const leafIds = leaves.map((l) => l.id);
    const allSelected = leafIds.every((id) => selectedSet.has(id));
    if (allSelected) {
      onChange(value.filter((v) => !leafIds.includes(v)));
    } else {
      const set = new Set(value);
      leafIds.forEach((id) => set.add(id));
      onChange(Array.from(set));
    }
  };

  const toggleOpen = (id: string) => setOpenDomains((s) => ({ ...s, [id]: !s[id] }));

  const selectedChips = value
    .map((id) => leafById.get(id))
    .filter((x): x is Category => Boolean(x));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-10 pr-9 text-fs-sm rounded-xl"
        />
      </div>

      {selectedChips.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/40 p-2">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-fs-xs font-bold text-foreground">
              נבחרו {selectedChips.length} תחומים
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-fs-xs text-muted-foreground hover:text-foreground"
            >
              נקה הכל
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedChips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className="inline-flex items-center gap-1 text-fs-xs px-2.5 py-1 rounded-full bg-[#0E6B5A] text-white"
                aria-label={`הסר ${c.name}`}
              >
                <span>{c.icon} {c.name}</span>
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border divide-y divide-border max-h-[420px] overflow-y-auto">
        {visibleDomains.length === 0 && (
          <p className="text-fs-xs text-muted-foreground py-6 text-center">לא נמצאו תחומים תואמים</p>
        )}
        {visibleDomains.map((d) => {
          const leaves = visibleLeavesByDomain.get(d.id) ?? [];
          const totalLeaves = leavesByDomain.get(d.id)?.length ?? 0;
          const selectedCount = (leavesByDomain.get(d.id) ?? []).filter((l) => selectedSet.has(l.id)).length;
          const allSelected = totalLeaves > 0 && selectedCount === totalLeaves;
          const open = isFiltering || openDomains[d.id] || selectedCount > 0;

          return (
            <div key={d.id} className="bg-background">
              <div className="flex items-center gap-2 px-2 py-2">
                <button
                  type="button"
                  onClick={() => toggleOpen(d.id)}
                  className="flex-1 flex items-center gap-2 text-right px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
                  />
                  <span className="text-fs-sm font-bold text-foreground">
                    {d.icon} {d.name}
                  </span>
                  <span className="text-fs-xs text-muted-foreground">
                    {selectedCount > 0 ? `${selectedCount}/${totalLeaves}` : `${totalLeaves}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleDomain(d.id)}
                  className={`shrink-0 text-fs-xs px-3 py-1.5 rounded-full border transition-colors ${
                    allSelected
                      ? "bg-[#0E6B5A] text-white border-[#0E6B5A]"
                      : "bg-background border-border text-foreground hover:border-[#0E6B5A]/50"
                  }`}
                  aria-label={allSelected ? "בטל בחירה של כל התחום" : "בחר את כל התחום"}
                >
                  {allSelected ? (
                    <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> הכל</span>
                  ) : (
                    "בחר הכל"
                  )}
                </button>
              </div>
              {open && (
                <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                  {leaves.map((c) => {
                    const active = selectedSet.has(c.id);
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
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
