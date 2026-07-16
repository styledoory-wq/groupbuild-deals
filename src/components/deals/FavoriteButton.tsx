import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleFavorite } from "@/lib/favorites";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useGuestGate } from "@/hooks/useGuestGate";

export function FavoriteButton({
  dealId,
  initial = false,
  className,
  onChange,
}: {
  dealId: string;
  initial?: boolean;
  className?: string;
  onChange?: (isFavorite: boolean) => void;
}) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const { requireAuth } = useGuestGate();
  useEffect(() => setOn(initial), [initial]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) return;
      const { data, error } = await supabase
        .from("favorites")
        .select("deal_id")
        .eq("user_id", uid)
        .eq("deal_id", dealId)
        .maybeSingle();
      if (!cancelled && !error) setOn(Boolean(data));
    })();
    return () => { cancelled = true; };
  }, [dealId]);

  const handle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      requireAuth("לשמור הצעות למועדפים", () => {
        /* user will return to page and click again after signing in */
      });
      return;
    }
    const next = !on;
    setOn(next);
    setBusy(true);
    try {
      await toggleFavorite(dealId, next);
      onChange?.(next);
    } catch (err) {
      setOn(!next);
      toast.error(err instanceof Error ? err.message : "פעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={on ? "הסר ממועדפים" : "הוסף למועדפים"}
      className={cn(
        "h-9 w-9 rounded-full bg-white/90 backdrop-blur border border-[#ECEEF2] flex items-center justify-center shadow-[0_2px_8px_rgba(10,31,61,0.08)] hover:scale-105 transition-transform",
        className,
      )}
    >
      <Heart
        className={cn("h-4 w-4 transition-colors", on ? "text-[#E11D48] fill-[#E11D48]" : "text-[#6B7280]")}
        strokeWidth={on ? 0 : 2.2}
      />
    </button>
  );
}
