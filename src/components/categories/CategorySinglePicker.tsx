import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, Check, ChevronDown, ChevronLeft } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
  parentId?: string | null;
  level?: number | null;
}

interface Props {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  /** Category ids the supplier already works in — shown as quick picks. */
  suggestedIds?: string[];
  invalid?: boolean;
  placeholder?: string;
}

interface Leaf extends Category {
  domainId: string;
  domainName: string;
  domainIcon: string;
  groupName: string;
}

/**
 * Single-select category picker for the supplier offer editor.
 * Opens a full-screen sheet with search, quick picks and collapsible domains,
 * instead of a long flat native <select>.
 */
export function CategorySinglePicker({
  categories,
  value,
  onChange,
  suggestedIds = [],
  invalid,
  placeholder = "בחירת קטגוריה",
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [openDomain, setOpenDomain] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { domains, leavesByDomain, leafById } = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const childrenOf = new Map<string | null, Category[]>();
    for (const c of categories) {
      const key = c.parentId ?? null;
      const arr = childrenOf.get(key) ?? [];
      arr.push(c);
      childrenOf.set(key, arr);
    }
    const hasChildren = (id: string) => (childrenOf.get(id)?.length ?? 0) > 0;
    const rootOf = (c: Category): Category => {
      let cur: Category = c;
      const seen = new Set<string>();
      while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId.get(cur.parentId)!;
      }
      return cur;
    };

    const domainMap = new Map<string, Category>();
    const leafMap = new Map<string, Leaf[]>();
    const byLeafId = new Map<string, Leaf>();
    const seenNameInDomain = new Map<string, Map<string, number>>();

    for (const c of categories) {
      if (hasChildren(c.id)) continue;
      const root = rootOf(c);
      const parent = c.parentId ? byId.get(c.parentId) : undefined;
      const group = parent && parent.id !== root.id ? parent : root;
      const leaf: Leaf = {
        ...c,
        domainId: root.id,
        domainName: root.name,
        domainIcon: root.icon,
        groupName: group.name,
      };
      const nameMap = seenNameInDomain.get(root.id) ?? new Map<string, number>();
      const prevLevel = nameMap.get(c.name);
      const curLevel = c.level ?? 99;
      if (prevLevel !== undefined) {
        if (prevLevel >= curLevel) continue;
        leafMap.set(root.id, (leafMap.get(root.id) ?? []).filter((l) => l.name !== c.name));
      }
      nameMap.set(c.name, curLevel);
      seenNameInDomain.set(root.id, nameMap);
      domainMap.set(root.id, root);
      leafMap.set(root.id, [...(leafMap.get(root.id) ?? []), leaf]);
      byLeafId.set(c.id, leaf);
    }

    const ordered: Category[] = [];
    const seen = new Set<string>();
    for (const c of categories) {
      if (domainMap.has(c.id) && !seen.has(c.id)) {
        ordered.push(domainMap.get(c.id)!);
        seen.add(c.id);
      }
    }
    return { domains: ordered, leavesByDomain: leafMap, leafById: byLeafId };
  }, [categories]);

  const selected = leafById.get(value) ?? categories.find((c) => c.id === value) ?? null;

  const search = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!search) return [];
    const out: Leaf[] = [];
    for (const arr of leavesByDomain.values()) {
      for (const l of arr) {
        if (l.name.toLowerCase().includes(search) || l.groupName.toLowerCase().includes(search) || l.domainName.toLowerCase().includes(search)) {
          out.push(l);
        }
      }
    }
    return out.slice(0, 60);
  }, [search, leavesByDomain]);

  const quickPicks = useMemo(
    () => suggestedIds.map((id) => leafById.get(id)).filter((x): x is Leaf => Boolean(x)).slice(0, 8),
    [suggestedIds, leafById],
  );

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => { document.body.style.overflow = ""; clearTimeout(t); };
  }, [open]);

  useEffect(() => {
    if (open && selected && "domainId" in (selected as Leaf)) {
      setOpenDomain((selected as Leaf).domainId);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQ("");
  };

  const Row = ({ leaf, showDomain }: { leaf: Leaf; showDomain?: boolean }) => (
    <button
      type="button"
      onClick={() => pick(leaf.id)}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-right transition ${
        value === leaf.id ? "bg-[#0E6B5A]/8 ring-1 ring-[#0E6B5A]/30" : "hover:bg-gray-50"
      }`}
    >
      <span className="text-lg shrink-0">{leaf.icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-semibold text-[#0F172A] truncate">{leaf.name}</span>
        {showDomain && (
          <span className="block text-[11px] text-[#94A3B8] truncate">
            {leaf.domainName}{leaf.groupName !== leaf.domainName ? ` · ${leaf.groupName}` : ""}
          </span>
        )}
      </span>
      {value === leaf.id && <Check className="h-4 w-4 text-[#0E6B5A] shrink-0" />}
    </button>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`h-11 w-full rounded-xl bg-white ring-1 px-3 flex items-center gap-2 text-[13.5px] text-right ${
          invalid ? "ring-destructive/50" : "ring-black/[0.06]"
        }`}
      >
        {selected ? (
          <>
            <span className="text-base">{selected.icon}</span>
            <span className="flex-1 min-w-0 truncate font-semibold text-[#1F2937]">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-[#9CA3AF]">{placeholder}</span>
        )}
        <ChevronLeft className="h-4 w-4 text-[#9CA3AF] shrink-0" />
      </button>

      {open && createPortal(
        <div dir="rtl" className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="pt-[env(safe-area-inset-top)] border-b border-gray-100">
            <div className="flex items-center gap-2 px-3 h-14">
              <button type="button" onClick={() => setOpen(false)} aria-label="סגור"
                className="h-9 w-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="h-5 w-5 text-[#0F172A]" />
              </button>
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="חיפוש קטגוריה…"
                  className="h-10 w-full rounded-xl bg-gray-100 pr-9 pl-3 text-[13.5px] outline-none focus:ring-2 focus:ring-[#0E6B5A]/30"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-[calc(24px+env(safe-area-inset-bottom))]">
            {search ? (
              matches.length === 0 ? (
                <div className="text-center text-[13px] text-[#94A3B8] py-12">לא נמצאו תוצאות</div>
              ) : (
                <div className="py-2 space-y-0.5">
                  {matches.map((l) => <Row key={l.id} leaf={l} showDomain />)}
                </div>
              )
            ) : (
              <>
                {quickPicks.length > 0 && (
                  <div className="pt-3">
                    <div className="text-[11.5px] font-bold text-[#94A3B8] mb-2">התחומים שלי</div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {quickPicks.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => pick(l.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-semibold border ${
                            value === l.id
                              ? "bg-[#0E6B5A] text-white border-[#0E6B5A]"
                              : "bg-white text-[#0F172A] border-gray-200"
                          }`}
                        >
                          <span>{l.icon}</span>
                          {l.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="py-1 space-y-1.5">
                  {domains.map((d) => {
                    const leaves = leavesByDomain.get(d.id) ?? [];
                    const isOpen = openDomain === d.id;
                    return (
                      <div key={d.id} className="rounded-2xl border border-gray-100 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenDomain(isOpen ? null : d.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-3 bg-gray-50/70"
                        >
                          <span className="text-lg">{d.icon}</span>
                          <span className="flex-1 text-right text-[13.5px] font-bold text-[#0F172A]">{d.name}</span>
                          <span className="text-[11px] text-[#94A3B8]">{leaves.length}</span>
                          <ChevronDown className={`h-4 w-4 text-[#94A3B8] transition ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isOpen && (
                          <div className="p-1.5 space-y-0.5">
                            {leaves.map((l) => <Row key={l.id} leaf={l} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
