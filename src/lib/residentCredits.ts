import { computeCreditSplit } from "@/lib/supplierReferral";

export { computeCreditSplit, getCreditSummary, listMyCreditTransactions } from "@/lib/supplierReferral";
export type { CreditSummary, CreditTransaction } from "@/lib/supplierReferral";

/** Format a credit amount in ILS with Hebrew shekel sign. */
export function formatCreditILS(amount: number): string {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("he-IL", {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `−₪${formatted}` : `₪${formatted}`;
}

export type PaymentBreakdownInput = {
  fee: number;
  creditApplied: number;
  cardAmount: number;
  available: number;
};

export type PaymentBreakdownDisplay = {
  feeLabel: string;
  creditLabel: string;
  cardLabel: string;
  availableLabel: string;
  fullyCovered: boolean;
  lines: { key: string; label: string; value: string; emphasize?: boolean }[];
};

/** Build a Hebrew payment-breakdown display for deposit checkout with credit. */
export function buildPaymentBreakdownDisplay({
  fee,
  creditApplied,
  cardAmount,
  available,
}: PaymentBreakdownInput): PaymentBreakdownDisplay {
  const split = computeCreditSplit(fee, available);
  const applied = creditApplied >= 0 ? creditApplied : split.creditApplied;
  const card = cardAmount >= 0 ? cardAmount : split.cardAmount;
  const fullyCovered = card <= 0 && fee > 0;

  const lines: PaymentBreakdownDisplay["lines"] = [
    { key: "fee", label: "דמי השתתפות", value: formatCreditILS(fee) },
    {
      key: "credit",
      label: "קרדיט מנוצל",
      value: applied > 0 ? formatCreditILS(-applied) : formatCreditILS(0),
      emphasize: applied > 0,
    },
    {
      key: "card",
      label: fullyCovered ? "לתשלום בכרטיס" : "יתרה לכרטיס",
      value: formatCreditILS(Math.max(0, card)),
      emphasize: true,
    },
    {
      key: "available",
      label: "יתרת קרדיט זמינה",
      value: formatCreditILS(available),
    },
  ];

  return {
    feeLabel: formatCreditILS(fee),
    creditLabel: formatCreditILS(applied),
    cardLabel: formatCreditILS(Math.max(0, card)),
    availableLabel: formatCreditILS(available),
    fullyCovered,
    lines,
  };
}
