import { Headphones } from "lucide-react";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";

export const SUPPORT_WHATSAPP = "052-624-7941";

interface Props {
  message?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Small round support button — sits inline next to the bell / docs icons.
 * Opens WhatsApp directly with a pre-filled message.
 */
export function SupportButton({
  message = "היי, אני צריך/ה עזרה ב-GroupBuild",
  className = "",
  ariaLabel = "תמיכה",
}: Props) {
  const base = normalizeWhatsappUrl(SUPPORT_WHATSAPP);
  if (!base) return null;
  const href = `${base}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`h-10 w-10 rounded-full bg-white border border-[#ECEEF2] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(10,31,61,0.06)] active:scale-95 transition-transform ${className}`}
    >
      <Headphones className="h-[18px] w-[18px] text-[#0A1F3D]" strokeWidth={2} />
    </a>
  );
}
