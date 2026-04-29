import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  supplierId: string; // UUID of suppliers row
  dealId: string;
  dealCompleted: boolean; // only show the form when deal status = completed
  onSubmitted?: () => void;
}

/**
 * Review form — shown only after a deal is completed.
 * RLS in the DB ensures only users who paid into the deal can insert.
 */
export function ReviewForm({ supplierId, dealId, dealCompleted, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<{ rating: number; comment: string | null } | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      setAuthed(true);
      const { data } = await supabase
        .from("reviews")
        .select("rating,comment")
        .eq("user_id", session.session.user.id)
        .eq("deal_id", dealId)
        .maybeSingle();
      if (data) {
        setExisting(data);
        setRating(data.rating);
        setComment(data.comment ?? "");
      }
    })();
  }, [dealId]);

  if (!dealCompleted) return null;
  if (!authed) return null;

  const submit = async () => {
    if (rating < 1) {
      toast.error("יש לבחור דירוג מ-1 עד 5 כוכבים");
      return;
    }
    setSubmitting(true);
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) {
      toast.error("יש להתחבר");
      setSubmitting(false);
      return;
    }
    const payload = {
      user_id: uid,
      supplier_id: supplierId,
      deal_id: dealId,
      rating,
      comment: comment.trim() || null,
    };
    const { error } = existing
      ? await supabase.from("reviews").update({ rating, comment: payload.comment }).eq("user_id", uid).eq("deal_id", dealId)
      : await supabase.from("reviews").insert(payload);
    setSubmitting(false);
    if (error) {
      // RLS will reject if the user did not pay into the deal
      toast.error(error.message.includes("row-level") ? "רק מי שהשתתף בעסקה יכול לדרג" : error.message);
      return;
    }
    setExisting({ rating, comment: payload.comment });
    toast.success(existing ? "הדירוג עודכן" : "תודה על הדירוג!");
    onSubmitted?.();
  };

  return (
    <section className="gb-card p-5">
      <h2 className="text-sm font-bold text-foreground mb-1">
        {existing ? "עדכון הביקורת שלך" : "השאר דירוג וחוות דעת"}
      </h2>
      <p className="text-[11px] text-muted-foreground mb-4">
        הדירוג שלך משפיע ישירות על הציון הציבורי של הספק.
      </p>

      <div className="flex items-center gap-1.5 mb-4 justify-center" dir="ltr">
        {[1, 2, 3, 4, 5].map((i) => {
          const active = (hover || rating) >= i;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(i)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`${i} כוכבים`}
            >
              <Star className={cn("h-8 w-8 transition-colors", active ? "fill-gold text-gold" : "text-muted")} />
            </button>
          );
        })}
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="ספר על החוויה שלך עם הספק (אופציונלי)..."
        rows={4}
        className="resize-none"
      />

      <Button
        onClick={submit}
        disabled={submitting || rating < 1}
        className="w-full h-11 mt-3 rounded-xl bg-gradient-gold text-primary font-bold shadow-gold"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? "עדכון ביקורת" : "שלח דירוג"}
      </Button>
    </section>
  );
}
