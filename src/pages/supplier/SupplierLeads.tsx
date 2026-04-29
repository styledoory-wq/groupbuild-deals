import { Inbox } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";

export default function SupplierLeads() {
  return (
    <MobileShell>
      <PageHeader title="לידים ופניות" subtitle="כל הדיירים שהצטרפו להצעות שלך" back={false} />

      <div className="px-5 -mt-4 relative z-10">
        <div className="gb-card p-8 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <Inbox className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-base mb-1">אין לידים עדיין</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            כשדיירים יביעו עניין בהצעות שלך או ישלמו פיקדון — הם יופיעו כאן.
          </p>
        </div>
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}
