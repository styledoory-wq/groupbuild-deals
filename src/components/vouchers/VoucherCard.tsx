import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock, Hash, ShieldCheck } from "lucide-react";
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
  price?: number | null;
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

  return (
    <div className="rounded-3xl bg-card border border-border/60 p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-fs-xs uppercase tracking-wider text-muted-foreground">{voucher.supplier_name ?? "ספק"}</div>
          <h3 className="text-lg font-bold text-foreground mt-1 leading-tight">{voucher.deal_title ?? "הטבה"}</h3>
        </div>
        <span className={`text-fs-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
          isRedeemed ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
          : isExpired ? "bg-muted text-muted-foreground border border-border"
          : "bg-gold/15 text-amber-700 border border-gold/30"
        }`}>
          {STATUS_LABEL[voucher.status] ?? voucher.status}
        </span>
      </div>

      {!isRedeemed && !isExpired ? (
        <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3 border border-border">
          <QRCodeSVG value={buildQrPayload(voucher, tick)} size={200} level="M" includeMargin={false} />
          <div className="flex items-center gap-1.5 text-fs-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>מתחדש בעוד {secondsLeft} שניות</span>
          </div>
        </div>
      ) : (
        <div className="bg-muted/40 rounded-2xl p-8 flex flex-col items-center gap-2 border border-border">
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
        <div className="rounded-xl bg-muted/30 border border-border p-3">
          <div className="text-fs-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> קוד מימוש
          </div>
          <div className="font-mono font-bold text-base tracking-wider text-foreground">{voucher.code}</div>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border p-3">
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
