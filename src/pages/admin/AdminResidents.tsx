import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";

const mockResidents = [
  { id: "u1", name: "נועה כהן", apartment: "ב/14", phone: "050-1234567", projectId: "p1", deals: 3 },
  { id: "u2", name: "אבי שמש", apartment: "א/7", phone: "052-9876543", projectId: "p1", deals: 2 },
  { id: "u3", name: "מירב בן-דוד", apartment: "ג/22", phone: "054-5551234", projectId: "p1", deals: 1 },
  { id: "u4", name: "יאיר אזולאי", apartment: "ב/3", phone: "053-7778888", projectId: "p2", deals: 4 },
  { id: "u5", name: "ענת לוי", apartment: "א/15", phone: "050-1112222", projectId: "p3", deals: 2 },
  { id: "u6", name: "רן ברק", apartment: "ד/9", phone: "052-3334444", projectId: "p2", deals: 1 },
];

export default function AdminResidents() {
  const { projects } = useApp();
  return (
    <MobileShell>
      <PageHeader title="ניהול דיירים" subtitle={`${mockResidents.length} דיירים פעילים`} />
      <div className="px-5 -mt-4 relative z-10 space-y-2">
        {mockResidents.map((r) => {
          const project = projects.find((p) => p.id === r.projectId);
          return (
            <div key={r.id} className="gb-card p-3 flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-gradient-gold flex items-center justify-center text-primary font-bold">
                {r.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm">{r.name}</h3>
                <p className="text-[11px] text-muted-foreground truncate">דירה {r.apartment} · {project?.name} · {r.phone}</p>
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-primary">{r.deals}</div>
                <div className="text-[10px] text-muted-foreground">עסקאות</div>
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}
