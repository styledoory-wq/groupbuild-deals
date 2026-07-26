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
  /** Kept for backwards compatibility (unused). */
  listClassName?: string;
  placeholder?: string;
}

interface Leaf extends Category {
  /** Intermediate parent label (level 2/3) to sub-group leaves within a domain. */
  groupId: string;
  groupName: string;
  groupIcon: string;
}

/**
 * Hierarchical category picker.
 *
 * Categories arrive as a flat list with up to 4 levels (domain → category →
 * sub → sub-sub). We collapse the tree so:
 *  - Root = level-1 domain
 *  - Selectable "leaves" = nodes with no children
 *  - Leaves are grouped inside their root domain, optionally sub-grouped by
 *    the closest intermediate parent so the list stays readable.
 * Duplicate names across levels are hidden by preferring the deepest leaf.
 */
export function CategoryMultiPicker({
  categories,
  value,
  onChange,
  placeholder = "חיפוש תחום…",
}: Props) {
  const [q, setQ] = useState("");
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({});

  const { domains, leavesByDomain, allLeafById } = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const childrenOf = new Map<string | null, Category[]>();
    for (const c of categories) {
      const key = c.parentId ?? null;
      const arr = childrenOf.get(key) ?? [];
      arr.push(c);
      childrenOf.set(key, arr);
    }
    const hasChildren = (id: string) => (childrenOf.get(id)?.length ?? 0) > 0;

    // Walk up to the root (level-1) ancestor.
    const rootOf = (c: Category): Category => {
      let cur: Category = c;
      const seen = new Set<string>();
      while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId.get(cur.parentId)!;
      }
      return cur;
    };

    // Domains = level-1 roots that actually have descendants (or are themselves leaves used directly).
    const domainMap = new Map<string, Category>();
    const leafMap = new Map<string, Leaf[]>();
    const leafById = new Map<string, Leaf>();

    // De-dupe by name within a domain: prefer the deepest node (leaf) — keeps
    // sub-sub labels like "נגרות מותאמת אישית" and drops the redundant copy.
    const seenNameInDomain = new Map<string, Map<string, number>>(); // domainId -> name -> level

    for (const c of categories) {
      if (hasChildren(c.id)) continue; // only leaves are selectable
      const root = rootOf(c);
      // Immediate parent within the domain used as sub-group label.
      const parent = c.parentId ? byId.get(c.parentId) : undefined;
      const group = parent && parent.id !== root.id ? parent : root;
      const leaf: Leaf = {
        ...c,
        groupId: group.id,
        groupName: group.name,
        groupIcon: group.icon,
      };

      const domainId = root.id;
      const nameMap = seenNameInDomain.get(domainId) ?? new Map<string, number>();
      const prevLevel = nameMap.get(c.name);
      const curLevel = c.level ?? 99;
      if (prevLevel !== undefined) {
        if (prevLevel >= curLevel) continue; // keep the deeper (already stored) one
        // Replace shallower duplicate
        const arr = leafMap.get(domainId) ?? [];
        const filtered = arr.filter((l) => l.name !== c.name);
        leafMap.set(domainId, filtered);
      }
      nameMap.set(c.name, curLevel);
      seenNameInDomain.set(domainId, nameMap);

      domainMap.set(domainId, root);
      const arr = leafMap.get(domainId) ?? [];
      arr.push(leaf);
      leafMap.set(domainId, arr);
      leafById.set(c.id, leaf);
    }

    // Preserve incoming order (already ordered by display_order at load time).
    const orderedDomains: Category[] = [];
    const seenDomain = new Set<string>();
    for (const c of categories) {
      if (domainMap.has(c.id) && !seenDomain.has(c.id)) {
        orderedDomains.push(domainMap.get(c.id)!);
        seenDomain.add(c.id);
      }
    }

    return { domains: orderedDomains, leavesByDomain: leafMap, allLeafById: leafById };
  }, [categories]);

  const search = q.trim().toLowerCase();
  const isFiltering = search.length > 0;

  const visibleLeavesByDomain = useMemo(() => {
    if (!isFiltering) return leavesByDomain;
    const out = new Map<string, Leaf[]>();
    for (const [dId, arr] of leavesByDomain.entries()) {
      const filtered = arr.filter(
        (c) => c.name.toLowerCase().includes(search) || c.groupName.toLowerCase().includes(search),
      );
      if (filtered.length) out.set(dId, filtered);
    }
    return out;
  }, [leavesByDomain, isFiltering, search]);

  const visibleDomains = isFiltering ? domains.filter((d) => visibleLeavesByDomain.has(d.id)) : domains;

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

  const selectedChips = value.map((id) => allLeafById.get(id)).filter((x): x is Leaf => Boolean(x));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-11 pr-9 text-fs-sm rounded-xl"
        />
      </div>

      {selectedChips.length === 0 && !isFiltering && (
        <div className="rounded-xl border border-dashed border-[#0E6B5A]/35 bg-[#0E6B5A]/5 px-3 py-2.5 text-[12px] text-[#0B1220] leading-relaxed">
          פתחו קטגוריה למטה או חפשו בשם התחום. אפשר גם ללחוץ ״בחר הכל״ על תחום שלם אם אתם מספקים את כולו.
        </div>
      )}

      {selectedChips.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/40 p-2">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-fs-xs font-bold text-foreground">נבחרו {selectedChips.length} תחומים</span>
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

      <div className="rounded-2xl border border-[#E8ECF1] divide-y divide-[#EEF0F3] max-h-[420px] overflow-y-auto bg-[#FAFBFC]">
        {visibleDomains.length === 0 && (
          <p className="text-fs-xs text-muted-foreground py-6 text-center">לא נמצאו תחומים תואמים</p>
        )}
        {visibleDomains.map((d) => {
          const leaves = visibleLeavesByDomain.get(d.id) ?? [];
          const totalLeaves = leavesByDomain.get(d.id)?.length ?? 0;
          const selectedCount = (leavesByDomain.get(d.id) ?? []).filter((l) => selectedSet.has(l.id)).length;
          const allSelected = totalLeaves > 0 && selectedCount === totalLeaves;
          // Respect the user's explicit open/close. When they haven't toggled
          // it yet (`undefined`), auto-open if there are already selections so
          // the chips are visible; once toggled, honor their choice.
          const userState = openDomains[d.id];
          const open = isFiltering || (userState === undefined ? selectedCount > 0 : userState);

          // Sub-group leaves by their intermediate parent for readability.
          const groups = new Map<string, { name: string; icon: string; items: Leaf[] }>();
          for (const l of leaves) {
            const g = groups.get(l.groupId) ?? { name: l.groupName, icon: l.groupIcon, items: [] };
            g.items.push(l);
            groups.set(l.groupId, g);
          }
          const groupEntries = Array.from(groups.entries());
          const singleGroup = groupEntries.length === 1 && groupEntries[0][0] === d.id;
          const showFlatLeaves = isFiltering || singleGroup;

          return (
            <div key={d.id} className="bg-white">
              <div className="flex items-center gap-2 px-2 py-2">
                <button
                  type="button"
                  onClick={() => toggleOpen(d.id)}
                  className="flex-1 flex items-center gap-2 text-right px-2 py-2 rounded-xl hover:bg-[#F4F6FA] transition-colors"
                >
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
                  />
                  <span className="text-[13px] font-bold text-[#0F172A]">
                    {d.icon} {d.name}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    selectedCount > 0
                      ? "bg-[#0E6B5A]/12 text-[#0E6B5A]"
                      : "bg-[#F4F6FA] text-[#8E95A2]"
                  }`}>
                    {selectedCount > 0 ? `${selectedCount}/${totalLeaves}` : `${totalLeaves}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleDomain(d.id)}
                  className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                    allSelected
                      ? "bg-[#0E6B5A] text-white border-[#0E6B5A]"
                      : "bg-white border-[#E8ECF1] text-[#334155] hover:border-[#0E6B5A]/50"
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
                <div className="px-3 pb-3 space-y-3">
                  {showFlatLeaves ? (
                    <div className="flex flex-wrap gap-1.5">
                      {leaves.map((c) => (
                        <LeafChip key={c.id} c={c} active={selectedSet.has(c.id)} onClick={() => toggle(c.id)} />
                      ))}
                    </div>
                  ) : (
                    groupEntries.map(([gid, g]) => (
                      <div key={gid}>
                        <div className="text-[11px] font-bold text-[#8E95A2] mb-1.5 px-1 tracking-wide">
                          {g.icon} {g.name}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {g.items.map((c) => (
                            <LeafChip key={c.id} c={c} active={selectedSet.has(c.id)} onClick={() => toggle(c.id)} />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeafChip({ c, active, onClick }: { c: Category; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-xl border transition-smooth text-right ${
        active
          ? "bg-[#0E6B5A] text-white border-[#0E6B5A] font-bold shadow-[0_2px_8px_-4px_rgba(14,107,90,0.55)]"
          : "bg-white border-[#E8ECF1] text-[#1F2937] hover:border-[#0E6B5A]/45 hover:bg-[#F3FAF8]"
      }`}
    >
      <span className="text-[14px] leading-none" aria-hidden>{c.icon}</span>
      <span>{c.name}</span>
      {active && <Check className="h-3 w-3 opacity-90 shrink-0" />}
    </button>
  );
}
