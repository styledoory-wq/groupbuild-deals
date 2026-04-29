import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Tag, Inbox, BadgeCheck } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { describeOffer, ils, type OfferTier, type OfferType } from "@/lib/offerPricing";

type InterestRow = {
  id: string;
  deal_id: string;
  status: string;
  deposit_required: boolean;
  deposit_amount: number;
  deposit_status: string;
  created_at: string;
};

type DealRow = {
  id: string;
  title: string;
  status: string;
  offer_type: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  tiers: OfferTier[] | null;
};

export default function MyOffers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<{ interest: InterestRow; deal: DealRow | null; count: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          if (!cancelled) {
            setError("יש להתחבר כדי לראות את ההצעות שלך.");
            setLoading(false);
          }
          return;
        }
        const { data: ints, error: iErr } = await supabase
          .from("deal_interests")
          .select("id,deal_id,status,deposit_required,deposit_amount,deposit_status,created_at")
          .eq("user_id", session.session.user.id)
          .order("created_at", { ascending: false });
        if (iErr) throw iErr;
        const list = (ints ?? []) as InterestRow[];

        const dealIds = Array.from(new Set(list.map((i) => i.deal_id)));
        let dealsMap: Record<string, DealRow> = {};
        if (dealIds.length) {
          const { data: deals } = await supabase
            .from("deals")
            .select("id,title,status,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers")
            .in("id", dealIds);
          (deals ?? []).forEach((d) => { dealsMap[(d as DealRow).id] = d as DealRow; });
        }

        const counts: Record<string, number> = {};
        await Promise.all(
          dealIds.map(async (id) => {
            const { data } = await supabase.rpc("get_deal_interest_count", { _deal_id: id });
            counts[id] = typeof data === "number" ? data : 0;
          }),
        );

        if (!cancelled) {
          setItems(
            list.map((interest) => ({
              interest,
              deal: dealsMap[interest.deal_id] ?? null,
              count: counts[interest.deal_id] ?? 0,
            })),
          );
        }
      } catch (e) {
        console.error("[MyOffers] load error", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה בטעינה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <MobileShell>
      <PageHeader title="ההצעות שלי" subtitle="הצעות שהצטרפת אליהן" back={false} />

      <div className="px-5 -mt-4 relative z-10 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="gb-card p-6 text-center">
            <p className="text-sm text-destructive font-bold">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="gb-card p-8 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-base mb-1">עדיין לא הצטרפת להצעות</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              דפדף בעסקאות הקבוצתיות של הפרויקט והצטרף — כל מצטרף משפר את ההנחה לכולם.
            </p>
            <Link to="/resident/deals">
              <Button className="rounded-xl">לעסקאות הפעילות</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(({ interest, deal, count }) => {
              if (!deal) {
                return (
                  <div key={interest.id} className="gb-card p-4 opacity-70">
                    <p className="text-sm text-muted-foreground">הצעה זו אינה זמינה יותר</p>
                  </div>
                );
              }
              const offerType = ((deal.offer_type as OfferType | null) ?? "percentage") as OfferType;
              const tiers = Array.isArray(deal.tiers) ? deal.tiers : [];
              const display = describeOffer(
                {
                  offer_type: offerType,
                  original_price: deal.original_price,
                  discounted_price: deal.discounted_price,
                  discount_percentage: deal.discount_percentage,
                  base_price: deal.base_price,
                  tiers,
                },
                count,
              );
              const committed = interest.deposit_required && interest.deposit_status === "committed";
              return (
                <Link key={interest.id} to={`/resident/deals/${deal.id}`} className="block">
                  <div className="gb-card p-4 hover:border-gold/40 transition-smooth">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="h-10 w-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-primary shrink-0">
                        <Tag className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-foreground truncate">{deal.title}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          {count} מצטרפים · סטטוס: {deal.status === "active" ? "פעילה" : deal.status}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border flex items-end justify-between">
                      <div className="text-base font-extrabold text-primary">{display.headline}</div>
                      {committed && (
                        <span className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold/10 text-primary border border-gold/30">
                          <BadgeCheck className="h-3 w-3" />
                          פיקדון {ils(Number(interest.deposit_amount))}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
