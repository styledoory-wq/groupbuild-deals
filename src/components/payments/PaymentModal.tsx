import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface PaymentModalProps {
  open: boolean;
  paymentUrl: string | null;
  onClose: () => void;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Embedded Cardcom payment via iframe.
 * Cardcom's LowProfile page redirects (inside the iframe) to /payment/success
 * or /payment/cancel on completion. We watch the iframe URL and react.
 *
 * Bit: once enabled on the Cardcom terminal, appears automatically inside the iframe.
 */
export function PaymentModal({ open, paymentUrl, onClose, onSuccess, onCancel }: PaymentModalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!open || !paymentUrl) return;
    const interval = window.setInterval(() => {
      try {
        const href = iframeRef.current?.contentWindow?.location.href;
        if (!href) return;
        if (href.includes("/payment/success")) {
          window.clearInterval(interval);
          onSuccess?.();
          onClose();
        } else if (href.includes("/payment/cancel")) {
          window.clearInterval(interval);
          onCancel?.();
          onClose();
        }
      } catch {
        // Cross-origin while on Cardcom — expected, ignore.
      }
    }, 600);
    return () => window.clearInterval(interval);
  }, [open, paymentUrl, onSuccess, onCancel, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl w-screen sm:w-[95vw] h-[100dvh] sm:h-[85vh] max-h-[100dvh] p-0 gap-0 overflow-hidden flex flex-col rounded-none sm:rounded-lg">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base text-right">תשלום פיקדון מאובטח</DialogTitle>
        </DialogHeader>
        <div className="relative flex-1 min-h-0 bg-muted">
          {paymentUrl ? (
            <iframe
              ref={iframeRef}
              src={paymentUrl}
              title="Cardcom Payment"
              className="absolute inset-0 w-full h-full border-0"
              allow="payment *"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
