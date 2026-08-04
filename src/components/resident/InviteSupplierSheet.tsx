import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Check, Copy, Link2, Loader2, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  buildShareText,
  getOrCreateReferralCode,
  type ReferralInfo,
} from "@/lib/supplierReferral";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function InviteSupplierSheet({ open, onOpenChange }: Props) {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getOrCreateReferralCode();
        if (!cancelled) setInfo(data);
      } catch (e) {
        console.warn("[InviteSupplierSheet] load failed", e);
        if (!cancelled) {
          toast.error("לא הצלחנו לטעון את קוד ההפניה");
          setInfo(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const link = info?.referral_link ?? "";
  const code = info?.referral_code ?? "";
  const shareText = link ? buildShareText(link) : "";

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success("הקישור הועתק");
      setTimeout(() => setCopiedLink(false), 1500);
    } catch {
      toast.error("לא הצלחנו להעתיק");
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success("הקוד הועתק");
      setTimeout(() => setCopiedCode(false), 1500);
    } catch {
      toast.error("לא הצלחנו להעתיק");
    }
  };

  const nativeShare = async () => {
    if (!link || !navigator.share) return;
    try {
      await navigator.share({
        title: "הזמנה ל־GroupBuild",
        text: shareText,
        url: link,
      });
    } catch {
      /* cancelled */
    }
  };

  const waHref = link
    ? `https://wa.me/?text=${encodeURIComponent(shareText)}`
    : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8 pt-4" dir="rtl">
        <SheetHeader className="text-right">
          <SheetTitle className="text-base font-extrabold text-[#1F2937]">
            הזמנת בעל מקצוע
          </SheetTitle>
          <p className="text-xs text-[#6B7280] mt-1">
            שתפו את הקישור האישי שלכם — כשהספק יאושר תקבלו קרדיט.
          </p>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-[#0E6B5A]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-2xl bg-[#F7F5F0] border border-[#E5E5EA] px-4 py-3 text-right">
              <div className="text-[11px] font-medium text-[#8E8E93] mb-1">קוד ההפניה שלי</div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[18px] font-bold tracking-[0.12em] text-[#0E6B5A] tabular-nums font-mono">
                  {code || "—"}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  disabled={!code}
                  className="h-9 w-9 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center active:scale-95 transition disabled:opacity-40"
                  aria-label="העתק קוד"
                >
                  {copiedCode ? (
                    <Check className="h-4 w-4 text-[#0E6B5A]" />
                  ) : (
                    <Copy className="h-4 w-4 text-[#1F2937]" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer noopener"
                aria-disabled={!waHref}
                className={`flex flex-col items-center gap-1.5 active:scale-[0.95] transition-transform ${!waHref ? "pointer-events-none opacity-40" : ""}`}
              >
                <span
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white shadow-[0_3px_10px_-3px_rgba(10,31,61,0.25)]"
                  style={{ backgroundColor: "#25D366" }}
                  aria-hidden
                >
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-bold text-[#1F2937]">WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={copyLink}
                disabled={!link}
                className="tap-target flex flex-col items-center gap-1.5 active:scale-[0.95] transition-transform disabled:opacity-40"
              >
                <span className="h-12 w-12 rounded-full flex items-center justify-center bg-[#F4F6FA] text-[#1F2937] shadow-[0_3px_10px_-3px_rgba(10,31,61,0.15)]">
                  {copiedLink ? (
                    <Check className="h-5 w-5 text-[#0E6B5A]" />
                  ) : (
                    <Link2 className="h-5 w-5" />
                  )}
                </span>
                <span className="text-[11px] font-bold text-[#1F2937]">
                  {copiedLink ? "הועתק" : "העתק קישור"}
                </span>
              </button>

              {typeof navigator !== "undefined" && "share" in navigator ? (
                <button
                  type="button"
                  onClick={nativeShare}
                  disabled={!link}
                  className="tap-target flex flex-col items-center gap-1.5 active:scale-[0.95] transition-transform disabled:opacity-40"
                >
                  <span className="h-12 w-12 rounded-full flex items-center justify-center bg-[#0E6B5A] text-white shadow-[0_3px_10px_-3px_rgba(14,107,90,0.35)]">
                    <Share2 className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-bold text-[#1F2937]">שיתוף</span>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-1.5 opacity-0 pointer-events-none" aria-hidden>
                  <span className="h-12 w-12" />
                  <span className="text-[11px]">.</span>
                </div>
              )}
            </div>

            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                onClick={nativeShare}
                disabled={!link}
                className="mt-6 w-full h-11 rounded-2xl bg-[#0E6B5A] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                <Share2 className="h-4 w-4" /> שיתוף מהמכשיר
              </button>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
