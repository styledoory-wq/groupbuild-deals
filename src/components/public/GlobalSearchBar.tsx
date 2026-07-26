import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Search as SearchIcon, X, Store, FolderTree, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logSearchQuery } from "@/lib/analytics";
import { iconForCategory } from "@/lib/categoryIcons";

type Hit = {
  result_type: "category" | "supplier" | "city";
  id: string;
  name: string;
  subtitle: string | null;
  slug: string | null;
  icon: string | null;
  supplier_count: number | null;
  score: number | null;
};

const POPULAR = ["חשמלאי", "דלתות", "מזגן", "סולארי", "ריצוף", "מטבחים", "פרגולה"];

/**
 * Global search bar with autocomplete — searches categories, suppliers, and cities
 * in a single query. Fully public (no auth required).
 *
 * The results dropdown is rendered via a React Portal into `document.body` to avoid
 * being clipped by ancestors with `overflow-hidden`, transforms, or lower stacking
 * contexts. Position is recalculated from the input's bounding rect on scroll/resize.
 */
export function GlobalSearchBar({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [maxHeight, setMaxHeight] = useState<number>(420);

  const term = q.trim();

  useEffect(() => {
    if (!term) { setHits([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_global", { _q: term });
      if (cancelled) return;
      const results = (data ?? []) as Hit[];
      setHits(results);
      setLoading(false);
      void logSearchQuery(term, results.length);
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [term]);

  // Recalculate portal position when open / on scroll / resize / viewport change.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 8, left: r.left, width: r.width });
      // Prefer visualViewport (accounts for mobile keyboard).
      const vv = (window as any).visualViewport;
      const vh = vv?.height ?? window.innerHeight;
      const vTop = vv?.offsetTop ?? 0;
      const available = vh + vTop - (r.bottom + 8) - 16;
      setMaxHeight(Math.max(220, Math.min(available, 520)));
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    (window as any).visualViewport?.addEventListener?.("resize", update);
    (window as any).visualViewport?.addEventListener?.("scroll", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      (window as any).visualViewport?.removeEventListener?.("resize", update);
      (window as any).visualViewport?.removeEventListener?.("scroll", update);
    };
  }, [open, hits.length, term]);

  // Outside click / touch closes dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Close dropdown on any route change (back button, deep link, tab nav).
  useEffect(() => {
    setOpen(false);
    inputRef.current?.blur();
  }, [location.pathname, location.search]);

  const grouped = useMemo(() => ({
    categories: hits.filter((h) => h.result_type === "category").slice(0, 6),
    suppliers: hits.filter((h) => h.result_type === "supplier").slice(0, 6),
    cities: hits.filter((h) => h.result_type === "city").slice(0, 4),
  }), [hits]);

  const closeAndBlur = () => {
    setOpen(false);
    inputRef.current?.blur();
  };

  const goTo = (h: Hit) => {
    void logSearchQuery(term, hits.length, { id: h.id, type: h.result_type });
    setQ("");
    closeAndBlur();
    if (h.result_type === "supplier") navigate(`/supplier/${h.slug ?? h.id}`);
    else if (h.result_type === "category") navigate(`/category/${h.slug ?? h.id}`);
    else if (h.result_type === "city") navigate(`/search?q=${encodeURIComponent(h.name)}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term) return;
    if (hits[0]) { goTo(hits[0]); return; }
    closeAndBlur();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const heroCls = variant === "hero"
    ? "h-14 text-[15px] rounded-[20px] shadow-[0_8px_24px_-8px_rgba(10,31,61,0.18)]"
    : "h-12 text-[14px] rounded-[16px]";

  const dropdown = open && rect ? (
    <>
      {/* Transparent click-away layer; kept under the focused search field. */}
      <div
        onMouseDown={() => setOpen(false)}
        onTouchStart={() => setOpen(false)}
        className="fixed inset-0 bg-transparent"
        style={{ zIndex: 998 }}
        aria-hidden
      />
      <div
        ref={panelRef}
        dir="rtl"
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          maxHeight,
          zIndex: 999,
        }}
        className="overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card shadow-floating"
      >
        {!term ? (
          <div className="p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">חיפושים פופולריים</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((p) => (
                <button key={p} onClick={() => { setQ(p); inputRef.current?.focus(); }} className="h-8 rounded-full bg-background px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground">
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-center text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> מחפש...
          </div>
        ) : hits.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[13px] text-muted-foreground">לא נמצאו תוצאות ל־"{term}"</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">נסה מילה קרובה או ראה את כל הקטגוריות</p>
          </div>
        ) : (
          <div className="py-2">
            {grouped.categories.length > 0 && (
              <Section title="קטגוריות">
                {grouped.categories.map((h) => {
                  const CategoryIcon = iconForCategory(h.id, h.name) ?? FolderTree;
                  return (
                  <button key={`c-${h.id}`} onClick={() => goTo(h)} className="flex w-full items-center gap-3 px-4 py-2.5 text-right hover:bg-background">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                      <CategoryIcon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[14px] font-bold text-foreground">{h.name}</p>
                    </div>
                    {typeof h.supplier_count === "number" && h.supplier_count > 0 && (
                      <span className="shrink-0 text-[11px] font-semibold text-secondary">{h.supplier_count} ספקים</span>
                    )}
                  </button>
                  );
                })}
              </Section>
            )}
            {grouped.suppliers.length > 0 && (
              <Section title="ספקים">
                {grouped.suppliers.map((h) => (
                  <button key={`s-${h.id}`} onClick={() => goTo(h)} className="flex w-full items-center gap-3 px-4 py-2.5 text-right hover:bg-background">
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-background">
                      {h.icon ? <img src={h.icon} alt={h.name} className="h-full w-full object-cover" /> : <Store className="h-4 w-4 text-muted-foreground" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[14px] font-bold text-foreground">{h.name}</p>
                      {h.subtitle && <p className="truncate text-[11px] text-muted-foreground">{h.subtitle}</p>}
                    </div>
                  </button>
                ))}
              </Section>
            )}
            {grouped.cities.length > 0 && (
              <Section title="ערים">
                {grouped.cities.map((h) => (
                  <button key={`ci-${h.id}`} onClick={() => goTo(h)} className="flex w-full items-center gap-3 px-4 py-2.5 text-right hover:bg-background">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background">
                      <MapPin className="h-4 w-4 text-secondary" />
                    </span>
                    <p className="flex-1 text-[14px] font-bold text-foreground">{h.name}</p>
                  </button>
                ))}
              </Section>
            )}
            <div className="flex justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              <span>{hits.length} תוצאות</span>
              <Link onClick={closeAndBlur} to={`/search?q=${encodeURIComponent(term)}`} className="font-bold text-secondary">ראה הכל ←</Link>
            </div>
          </div>
        )}
      </div>
    </>
  ) : null;

  return (
    <div ref={wrapRef} className={`relative w-full ${open ? "z-[1000]" : ""}`} dir="rtl">
      <form onSubmit={onSubmit}>
        <SearchIcon className="pointer-events-none absolute right-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder='חפש בעברית: "חשמלאי בצפת", "דלתות פנים", "מטבחים"...'
          className={`w-full border border-border bg-card pr-11 pl-11 font-medium text-foreground placeholder:text-muted-foreground/65 focus:border-secondary focus:outline-none focus:ring-[3px] focus:ring-secondary/15 ${heroCls}`}
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(""); inputRef.current?.focus(); }}
            className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-background"
            aria-label="נקה"
          >
            <X className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
          </button>
        )}
      </form>

      {typeof document !== "undefined" && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
