import { useNavigate } from "react-router-dom";
import { UserPlus, LogIn, ArrowLeft, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { setPendingReturnUrl } from "@/lib/returnUrl";

interface SignupPromptSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Feature name shown in the sheet — e.g. "לשמור למועדפים". */
  featureLabel?: string;
  /** URL to return to after successful sign in. Defaults to current path+search. */
  returnUrl?: string;
  /** Called when user chooses "continue as guest" (sheet also closes). */
  onContinueAsGuest?: () => void;
}

/**
 * Bottom sheet shown when a guest tries to use a personal feature.
 * Three clear actions: open account, sign in, continue as guest.
 */
export function SignupPromptSheet({
  open,
  onOpenChange,
  featureLabel,
  returnUrl,
  onContinueAsGuest,
}: SignupPromptSheetProps) {
  const navigate = useNavigate();

  const go = (mode: "signup" | "signin") => {
    const target = returnUrl ?? window.location.pathname + window.location.search;
    setPendingReturnUrl(target);
    onOpenChange(false);
    const params = new URLSearchParams({ mode, returnUrl: target });
    navigate(`/auth/resident?${params.toString()}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        dir="rtl"
        className="rounded-t-3xl border-t border-stone-100 bg-white p-6 pb-[max(env(safe-area-inset-bottom),24px)]"
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="סגור"
          className="absolute top-4 left-4 h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200"
        >
          <X className="h-4 w-4" />
        </button>
        <SheetHeader className="text-right pt-2">
          <SheetTitle className="text-[19px] font-extrabold text-[#0B1220]">
            כדי להשתמש בפיצ׳ר הזה צריך חשבון
          </SheetTitle>
          <SheetDescription className="text-[13px] text-stone-500 leading-relaxed">
            {featureLabel
              ? `החשבון האישי מאפשר לך ${featureLabel} ולנהל את הפרויקט שלך.`
              : "החשבון האישי חינמי — משמור פרויקטים, דילים ומועדפים במקום אחד."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => go("signup")}
            className="w-full h-12 rounded-2xl bg-[#0E6B5A] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-[0_8px_20px_-8px_rgba(14,107,90,0.5)] active:scale-[0.98] transition-transform"
          >
            <UserPlus className="h-4 w-4" />
            פתיחת חשבון
          </button>
          <button
            type="button"
            onClick={() => go("signin")}
            className="w-full h-12 rounded-2xl bg-white border border-[#0E6B5A]/25 text-[#0E6B5A] font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <LogIn className="h-4 w-4" />
            התחברות
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onContinueAsGuest?.();
            }}
            className="w-full h-11 rounded-2xl text-stone-500 font-medium text-[13px] flex items-center justify-center gap-1 hover:text-stone-700"
          >
            המשך כאורח
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
