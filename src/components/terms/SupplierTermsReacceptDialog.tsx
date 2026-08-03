import { useState } from "react";
import { TermsContent } from "@/components/terms/TermsContent";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { acceptSupplierTerms } from "@/lib/supplierTerms";

interface Props {
  open: boolean;
  onAccepted: () => void;
  onCancel: () => void;
}

/**
 * Blocks NEW supplier activity (publishing a new offer, paid features) until the
 * updated agreement is accepted. Existing customers, leads and commitments stay
 * fully accessible — this dialog is only rendered on new-activity entry points.
 */
export function SupplierTermsReacceptDialog({ open, onAccepted, onCancel }: Props) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  if (!open) return null;

  const handleAccept = async () => {
    if (!checked) return;
    setSubmitting(true);
    try {
      await acceptSupplierTerms();
      onAccepted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שמירת האישור נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-primary/45 backdrop-blur-[6px] flex items-end md:items-center justify-center p-0 md:p-4" dir="rtl">
      <div className="w-full md:max-w-2xl bg-card rounded-t-[20px] md:rounded-[20px] shadow-[0_20px_44px_-18px_rgba(10,31,61,0.24)] max-h-[92dvh] flex flex-col">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-lg font-extrabold text-primary">עודכן הסכם הספקים</h2>
          <p className="text-xs text-muted-foreground mt-1">
            כדי לפרסם הצעה חדשה יש לאשר את ההסכם המעודכן. טיפול בלקוחות קיימים והשלמת התחייבויות נמשכים כרגיל גם ללא אישור.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <TermsContent audience="supplier" />
        </div>
        <div className="px-6 py-4 space-y-3 border-t border-border">
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>קראתי ואני מאשר את הסכם הספקים המעודכן</span>
          </label>
          <div className="flex gap-2">
            <Button onClick={handleAccept} disabled={!checked || submitting} className="flex-1 h-12">
              {submitting ? "שומר…" : "אישור והמשך"}
            </Button>
            <Button variant="outline" onClick={onCancel} className="h-12">
              לא כעת
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
