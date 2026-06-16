import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const isAllowedPaymentUrl = (value: string | null) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)cardcom\.(solutions|co\.il)$/i.test(url.hostname);
  } catch {
    return false;
  }
};

export default function PaymentCheckout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(true);
  const paymentUrl = params.get("url");
  const dealId = params.get("deal_id");
  const validUrl = useMemo(() => isAllowedPaymentUrl(paymentUrl), [paymentUrl]);
  const dealPath = dealId ? `/resident/deals/${dealId}` : "/resident/deals";

  useEffect(() => {
    if (!validUrl) return;
    const interval = window.setInterval(() => {
      try {
        const href = iframeRef.current?.contentWindow?.location.href;
        if (!href) return;
        if (href.includes("/payment/success") || href.includes("/payment/cancel")) {
          window.clearInterval(interval);
          window.location.href = href;
        }
      } catch {
        // Cross-origin while on Cardcom — expected.
      }
    }, 600);
    return () => window.clearInterval(interval);
  }, [validUrl]);

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="h-14 shrink-0 border-b bg-background/95 backdrop-blur flex items-center justify-between gap-3 px-4">
        <button
          type="button"
          onClick={() => navigate(dealPath, { replace: true })}
          className="h-10 w-10 rounded-full border bg-card flex items-center justify-center active:scale-95 transition-transform"
          aria-label="חזרה לעסקה"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="text-sm font-extrabold leading-tight">תשלום פיקדון מאובטח</h1>
          <p className="text-[11px] text-muted-foreground leading-tight">ההצטרפות תושלם רק לאחר אישור התשלום</p>
        </div>
        {validUrl ? (
          <a
            href={paymentUrl ?? "#"}
            className="h-10 w-10 rounded-full border bg-card flex items-center justify-center active:scale-95 transition-transform"
            aria-label="פתיחה בדף חיצוני"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : <span className="h-10 w-10" />}
      </header>

      <main className="relative flex-1 min-h-0 bg-muted">
        {!validUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <h2 className="text-lg font-extrabold mb-2">קישור התשלום לא תקין</h2>
            <p className="text-sm text-muted-foreground mb-5">חזרו לעסקה ונסו להתחיל תשלום מחדש.</p>
            <Button onClick={() => navigate(dealPath, { replace: true })} className="h-12 rounded-2xl px-8 font-bold">
              חזרה לעסקה
            </Button>
          </div>
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={paymentUrl ?? undefined}
              title="תשלום פיקדון"
              className="absolute inset-0 h-full w-full border-0 bg-background"
              allow="payment *"
              onLoad={() => setLoading(false)}
            />
          </>
        )}
      </main>
    </div>
  );
}