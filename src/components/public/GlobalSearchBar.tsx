import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Search as SearchIcon, X, Store, FolderTree, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logSearchQuery } from "@/lib/analytics";

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
      {/* Backdrop — subtle, closes on tap. */}
      <div
        onMouseDown={() => setOpen(false)}
        onTouchStart={() => setOpen(false)}
        style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(10,31,61,0.08)" }}
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
        className="bg-white rounded-2xl border border-[#ECEEF2] shadow-[0_20px_50px_-15px_rgba(10,31,61,0.28)] overflow-y-auto overscroll-contain"
      >
        {!term ? (
          <div className="p-4">
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">חיפושים פופולריים</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((p) => (
                <button key={p} onClick={() => { setQ(p); inputRef.current?.focus(); }} className="h-8 px-3 rounded-full bg-[#F7F5F0] text-[12px] font-semibold text-[#1F2937] hover:bg-[#0E6B5A] hover:text-white transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="p-6 text-center text-[13px] text-[#6B7280] flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> מחפש...
          </div>
        ) : hits.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[13px] text-[#6B7280]">לא נמצאו תוצאות ל־"{term}"</p>
            <p className="text-[11px] text-[#9CA3AF] mt-1">נסה מילה קרובה או ראה את כל הקטגוריות</p>
          </div>
        ) : (
          <div className="py-2">
            {grouped.categories.length > 0 && (
              <Section title="קטגוריות">
                {grouped.categories.map((h) => (
                  <button key={`c-${h.id}`} onClick={() => goTo(h)} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#F7F5F0] text-right">
                    <span className="h-9 w-9 rounded-xl bg-[#0E6B5A]/10 flex items-center justify-center text-lg">{h.icon || <FolderTree className="h-4 w-4 text-[#0E6B5A]" />}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[#1F2937] truncate">{h.name}</p>
                      {h.subtitle && <p className="text-[11px] text-[#6B7280] truncate">{h.subtitle}</p>}
                    </div>
                    {typeof h.supplier_count === "number" && h.supplier_count > 0 && (
                      <span className="text-[11px] font-semibold text-[#0E6B5A] shrink-0">{h.supplier_count} ספקים</span>
                    )}
                  </button>
                ))}
              </Section>
            )}
            {grouped.suppliers.length > 0 && (
              <Section title="ספקים">
                {grouped.suppliers.map((h) => (
                  <button key={`s-${h.id}`} onClick={() => goTo(h)} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#F7F5F0] text-right">
                    <span className="h-9 w-9 rounded-xl bg-[#F7F5F0] overflow-hidden flex items-center justify-center">
                      {h.icon ? <img src={h.icon} alt={h.name} className="h-full w-full object-cover" /> : <Store className="h-4 w-4 text-[#6B7280]" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[#1F2937] truncate">{h.name}</p>
                      {h.subtitle && <p className="text-[11px] text-[#6B7280] truncate">{h.subtitle}</p>}
                    </div>
                  </button>
                ))}
              </Section>
            )}
            {grouped.cities.length > 0 && (
              <Section title="ערים">
                {grouped.cities.map((h) => (
                  <button key={`ci-${h.id}`} onClick={() => goTo(h)} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#F7F5F0] text-right">
                    <span className="h-9 w-9 rounded-xl bg-[#F7F5F0] flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-[#0E6B5A]" />
                    </span>
                    <p className="text-[14px] font-bold text-[#1F2937] flex-1">{h.name}</p>
                  </button>
                ))}
              </Section>
            )}
            <div className="border-t border-[#ECEEF2] px-4 py-2 text-[11px] text-[#6B7280] flex justify-between">
              <span>{hits.length} תוצאות</span>
              <Link onClick={closeAndBlur} to={`/search?q=${encodeURIComponent(term)}`} className="text-[#0E6B5A] font-bold">ראה הכל ←</Link>
            </div>
          </div>
        )}
      </div>
    </>
  ) : null;

  return (
    <div ref={wrapRef} className="relative w-full" dir="rtl">
      <form onSubmit={onSubmit}>
        <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280] pointer-events-none z-10" strokeWidth={2} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder='חפש בעברית: "חשמלאי בצפת", "דלתות פנים", "מטבחים"...'
          className={`w-full bg-white border border-[#ECEEF2] pr-11 pl-11 font-medium text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0E6B5A] focus:ring-[3px] focus:ring-[#0E6B5A]/15 ${heroCls}`}
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(""); inputRef.current?.focus(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-[#F7F5F0] flex items-center justify-center"
            aria-label="נקה"
          >
            <X className="h-4 w-4 text-[#6B7280]" strokeWidth={2.4} />
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
      <div className="px-4 pt-2 pb-1 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{title}</div>
      {children}
    </div>
  );
}
