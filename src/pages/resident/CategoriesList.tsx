import { Link } from "react-router-dom";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";

export default function CategoriesList() {
  const { categories, deals, user } = useApp();

  return (
    <MobileShell>
      <PageHeader title="קטגוריות שדרוג" subtitle="בחרו קטגוריה לראות את כל העסקאות הפעילות" back={false} showBell />

      <div className="px-5 -mt-4 relative z-10 grid grid-cols-2 gap-3">
        {categories.map((c) => {
          const count = deals.filter((d) => d.categoryId === c.id && d.projectId === user?.projectId).length;
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
                    {count} פעילות
                  </span>
                )}
              </div>
              <h3 className="font-bold text-foreground text-sm leading-tight">{c.name}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">צפו בעסקאות</p>
            </Link>
          );
        })}
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
