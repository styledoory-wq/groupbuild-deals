import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
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

  return (
    <MobileShell>
      <PageHeader title="קטגוריות שדרוג" subtitle="בחרו תחום לראות את הספקים הזמינים" back={false} showBell />

      <div className="px-5 -mt-4 relative z-10 grid grid-cols-2 gap-3">
        {categories.map((c) => {
          const count = counts[c.id] ?? 0;
          return (
            <Link
              key={c.id}
              to={`/resident/categories/${c.id}`}
              className="gb-card p-4 hover:shadow-elevated hover:-translate-y-0.5 transition-smooth"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center text-2xl shadow-soft">
                  {c.icon}
                </div>
                {count > 0 && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gold/15 text-primary">
                    {count} ספקים
                  </span>
                )}
              </div>
              <h3 className="font-bold text-foreground text-sm leading-tight">{c.name}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">צפו בספקים בתחום</p>
            </Link>
          );
        })}
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
