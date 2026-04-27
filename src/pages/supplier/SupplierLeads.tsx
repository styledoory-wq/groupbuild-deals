import { MessageSquare, Phone, Mail } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";

const mockLeads = [
  { id: "l1", name: "נועה כהן", apartment: "ב/14", phone: "050-1234567", deal: "שדרוג מטבח פרימיום", status: "שילם פיקדון", color: "success" },
  { id: "l2", name: "אבי שמש", apartment: "א/7", phone: "052-9876543", deal: "שדרוג מטבח פרימיום", status: "ממתין לפיקדון", color: "gold" },
  { id: "l3", name: "מירב בן-דוד", apartment: "ג/22", phone: "054-5551234", deal: "מערכת מיזוג מרכזית", status: "שילם פיקדון", color: "success" },
  { id: "l4", name: "יאיר אזולאי", apartment: "ב/3", phone: "053-7778888", deal: "פרקט אלון", status: "ממתין לפיקדון", color: "gold" },
];

export default function SupplierLeads() {
  const { user } = useApp();

  return (
    <MobileShell>
      <PageHeader title="לידים ופניות" subtitle="כל הדיירים שהצטרפו להצעות שלך" back={false} />

      <div className="px-5 -mt-4 relative z-10 space-y-2">
        {mockLeads.map((l) => (
          <div key={l.id} className="gb-card p-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-full bg-gradient-gold flex items-center justify-center text-primary font-bold shrink-0">
                {l.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-sm">{l.name}</h3>
                  <span className={
                    "text-[10px] font-bold px-2 py-1 rounded-full " +
                    (l.color === "success" ? "bg-success/10 text-success" : "bg-gold/15 text-primary")
                  }>{l.status}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">דירה {l.apartment} · {l.deal}</p>
                <div className="flex items-center gap-2 mt-2">
                  <a href={`tel:${l.phone}`} className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-medium">
                    <Phone className="h-3 w-3" /> חיוג
                  </a>
                  <button className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-muted text-foreground font-medium">
                    <MessageSquare className="h-3 w-3" /> הודעה
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}
