import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Copy, Check, Facebook, Share2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { trackSupplierEvent } from "@/lib/analytics";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplierId: string;
  businessName: string;
  url: string;
}

/**
 * Share sheet for a public supplier card.
 * Channels: WhatsApp, Facebook, Telegram, Copy Link.
 * Each channel fires a `share` analytics event with meta.channel.
 */
export function ShareBusinessSheet({ open, onOpenChange, supplierId, businessName, url }: Props) {
  const [copied, setCopied] = useState(false);
  const text = `${businessName} — כרטיס עסק ב־GroupBuild`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const track = (channel: string) => {
    void trackSupplierEvent(supplierId, "share", { channel });
  };

  const channels: { key: string; label: string; href: string; Icon: React.ComponentType<{ className?: string }>; color: string }[] = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      Icon: MessageCircle,
      color: "#25D366",
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      Icon: Facebook,
      color: "#1877F2",
    },
    {
      key: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      Icon: Send,
      color: "#26A5E4",
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("copy_link");
      toast.success("הקישור הועתק");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("לא הצלחנו להעתיק");
    }
  };

  const nativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: businessName, text, url });
        track("native");
      }
    } catch { /* cancelled */ }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8 pt-4">
        <SheetHeader className="text-right">
          <SheetTitle className="text-base font-extrabold text-[#1F2937]">שתף את העסק</SheetTitle>
          <p className="text-xs text-[#6B7280] mt-1">הזמינו חברים ובעלי מקצוע להכיר את {businessName}</p>
        </SheetHeader>

        <div className="grid grid-cols-4 gap-3 mt-5">
          {channels.map((c) => (
            <a
              key={c.key}
              href={c.href}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => track(c.key)}
              className="flex flex-col items-center gap-1.5 active:scale-[0.95] transition-transform"
            >
              <span
                className="h-12 w-12 rounded-full flex items-center justify-center text-white shadow-[0_3px_10px_-3px_rgba(10,31,61,0.25)]"
                style={{ backgroundColor: c.color }}
                aria-hidden
              >
                <c.Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-bold text-[#1F2937]">{c.label}</span>
            </a>
          ))}
          <button
            type="button"
            onClick={copy}
            className="flex flex-col items-center gap-1.5 active:scale-[0.95] transition-transform"
          >
            <span className="h-12 w-12 rounded-full flex items-center justify-center bg-[#F4F6FA] text-[#1F2937] shadow-[0_3px_10px_-3px_rgba(10,31,61,0.15)]">
              {copied ? <Check className="h-5 w-5 text-[#0E6B5A]" /> : <Copy className="h-5 w-5" />}
            </span>
            <span className="text-[11px] font-bold text-[#1F2937]">{copied ? "הועתק" : "העתק"}</span>
          </button>
        </div>

        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            type="button"
            onClick={nativeShare}
            className="mt-6 w-full h-11 rounded-2xl bg-[#0E6B5A] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Share2 className="h-4 w-4" /> שיתוף מהמכשיר
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
}
