import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowLeft, Layers } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";

export default function CategoriesList() {
  const { categories } = useApp();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("categories")
        .eq("is_active", true)
        .eq("approval_status", "approved");
      const map: Record<string, number> = {};
      (data ?? []).forEach((row: { categories: string[] | null }) => {
        (row.categories ?? []).forEach((c) => {
          map[c] = (map[c] ?? 0) + 1;
        });
      });
      setCounts(map);
    })();
  }, []);

  const totalSuppliers = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <MobileShell>
      {/* Luxury hero — same DNA as Landing */}
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
            תחומי <span className="gb-gold-text">השדרוג</span>
            <br />
            לדירה שלך
          </h1>
          <div className="gb-divider-gold mb-4" />
          <p className="text-primary-foreground/75 text-[13px] leading-relaxed">
            בחר תחום וגלה ספקים מובילים שמשרתים את האזור שלך —
            הכל במקום אחד, יוקרתי ומאומת.
          </p>
        </div>
      </header>

      {/* Categories grid */}
      <div className="px-5 -mt-9 relative z-10 grid grid-cols-2 gap-3 pb-6">
        {categories.map((c, idx) => {
          const count = counts[c.id] ?? 0;
          const hasSuppliers = count > 0;
          return (
            <Link
              key={c.id}
              to={`/resident/categories/${c.id}`}
              className="gb-card p-4 hover:shadow-elevated hover:-translate-y-0.5 transition-smooth group relative overflow-hidden animate-fade-up"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              {/* gold corner shimmer */}
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

      <BottomNav role="resident" />
    </MobileShell>
  );
}
