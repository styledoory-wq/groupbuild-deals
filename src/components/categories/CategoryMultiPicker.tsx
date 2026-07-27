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
        <div className="rounded-2xl border border-[#E6EAF0] bg-white px-3 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[13px] font-semibold text-[#0F172A]">
              {selectedChips.length === 1 ? "תחום אחד נבחר" : `${selectedChips.length} תחומים נבחרו`}
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="shrink-0 text-[12px] font-medium text-[#64748B] hover:text-[#0F172A]"
            >
              נקה הכל
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedChips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E5E1] bg-[#F6FAF9] px-2.5 py-1.5 text-[12px] font-medium text-[#0B5F50] transition-colors hover:border-[#0E6B5A]/40 hover:bg-[#EEF7F4]"
                aria-label={`הסר ${c.name}`}
              >
                <span className="text-[13px] leading-none opacity-70" aria-hidden>{c.icon}</span>
                <span>{c.name}</span>
                <X className="h-3 w-3 text-[#64748B]" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[#E6EAF0] divide-y divide-[#EEF0F3] max-h-[420px] overflow-y-auto bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
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
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleOpen(d.id)}
                  className="flex-1 flex items-center gap-3 text-right px-2 py-2 rounded-xl hover:bg-[#F8FAFC] transition-colors"
                >
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
                  />
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#E6EAF0] bg-[#F8FAFC] text-[15px] leading-none opacity-75" aria-hidden>
                    {d.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[#0F172A]">{d.name}</span>
                    <span className="block text-[11px] font-medium text-[#64748B]">
                      {selectedCount > 0 ? `${selectedCount} מתוך ${totalLeaves} נבחרו` : `${totalLeaves} תחומים זמינים`}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleDomain(d.id)}
                  className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    allSelected
                      ? "bg-[#0E6B5A] text-white border-[#0E6B5A]"
                      : "bg-white border-[#DDE3EA] text-[#334155] hover:border-[#0E6B5A]/45 hover:bg-[#F8FAFC]"
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
                <div className="px-4 pb-4 space-y-4">
                  {showFlatLeaves ? (
                    <div className="flex flex-wrap gap-2">
                      {leaves.map((c) => (
                        <LeafChip key={c.id} c={c} active={selectedSet.has(c.id)} onClick={() => toggle(c.id)} />
                      ))}
                    </div>
                  ) : (
                    groupEntries.map(([gid, g]) => (
                      <div key={gid}>
                        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold text-[#64748B]">
                          <span className="grid h-5 w-5 place-items-center rounded-md bg-[#F1F5F9] text-[12px] leading-none opacity-70" aria-hidden>
                            {g.icon}
                          </span>
                          <span>{g.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
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
      className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-right text-[13px] font-medium leading-snug transition-smooth ${
        active
          ? "bg-[#F1FAF7] text-[#0B5F50] border-[#BFDCD4] shadow-[0_1px_2px_rgba(14,107,90,0.08)]"
          : "bg-white border-[#E2E8F0] text-[#1F2937] hover:border-[#0E6B5A]/35 hover:bg-[#F8FCFB]"
      }`}
    >
      <span
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[13px] leading-none ${
          active ? "bg-white/70 opacity-80" : "bg-[#F1F5F9] opacity-65"
        }`}
        aria-hidden
      >
        {c.icon}
      </span>
      <span>{c.name}</span>
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#0E6B5A]" />}
    </button>
  );
}
