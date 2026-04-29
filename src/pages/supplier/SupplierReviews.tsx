import { useEffect, useState } from "react";
import { Star, MessageSquare, AlertCircle } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
};

export default function SupplierReviews() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          if (!cancelled) {
            setError("יש להתחבר כדי לצפות בביקורות.");
            setLoading(false);
          }
          return;
        }

        const email = session.user.email ?? "";
        const byUser = await supabase
          .from("suppliers")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        let sid = byUser.data?.id ?? null;
        if (!sid && email) {
          const byEmail = await supabase
            .from("suppliers")
            .select("id")
            .ilike("email", email)
            .maybeSingle();
          sid = byEmail.data?.id ?? null;
        }

        if (!sid) {
          if (!cancelled) {
            setSupplierId(null);
            setReviews([]);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) setSupplierId(sid);

        const { data: rev, error: revErr } = await supabase
          .from("reviews")
          .select("id, rating, comment, created_at, user_id")
          .eq("supplier_id", sid)
          .order("created_at", { ascending: false });

        if (revErr) throw revErr;
        if (!cancelled) setReviews(rev ?? []);

        const ids = Array.from(new Set((rev ?? []).map((r) => r.user_id)));
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          if (!cancelled && profs) {
            const map: Record<string, string> = {};
            profs.forEach((p) => { map[p.id] = p.full_name || "דייר"; });
            setReviewerNames(map);
          }
        }
      } catch (e) {
        console.error("[SupplierReviews] load error", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה בטעינת הביקורות");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const total = reviews.length;
  const avg = total ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10 : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const denom = total || 1;

  if (loading) {
    return (
      <MobileShell>
        <PageHeader title="ביקורות ומוניטין" subtitle="המוניטין שלך בעיני הדיירים" back={false} />
        <div className="px-5 mt-6 flex items-center justify-center min-h-[40vh]">
          <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  if (error) {
    return (
      <MobileShell>
        <PageHeader title="ביקורות ומוניטין" subtitle="המוניטין שלך בעיני הדיירים" back={false} />
        <div className="px-5 mt-6">
          <div className="gb-card p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="font-bold text-base mb-1">לא ניתן לטעון ביקורות</h2>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  if (!supplierId) {
    return (
      <MobileShell>
        <PageHeader title="ביקורות ומוניטין" subtitle="המוניטין שלך בעיני הדיירים" back={false} />
        <div className="px-5 mt-6">
          <div className="gb-card p-8 text-center">
            <div className="h-14 w-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
              <MessageSquare className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-base mb-1">חסר פרופיל ספק</h3>
            <p className="text-xs text-muted-foreground">השלם את פרטי הספק כדי לקבל ביקורות מדיירים.</p>
          </div>
        </div>
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <PageHeader title="ביקורות ומוניטין" subtitle="המוניטין שלך בעיני הדיירים" back={false} />

      <div className="px-5 -mt-4 relative z-10 mb-4">
        <div className="gb-card p-5 bg-gradient-card text-center">
          <div className="text-5xl font-extrabold text-primary">{avg || "—"}</div>
          <div className="flex items-center justify-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={"h-5 w-5 " + (i <= Math.round(avg) ? "fill-gold text-gold" : "text-muted")}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{total} ביקורות סך הכל</p>

          <div className="mt-4 space-y-1.5">
            {dist.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-[11px]">
                <span className="w-4 text-muted-foreground">{d.star}</span>
                <Star className="h-3 w-3 fill-gold text-gold" />
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-gold" style={{ width: `${(d.count / denom) * 100}%` }} />
                </div>
                <span className="w-6 text-left text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 space-y-3">
        <h2 className="text-sm font-bold">ביקורות אחרונות</h2>

        {reviews.length === 0 ? (
          <div className="gb-card p-8 text-center">
            <div className="h-14 w-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
              <MessageSquare className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-base mb-1">עדיין אין ביקורות לספק זה</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              ביקורות יופיעו כאן לאחר שדיירים שהשתתפו בעסקה ידרגו את השירות.
            </p>
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="gb-card p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-sm">{reviewerNames[r.user_id] || "דייר"}</h3>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={"h-3 w-3 " + (i <= r.rating ? "fill-gold text-gold" : "text-muted")} />
                  ))}
                </div>
              </div>
              {r.comment && (
                <p className="text-xs text-muted-foreground leading-relaxed">{r.comment}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                {new Date(r.created_at).toLocaleDateString("he-IL")}
              </p>
            </div>
          ))
        )}
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}
