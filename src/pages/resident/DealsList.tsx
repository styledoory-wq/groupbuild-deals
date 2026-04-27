import { useParams } from "react-router-dom";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { DealCard } from "@/components/deals/DealCard";
import { useApp } from "@/store/AppStore";

export default function DealsList() {
  const { categoryId } = useParams();
  const { deals, categories, user } = useApp();

  const filtered = deals.filter((d) => {
    if (user?.projectId && d.projectId !== user.projectId) return false;
    if (categoryId && d.categoryId !== categoryId) return false;
    return true;
  });

  const cat = categories.find((c) => c.id === categoryId);

  return (
    <MobileShell>
      <PageHeader
        title={cat ? `${cat.icon}  ${cat.name}` : "כל העסקאות"}
        subtitle={`${filtered.length} עסקאות פעילות בפרויקט שלך`}
      />
      <div className="px-5 -mt-4 relative z-10 space-y-3">
        {filtered.length === 0 && (
          <div className="gb-card p-8 text-center">
            <p className="text-muted-foreground text-sm">אין עסקאות פעילות בקטגוריה זו כרגע.</p>
          </div>
        )}
        {filtered.map((d) => (
          <DealCard key={d.id} deal={d} />
        ))}
      </div>
      <BottomNav role="resident" />
    </MobileShell>
  );
}
