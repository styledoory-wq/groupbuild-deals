import { useState } from "react";
import { Copy, Check, Smartphone, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PARTICIPATION_FEE_DESCRIPTION, PARTICIPATION_FEE_LABEL } from "@/lib/platformFees";

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
  const hasSupplierPay = hasBit || hasBank;
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
        _method: hasSupplierPay ? method : "manual",
      });
      if (error) throw error;
      toast.success("דמי ההשתתפות סומנו כשולמו — ממתין לאישור");
      onDeclared?.();
    } catch (e) {
      console.error("[declare_deposit_paid]", e);
      toast.error(e instanceof Error ? e.message : "אירעה שגיאה, נסה שנית");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl bg-[#EAF2FF] p-4 text-right">
        <div className="text-[11px] font-semibold text-[#0E6B5A]">{PARTICIPATION_FEE_LABEL}</div>
        <div className="text-[26px] font-extrabold text-[#0F172A] mt-0.5">{ils(amount)}</div>
        <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
          {PARTICIPATION_FEE_DESCRIPTION}
        </p>
        {supplierPaymentInfo?.business_name && hasSupplierPay && (
          <div className="text-[12px] text-muted-foreground mt-1">לטובת: {supplierPaymentInfo.business_name}</div>
        )}
      </div>

      {!hasSupplierPay && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-[13px] leading-relaxed text-foreground">
          התשלום מתבצע דרך מסך הסליקה של הפלטפורמה (Stripe). אם לא נפתח מסך תשלום —
          נסו שוב מ״המשך לתשלום״ בעמוד העסקה, או פנו לתמיכה.
        </div>
      )}

      {hasSupplierPay && (
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

      {hasSupplierPay && method === "bit" && hasBit && (
        <div className="rounded-2xl border border-border p-4 space-y-2">
          <div className="text-[12px] font-bold">מספר ביט לתשלום</div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-extrabold text-[16px] gb-num" dir="ltr">
              {supplierPaymentInfo?.bit_phone}
            </span>
            <button
              type="button"
              onClick={() => void copy("bit", supplierPaymentInfo?.bit_phone)}
              className="h-9 px-3 rounded-xl bg-muted text-xs font-bold flex items-center gap-1"
            >
              {copiedKey === "bit" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              העתק
            </button>
          </div>
        </div>
      )}

      {hasSupplierPay && method === "bank" && hasBank && (
        <div className="rounded-2xl border border-border p-4 space-y-2 text-[13px]">
          {supplierPaymentInfo?.bank_account_holder && (
            <Row label="שם בעל החשבון" value={supplierPaymentInfo.bank_account_holder} onCopy={() => void copy("holder", supplierPaymentInfo.bank_account_holder)} copied={copiedKey === "holder"} />
          )}
          {supplierPaymentInfo?.bank_name && (
            <Row label="בנק" value={supplierPaymentInfo.bank_name} onCopy={() => void copy("bank", supplierPaymentInfo.bank_name)} copied={copiedKey === "bank"} />
          )}
          {supplierPaymentInfo?.bank_branch && (
            <Row label="סניף" value={supplierPaymentInfo.bank_branch} onCopy={() => void copy("branch", supplierPaymentInfo.bank_branch)} copied={copiedKey === "branch"} />
          )}
          {supplierPaymentInfo?.bank_account_number && (
            <Row label="מספר חשבון" value={supplierPaymentInfo.bank_account_number} onCopy={() => void copy("account", supplierPaymentInfo.bank_account_number)} copied={copiedKey === "account"} />
          )}
          {supplierPaymentInfo?.note && (
            <p className="text-[12px] text-muted-foreground pt-1">{supplierPaymentInfo.note}</p>
          )}
        </div>
      )}

      <Button
        type="button"
        onClick={() => void handleDeclare()}
        disabled={submitting}
        className="w-full h-12 rounded-2xl bg-[#0E6B5A] font-extrabold"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "סימנתי ששילמתי"}
      </Button>
    </div>
  );
}

function Row({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="font-bold">{value}</div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="h-8 px-2.5 rounded-lg bg-muted text-[11px] font-bold flex items-center gap-1"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        העתק
      </button>
    </div>
  );
}
