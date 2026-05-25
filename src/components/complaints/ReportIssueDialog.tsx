import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  dealId?: string | null;
  supplierId?: string | null;
  voucherId?: string | null;
  trigger?: React.ReactNode;
};

const TYPES = [
  { v: "no_show", l: "הספק לא הגיע / לא ענה" },
  { v: "price_mismatch", l: "מחיר/תנאים שונים ממה שפורסם" },
  { v: "quality", l: "בעיית איכות" },
  { v: "service", l: "שירות לא תקין" },
  { v: "other", l: "אחר" },
];

export function ReportIssueDialog({ dealId, supplierId, voucherId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!type || desc.trim().length < 5) { toast.error("יש לבחור סוג ולהוסיף תיאור קצר"); return; }
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) { toast.error("נדרשת התחברות"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("complaints").insert({
      user_id: s.session.user.id,
      deal_id: dealId ?? null,
      supplier_id: supplierId ?? null,
      voucher_id: voucherId ?? null,
      issue_type: type,
      description: desc.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error("שליחה נכשלה"); return; }
    toast.success("הדיווח התקבל. נחזור אליך.");
    setOpen(false); setType(""); setDesc("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <AlertTriangle className="h-4 w-4" /> דווח על בעיה
          </Button>
        )}
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>דיווח על בעיה</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="בחר סוג בעיה" /></SelectTrigger>
            <SelectContent>
              {TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="ספר לנו מה קרה (חובה)"
            rows={4}
            maxLength={1000}
          />
          <Button className="w-full" disabled={submitting} onClick={submit}>
            {submitting ? "שולח..." : "שלח דיווח"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
