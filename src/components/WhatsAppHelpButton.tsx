import { normalizeWhatsappUrl } from "@/lib/whatsapp";
import { DEFAULT_SUPPORT_WHATSAPP, useSupportWhatsapp } from "@/hooks/useSupportContact";

/** Support number used for the floating help button across the app (fallback only). */
export const SUPPORT_WHATSAPP = DEFAULT_SUPPORT_WHATSAPP;

interface Props {
  /** Override default position offset from the bottom edge (px). */
  bottomOffset?: number;
  /** Pre-filled WhatsApp message. */
  message?: string;
  className?: string;
}

/**
 * Floating WhatsApp help button — small, non-intrusive, brand-aligned.
 * Sits above the BottomNav + iOS safe-area, never overlaps primary CTAs.
 */
export function WhatsAppHelpButton({
  bottomOffset,
  message = "היי, אני צריך/ה עזרה ב-GroupBuild",
  className = "",
}: Props) {
  const number = useSupportWhatsapp();
  const url = normalizeWhatsappUrl(number);
  if (!url) return null;
  const href = `${url}?text=${encodeURIComponent(message)}`;

  // Default: sit above the floating BottomNav (var(--nav-h)) + safe area.
  const bottomStyle =
    bottomOffset != null
      ? { bottom: `calc(env(safe-area-inset-bottom) + ${bottomOffset}px)` }
      : { bottom: "calc(env(safe-area-inset-bottom) + var(--nav-h, 72px) + 16px)" };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="צריך עזרה? פתח וואטסאפ"
      className={`fixed left-4 z-40 inline-flex items-center gap-2 pl-3 pr-3.5 h-11 rounded-full
        bg-[#25D366] text-white text-[13px] font-bold tracking-tight
        shadow-[0_10px_24px_-8px_rgba(37,211,102,0.55),0_2px_6px_-2px_rgba(10,31,61,0.18)]
        ring-1 ring-white/20
        transition-[transform,box-shadow,filter] duration-200 ease-out
        hover:brightness-105 active:scale-[0.96] ${className}`}
      style={bottomStyle}
      dir="rtl"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="currentColor" aria-hidden>
        <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.554-5.338 11.89-11.893 11.89a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.298-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.298-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
      </svg>
      <span>צריך עזרה?</span>
    </a>
  );
}
