import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, ArrowLeft, Search, X } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";

// Stage → category IDs mapping (matches dashboard)
const STAGE_CATEGORIES: Record<string, { title: string; ids: string[] }> = {
  planning: { title: "תכנון ועיצוב", ids: ["architect", "interior-designer", "consultant"] },
  structure: { title: "שלד ובנייה", ids: ["contractor", "skeleton", "gypsum"] },
  systems: { title: "מערכות הבית", ids: ["electric", "plumbing", "ac", "smart-home"] },
  finishes: {
    title: "גמרים",
    ids: [
      "windows", "doors", "security-door",
      "flooring", "cladding", "painting",
      "kitchen", "bath", "showers", "sanitary",
      "carpentry", "closets", "lighting",
    ],
  },
  outdoor: { title: "חוץ ופיתוח", ids: ["garden", "pergola", "cleaning"] },
};

interface SupplierLite {
  id: string;
  business_name: string;
  short_description: string | null;
  logo_url: string | null;
  categories: string[];
  service_areas: string[];
}

export default function CategoriesList() {
  const { categories } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stageId = searchParams.get("stage") || "";
  const stage = stageId ? STAGE_CATEGORIES[stageId] : null;

  const visibleCategories = useMemo(() => {
    if (!stage) return categories;
    const allowed = new Set(stage.ids);
    return categories.filter((c) => allowed.has(c.id));
  }, [categories, stage]);

  const [suppliers, setSuppliers] = useState<SupplierLite[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id,business_name,short_description,logo_url,categories,service_areas")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .in("approval_status", ["approved", "active"])
        .order("business_name");
      setSuppliers((data as SupplierLite[]) ?? []);
    })();
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    suppliers.forEach((s) => {
      (s.categories ?? []).forEach((c) => {
        map[c] = (map[c] ?? 0) + 1;
      });
    });
    return map;
  }, [suppliers]);

  const totalSuppliers = suppliers.length;

  const q = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!q) return [];
    return suppliers
      .filter((s) => {
        const catNames = (s.categories ?? [])
          .map((cid) => categories.find((c) => c.id === cid)?.name?.toLowerCase() ?? "")
          .join(" ");
        return (
          s.business_name.toLowerCase().includes(q) ||
          (s.short_description ?? "").toLowerCase().includes(q) ||
          (s.service_areas ?? []).some((a) => a.toLowerCase().includes(q)) ||
          catNames.includes(q)
        );
      })
      .slice(0, 20);
  }, [q, suppliers, categories]);

  const matchingCategories = useMemo(() => {
    if (!q) return [];
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [q, categories]);

  return (
    <MobileShell>
      {/* Luxury hero */}
      <header className="bg-gradient-hero text-primary-foreground px-6 pt-10 pb-16 rounded-b-[28px] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

        <div className="relative animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/12 mb-5">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-[11px] font-medium text-primary-foreground/90">
              {totalSuppliers > 0 ? `${totalSuppliers} ספקים מאושרים` : "ספקים נבחרים בקפידה"}
            </span>
          </div>

          <h1 className="text-[28px] leading-[1.15] font-extrabold mb-3">
            {stage ? (
              <>
                {stage.title}
                <br />
                <span className="gb-gold-text">תחומי השלב</span>
              </>
            ) : (
              <>
                תחומי <span className="gb-gold-text">השדרוג</span>
                <br />
                לדירה שלך
              </>
            )}
          </h1>
          <div className="gb-divider-gold mb-4" />
          <p className="text-primary-foreground/75 text-[13px] leading-relaxed">
            {stage ? "בחרו תחום כדי לראות את הספקים שמשרתים אותו." : "בחרו תחום, או חפשו ספק לפי שם, קטגוריה או אזור."}
          </p>
        </div>
      </header>

      {/* Search bar */}
      <div className="px-5 -mt-9 relative z-10 mb-4">
        <div className="gb-card p-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              dir="rtl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי ספק, קטגוריה או אזור"
              className="w-full h-11 pr-10 pl-9 rounded-xl bg-cream/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center"
                aria-label="נקה"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search results */}
      {q && (
        <div className="px-5 mb-6 space-y-3 animate-fade-up">
          {matchingCategories.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-2">קטגוריות תואמות</p>
              <div className="flex flex-wrap gap-2">
                {matchingCategories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/resident/categories/${c.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-xs font-bold text-primary"
                  >
                    <span>{c.icon}</span>
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold text-muted-foreground mb-2">
              ספקים תואמים ({searchResults.length})
            </p>
            {searchResults.length === 0 ? (
              <div className="gb-card p-5 text-center text-sm text-muted-foreground">
                לא נמצאו ספקים מתאימים ל"{search}"
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((s) => {
                  const catNames = (s.categories ?? [])
                    .map((cid) => categories.find((c) => c.id === cid)?.name)
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(" · ");
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/suppliers/${s.id}`)}
                      className="w-full gb-card p-3 flex items-center gap-3 text-right hover:shadow-elevated transition-smooth"
                    >
                      <SupplierLogo name={s.business_name} logoUrl={s.logo_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{s.business_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {catNames || "ספק"}
                          {s.service_areas?.length > 0 && ` · ${s.service_areas.slice(0, 2).join(", ")}`}
                        </p>
                      </div>
                      <ArrowLeft className="h-4 w-4 text-gold shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories grid */}
      {!q && (
        <div className="px-5 grid grid-cols-2 gap-3 pb-6">
          {visibleCategories.map((c, idx) => {
            const count = counts[c.id] ?? 0;
            const hasSuppliers = count > 0;
            return (
              <Link
                key={c.id}
                to={`/resident/categories/${c.id}`}
                className="gb-card p-4 hover:shadow-elevated hover:-translate-y-0.5 transition-smooth group relative overflow-hidden animate-fade-up"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="absolute -top-8 -left-8 h-16 w-16 rounded-full bg-gold/10 blur-2xl group-hover:bg-gold/20 transition-smooth pointer-events-none" />

                <div className="flex items-start justify-between mb-3 relative">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center text-2xl shadow-soft border border-gold/20">
                    {c.icon}
                  </div>
                  {hasSuppliers ? (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gold/15 text-primary border border-gold/20">
                      {count}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-muted/60 text-muted-foreground">
                      בקרוב
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-foreground text-sm leading-tight relative">{c.name}</h3>
                <div className="flex items-center justify-between mt-2 relative">
                  <p className="text-[11px] text-muted-foreground">
                    {hasSuppliers ? "צפו בספקים" : "אין ספקים זמינים"}
                  </p>
                  {hasSuppliers && (
                    <ArrowLeft className="h-3 w-3 text-gold opacity-0 group-hover:opacity-100 transition-smooth" strokeWidth={2} />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <BottomNav role="resident" />
    </MobileShell>
  );
}
