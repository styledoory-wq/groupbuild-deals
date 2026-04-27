import { useState } from "react";
import { Search, MapPin, Building2, Check } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Input } from "@/components/ui/input";
import { useApp } from "@/store/AppStore";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const statusLabel: Record<string, string> = {
  planning: "בתכנון",
  construction: "בבנייה",
  delivery: "במסירה",
  completed: "הושלם",
};

export default function ProjectsList() {
  const { projects, user, setUser } = useApp();
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const filtered = projects.filter((p) => p.name.includes(q) || p.city.includes(q));

  const select = (id: string) => {
    if (user) setUser({ ...user, projectId: id });
    navigate("/resident");
  };

  return (
    <MobileShell>
      <PageHeader title="בחרו את הפרויקט שלכם" subtitle="חברו את הדירה שלכם לעסקאות הקבוצתיות" />
      <div className="px-5 -mt-4 relative z-10 mb-4">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חפשו פרויקט או עיר..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 pr-11 rounded-2xl bg-card border-border shadow-soft"
          />
        </div>
      </div>

      <div className="px-5 space-y-3">
        {filtered.map((p) => {
          const active = user?.projectId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => select(p.id)}
              className={cn(
                "w-full text-right gb-card p-4 transition-smooth hover:shadow-elevated",
                active && "border-gold ring-2 ring-gold/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-2xl bg-gradient-hero flex items-center justify-center shrink-0">
                  <Building2 className="h-7 w-7 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-foreground truncate">{p.name}</h3>
                    {active && <Check className="h-5 w-5 text-success shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3" />
                    {p.city}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-primary/5 text-primary font-medium">
                      {p.buildingCount} בניינים
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {p.apartmentCount} דירות
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gold/15 text-primary font-medium">
                      {statusLabel[p.status]}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
