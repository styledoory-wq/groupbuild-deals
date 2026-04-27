import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { Building2, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusLabel: Record<string, string> = {
  planning: "בתכנון", construction: "בבנייה", delivery: "במסירה", completed: "הושלם",
};

export default function AdminProjects() {
  const { projects } = useApp();
  return (
    <MobileShell>
      <PageHeader title="ניהול פרויקטים" subtitle={`${projects.length} פרויקטים פעילים`} back={false} />
      <div className="px-5 -mt-4 relative z-10 mb-4">
        <Button className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold">
          <Plus className="h-4 w-4 ml-2" /> הוספת פרויקט
        </Button>
      </div>
      <div className="px-5 space-y-3">
        {projects.map((p) => (
          <div key={p.id} className="gb-card p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-hero flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{p.name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3" /> {p.city}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Tag>{p.buildingCount} בניינים</Tag>
                  <Tag>{p.apartmentCount} דירות</Tag>
                  <Tag accent>{statusLabel[p.status]}</Tag>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={"text-[10px] font-bold px-2 py-1 rounded-full " + (accent ? "bg-gold/15 text-primary" : "bg-muted text-muted-foreground")}>
      {children}
    </span>
  );
}
