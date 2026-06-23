import { useState } from "react";
import { Copy, Check, Smartphone, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SupplierPaymentInfo {
  business_name?: string | null;
  bit_phone?: string | null;
  bank_account_holder?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_number?: string | null;
  note?: string | null;
}

interface Props {
  depositId: string;
  amount: number;
  supplierPaymentInfo: SupplierPaymentInfo | null;
  onDeclared?: () => void;
}

const ils = (v: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v);

export function PaymentInstructionsCard({ depositId, amount, supplierPaymentInfo, onDeclared }: Props) {
  const hasBit = Boolean(supplierPaymentInfo?.bit_phone);
  const hasBank = Boolean(
    supplierPaymentInfo?.bank_account_number ||
      supplierPaymentInfo?.bank_name ||
      supplierPaymentInfo?.bank_account_holder,
  );
  const [method, setMethod] = useState<"bit" | "bank">(hasBit ? "bit" : "bank");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const copy = async (key: string, value: string | null | undefined) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1400);
      toast.success("הועתק");
    } catch {
      toast.error("ההעתקה נכשלה");
    }
  };

  const handleDeclare = async () => {
    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("declare_deposit_paid", {
        _deposit_id: depositId,
        _method: method,
      });
      if (error) throw error;
      toast.success("הפיקדון סומן כשולם — ממתין לאישור הספק");
      onDeclared?.();
    } catch (e) {
      console.error("[declare_deposit_paid]", e);
      toast.error(e instanceof Error ? e.message : "אירעה שגיאה, נסה שנית");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#EAF2FF] p-4 text-right">
        <div className="text-[11px] font-semibold text-[#0E6B5A]">סכום להעברה</div>
        <div className="text-[26px] font-extrabold text-[#0F172A] mt-0.5">{ils(amount)}</div>
        {supplierPaymentInfo?.business_name && (
          <div className="text-[12px] text-muted-foreground mt-1">לטובת: {supplierPaymentInfo.business_name}</div>
        )}
      </div>

      {(hasBit || hasBank) && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!hasBit}
            onClick={() => setMethod("bit")}
            className={
              "rounded-2xl p-3 text-center transition-all flex flex-col items-center gap-1 " +
              (method === "bit"
                ? "bg-[#0E6B5A] text-white shadow-[0_8px_20px_-8px_rgba(14,107,90,0.5)]"
                : "bg-white text-[#1F2937] border border-border") +
              (!hasBit ? " opacity-40 cursor-not-allowed" : "")
            }
          >
            <Smartphone className="h-5 w-5" strokeWidth={2.2} />
            <span className="text-[13px] font-bold">ביט</span>
          </button>
          <button
            type="button"
            disabled={!hasBank}
            onClick={() => setMethod("bank")}
            className={
              "rounded-2xl p-3 text-center transition-all flex flex-col items-center gap-1 " +
              (method === "bank"
                ? "bg-[#0E6B5A] text-white shadow-[0_8px_20px_-8px_rgba(14,107,90,0.5)]"
                : "bg-white text-[#1F2937] border border-border") +
              (!hasBank ? " opacity-40 cursor-not-allowed" : "")
            }
          >
            <Building2 className="h-5 w-5" strokeWidth={2.2} />
            <span className="text-[13px] font-bold">העברה בנקאית</span>
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-white border border-border p-4 space-y-2 text-right">
        {method === "bit" && hasBit && (
          <Row
            label="מספר טלפון לביט"
            value={supplierPaymentInfo?.bit_phone}
            copiedKey={copiedKey}
            keyName="bit_phone"
            onCopy={copy}
            ltr
          />
        )}
        {method === "bank" && hasBank && (
          <>
            <Row label="ע״ש" value={supplierPaymentInfo?.bank_account_holder} copiedKey={copiedKey} keyName="holder" onCopy={copy} />
            <Row label="בנק" value={supplierPaymentInfo?.bank_name} copiedKey={copiedKey} keyName="bank" onCopy={copy} />
            <Row label="סניף" value={supplierPaymentInfo?.bank_branch} copiedKey={copiedKey} keyName="branch" onCopy={copy} ltr />
            <Row label="חשבון" value={supplierPaymentInfo?.bank_account_number} copiedKey={copiedKey} keyName="account" onCopy={copy} ltr />
          </>
        )}
        {!hasBit && !hasBank && (
          <p className="text-[13px] text-muted-foreground">
            הספק לא הזין עדיין פרטי תשלום. אנא צור קשר עם הספק.
          </p>
        )}
        {supplierPaymentInfo?.note && (
          <div className="pt-2 mt-2 border-t border-border">
            <div className="text-[11px] font-bold text-muted-foreground mb-1">הערות מהספק</div>
            <Textarea value={supplierPaymentInfo.note} readOnly rows={2} className="text-[12px] rounded-xl resize-none" />
          </div>
        )}
      </div>

      <Button
        onClick={handleDeclare}
        disabled={submitting}
        className="w-full h-12 rounded-2xl bg-[#0E6B5A] hover:bg-[#0E6B5A]/95 text-white font-extrabold text-[14px]"
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "סימנתי שהעברתי"}
      </Button>
      <p className="text-[11px] text-center text-muted-foreground leading-tight">
        אחרי שתסמן, הספק יקבל התראה ויאשר את הקבלה. רק לאחר אישורו ההצטרפות שלך תושלם.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  copiedKey,
  keyName,
  onCopy,
  ltr,
}: {
  label: string;
  value: string | null | undefined;
  copiedKey: string | null;
  keyName: string;
  onCopy: (k: string, v: string | null | undefined) => void;
  ltr?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => onCopy(keyName, value)}
        className="h-7 w-7 rounded-full bg-[#F4F6FA] flex items-center justify-center text-[#0E6B5A] shrink-0"
        aria-label="העתק"
      >
        {copiedKey === keyName ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <div className="flex-1 min-w-0 text-right">
        <div className="text-[10px] font-semibold text-muted-foreground">{label}</div>
        <div className={"text-[14px] font-bold text-[#0F172A] truncate " + (ltr ? "ltr text-left" : "")} dir={ltr ? "ltr" : undefined}>
          {value}
        </div>
      </div>
    </div>
  );
}
