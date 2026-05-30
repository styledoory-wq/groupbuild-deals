import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, ScanLine, Keyboard } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Result =
  | { kind: "idle" }
  | { kind: "looking-up"; code: string }
  | { kind: "eligible"; voucher: VoucherInfo }
  | { kind: "error"; message: string };

type VoucherInfo = {
  id: string; code: string; reference_number: string; status: string;
  deal_id: string;
  deals?: { title: string | null; discounted_price: number | null; original_price: number | null } | null;
  profiles?: { full_name: string | null; project_id: string | null } | null;
};

type RawVoucherInfo = Omit<VoucherInfo, "deals">;

function parseScan(raw: string): string {
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj.c === "string") return obj.c.toUpperCase();
  } catch { /* not JSON */ }
  return raw.trim().toUpperCase();
}

export default function SupplierScan() {
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (mode !== "scan" || result.kind !== "idle") return;

    // Native (iOS/Android) path: use MLKit BarcodeScanner one-shot scan().
    if (Capacitor.isNativePlatform()) {
      let cancelled = false;
      (async () => {
        try {
          const perm = await BarcodeScanner.requestPermissions();
          if (perm.camera !== "granted" && perm.camera !== "limited") {
            toast.error("נדרשת הרשאת מצלמה. עבור לקוד ידני.");
            setMode("manual");
            return;
          }
          const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
          if (cancelled) return;
          const raw = barcodes[0]?.rawValue;
          if (raw) {
            await lookup(parseScan(raw));
          } else {
            setMode("manual");
          }
        } catch {
          if (!cancelled) {
            toast.error("לא ניתן להפעיל מצלמה. השתמש בקוד ידני.");
            setMode("manual");
          }
        }
      })();
      return () => { cancelled = true; };
    }

    // Web fallback: html5-qrcode using getUserMedia.
    const elId = "supplier-scan-region";
    const el = document.getElementById(elId);
    if (!el) return;
    const scanner = new Html5Qrcode(elId, { verbose: false });
    scannerRef.current = scanner;
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded) => {
          if (stopped) return;
          stopped = true;
          try { await scanner.stop(); } catch { /* noop */ }
          await lookup(parseScan(decoded));
        },
        () => { /* ignore scan errors per frame */ }
      )
      .catch(() => {
        toast.error("לא ניתן להפעיל מצלמה. השתמש בקוד ידני.");
        setMode("manual");
      });

    return () => {
      stopped = true;
      (async () => {
        try {
          const s = scanner as unknown as { getState?: () => number };
          const state = typeof s.getState === "function" ? s.getState() : 2;
          if (state === 2 /* SCANNING */ || state === 3 /* PAUSED */) {
            await scanner.stop();
          }
        } catch { /* noop */ }
        try { scanner.clear(); } catch { /* noop */ }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, result.kind]);

  async function lookup(code: string) {
    setResult({ kind: "looking-up", code });
    const { data, error } = await supabase
      .from("vouchers")
      .select("id, code, reference_number, status, deal_id, profiles:user_id(full_name, project_id)")
      .eq("code", code)
      .maybeSingle();
    if (error || !data) { setResult({ kind: "error", message: "שובר לא נמצא" }); return; }
    if (data.status === "redeemed") { setResult({ kind: "error", message: "השובר כבר מומש" }); return; }
    if (data.status === "expired") { setResult({ kind: "error", message: "השובר פג תוקף" }); return; }
    const raw = data as unknown as RawVoucherInfo;
    const { data: deal } = await supabase
      .from("deals")
      .select("title, discounted_price, original_price")
      .eq("id", raw.deal_id)
      .maybeSingle();
    setResult({ kind: "eligible", voucher: { ...raw, deals: deal ?? null } });
  }

  async function confirmRedeem() {
    if (result.kind !== "eligible") return;
    setSubmitting(true);
    const { error } = await supabase.rpc("redeem_voucher", { _code: result.voucher.code });
    setSubmitting(false);
    if (error) {
      toast.error("אישור נכשל: " + (error.message || ""));
      setResult({ kind: "error", message: error.message || "מימוש נכשל" });
      return;
    }
    toast.success("השובר אושר ומומש");
    setResult({ kind: "idle" });
    setManualCode("");
  }

  return (
    <MobileShell>
      <PageHeader title="סריקת שובר" subtitle="סרוק QR או הזן קוד ידני" />
      <div className="px-5 pb-28 space-y-5">
        <div className="flex gap-2">
          <Button
            variant={mode === "scan" ? "default" : "outline"}
            className="flex-1"
            onClick={() => { setResult({ kind: "idle" }); setMode("scan"); }}
          >
            <ScanLine className="h-4 w-4 ml-2" /> סריקה
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            className="flex-1"
            onClick={() => { setResult({ kind: "idle" }); setMode("manual"); }}
          >
            <Keyboard className="h-4 w-4 ml-2" /> קוד ידני
          </Button>
        </div>

        {result.kind === "idle" && mode === "scan" && (
          <div className="rounded-3xl bg-card border border-border/60 overflow-hidden">
            <div id="supplier-scan-region" className="w-full aspect-square bg-black" />
          </div>
        )}

        {result.kind === "idle" && mode === "manual" && (
          <div className="rounded-3xl bg-card border border-border/60 p-5 space-y-3">
            <label className="text-sm font-medium text-foreground">קוד שובר</label>
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="לדוגמה: A1B2C3D4"
              className="font-mono tracking-wider text-center text-lg"
              maxLength={20}
            />
            <Button className="w-full" disabled={manualCode.length < 4} onClick={() => lookup(manualCode)}>
              בדוק זכאות
            </Button>
          </div>
        )}

        {result.kind === "looking-up" && (
          <div className="rounded-3xl bg-card border border-border/60 p-10 text-center">
            <p className="text-muted-foreground">בודק...</p>
          </div>
        )}

        {result.kind === "eligible" && (
          <div className="rounded-3xl bg-emerald-50 border-2 border-emerald-500/40 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
              <h3 className="font-bold text-lg">הדייר זכאי להטבה</h3>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="שם דייר" value={result.voucher.profiles?.full_name ?? "—"} />
              <Row label="פרויקט" value={result.voucher.profiles?.project_id ?? "—"} />
              <Row label="הצעה" value={result.voucher.deals?.title ?? "—"} />
              <Row label="מחיר" value={
                (result.voucher.deals?.discounted_price ?? result.voucher.deals?.original_price)
                  ? `₪${(result.voucher.deals?.discounted_price ?? result.voucher.deals?.original_price)!.toLocaleString("he-IL")}`
                  : "—"
              } />
              <Row label="אסמכתא" value={result.voucher.reference_number} mono />
            </div>
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={submitting} onClick={confirmRedeem}>
              {submitting ? "מאשר..." : "אשר מימוש"}
            </Button>
            <button className="w-full text-xs text-muted-foreground underline" onClick={() => setResult({ kind: "idle" })}>
              ביטול
            </button>
          </div>
        )}

        {result.kind === "error" && (
          <div className="rounded-3xl bg-destructive/5 border-2 border-destructive/30 p-6 text-center space-y-3">
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="font-semibold text-destructive">{result.message}</p>
            <Button variant="outline" onClick={() => setResult({ kind: "idle" })}>נסה שוב</Button>
          </div>
        )}
      </div>
      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-emerald-500/15 last:border-0 pb-2 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold text-foreground text-left ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
