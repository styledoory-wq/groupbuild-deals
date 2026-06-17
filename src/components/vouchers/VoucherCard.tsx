import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock, Hash, ShieldCheck, Tag, Store, ReceiptText } from "lucide-react";
import { ReportIssueDialog } from "@/components/complaints/ReportIssueDialog";

type Voucher = {
  id: string;
  code: string;
  reference_number: string;
  status: string;
  expires_at: string | null;
  redeemed_at: string | null;
  rotation_secret: string;
  deal_title?: string;
  supplier_name?: string;
  category_name?: string;
  price?: number | null;
  original_price?: number | null;
  benefit_price?: number | null;
  savings?: number | null;
  deal_id?: string;
  supplier_id?: string;
};


const STATUS_LABEL: Record<string, string> = {
  eligible: "זכאי להטבה",
  appointment: "נקבעה פגישה",
  measured: "נלקחו מידות",
  ordered: "בהזמנה",
  installed: "הותקן",
  completed: "הושלם",
  redeemed: "מומש",
  expired: "פג תוקף",
  cancelled: "בוטל",
};

// Simple rotating token (refresh visual every 45s). The DB still owns the
// final authority via the `code` + rotation_secret at redeem time.
function buildQrPayload(v: Voucher, tick: number): string {
  // 45s windows since issued. Server-side validation uses code; this rotation
  // is mostly UX/anti-screenshot and is logged.
  return JSON.stringify({ c: v.code, t: tick, r: v.rotation_secret.slice(0, 8) });
}

const formatIls = (value?: number | null) =>
  value != null && Number.isFinite(Number(value))
    ? new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(Number(value))
    : "—";

export function VoucherCard({ voucher }: { voucher: Voucher }) {
  const [tick, setTick] = useState(() => Math.floor(Date.now() / 45000));
  const [secondsLeft, setSecondsLeft] = useState(45 - Math.floor((Date.now() / 1000) % 45));

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setTick(Math.floor(now / 45000));
      setSecondsLeft(45 - Math.floor((now / 1000) % 45));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const isRedeemed = voucher.status === "redeemed";
  const isExpired = voucher.status === "expired";
  const expiresLabel = voucher.expires_at
    ? new Date(voucher.expires_at).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "ללא הגבלה";
  const benefitPrice = voucher.benefit_price ?? voucher.price ?? null;
  const savings = voucher.savings ?? (
    voucher.original_price != null && benefitPrice != null
      ? Math.max(0, Number(voucher.original_price) - Number(benefitPrice))
      : null
  );

  return (
    <div className="rounded-[20px] bg-white p-6 space-y-5 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18),0_2px_4px_-2px_rgba(10,31,61,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-fs-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
            <Store className="h-3 w-3" /> {voucher.supplier_name ?? "ספק"}
          </div>
          <h3 className="text-lg font-bold text-foreground mt-1 leading-tight">{voucher.deal_title ?? "הטבה"}</h3>
          {voucher.category_name && (
            <div className="text-fs-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
              <Tag className="h-3 w-3" /> {voucher.category_name}
            </div>
          )}
        </div>
        <span className={`text-fs-xs font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap shadow-[0_1px_3px_rgba(10,31,61,0.06)] ${
          isRedeemed ? "bg-[#E8F7EC] text-[#2EA85A]"
          : isExpired ? "bg-[#F4F6FA] text-[#6B7280]"
          : "bg-white text-[#1F2937]"
        }`}>
          {STATUS_LABEL[voucher.status] ?? voucher.status}
        </span>
      </div>

      <div className="rounded-[20px] bg-[#0E6B5A] text-white p-4 space-y-3 shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-fs-xs text-primary-foreground/65">מחיר רגיל</div>
            <div className="text-sm line-through text-primary-foreground/75">{formatIls(voucher.original_price)}</div>
          </div>
          <div className="text-left">
            <div className="text-fs-xs text-primary-foreground/65">מחיר הטבה</div>
            <div className="text-2xl font-extrabold text-[#0E6B5A] leading-none">{formatIls(benefitPrice)}</div>
          </div>
        </div>
        <div className="rounded-[16px] bg-white/10 px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-fs-xs text-primary-foreground/70 inline-flex items-center gap-1"><ReceiptText className="h-3 w-3" /> גובה החיסכון</span>
          <span className="font-bold text-primary-foreground">{formatIls(savings)}</span>
        </div>
      </div>

      {!isRedeemed && !isExpired ? (
        <div className="bg-white rounded-[20px] p-5 flex flex-col items-center gap-3 shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]">
          <QRCodeSVG value={buildQrPayload(voucher, tick)} size={200} level="M" includeMargin={false} />
          <div className="flex items-center gap-1.5 text-fs-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>מתחדש בעוד {secondsLeft} שניות</span>
          </div>
        </div>
      ) : (
        <div className="bg-[#F4F6FA] rounded-[20px] p-8 flex flex-col items-center gap-2">
          <CheckCircle2 className={`h-12 w-12 ${isRedeemed ? "text-emerald-600" : "text-muted-foreground"}`} />
          <p className="font-semibold text-foreground">
            {isRedeemed ? "השובר מומש" : "השובר פג תוקף"}
          </p>
          {voucher.redeemed_at && (
            <p className="text-fs-xs text-muted-foreground">
              {new Date(voucher.redeemed_at).toLocaleString("he-IL")}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-[16px] bg-[#F4F6FA] p-3">
          <div className="text-fs-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> קוד מימוש
          </div>
          <div className="font-mono font-bold text-base tracking-wider text-foreground">{voucher.code}</div>
        </div>
        <div className="rounded-[16px] bg-[#F4F6FA] p-3">
          <div className="text-fs-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
            <Hash className="h-3 w-3" /> אסמכתא
          </div>
          <div className="font-mono text-xs text-foreground break-all">{voucher.reference_number}</div>
        </div>
      </div>

      <div className="text-fs-xs text-muted-foreground text-center">
        תוקף מימוש: {expiresLabel}
      </div>
      <div className="flex justify-center pt-1">
        <ReportIssueDialog dealId={voucher.deal_id} supplierId={voucher.supplier_id} voucherId={voucher.id} />
      </div>
    </div>
  );
}
