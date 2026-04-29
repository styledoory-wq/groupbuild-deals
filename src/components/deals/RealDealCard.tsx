import { Link } from "react-router-dom";
import { ShieldCheck, Tag as TagIcon, TrendingDown } from "lucide-react";
import { describeOffer, type OfferTier, type OfferType } from "@/lib/offerPricing";

export interface RealDealCardData {
  id: string;
  title: string;
  status: string;
  category_id: string | null;
  supplier_id: string;
  supplier_name?: string | null;
  supplier_logo_url?: string | null;
  offer_type: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  tiers: OfferTier[] | null;
  ends_at: string | null;
}

export function RealDealCard({ deal }: { deal: RealDealCardData }) {
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
    0,
  );

  return (
    <Link to={`/resident/deals/${deal.id}`} className="block group">
      <article className="gb-card p-5 transition-smooth hover:border-gold/40">
        <div className="flex items-start gap-4 mb-3">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-primary">
            <TagIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-foreground leading-snug truncate">{deal.title}</h3>
            {deal.supplier_name && (
              <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-gold" />
                {deal.supplier_name}
              </p>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-extrabold text-primary leading-tight">{display.headline}</div>
              {display.savings && (
                <div className="text-[11px] font-bold text-success mt-0.5 inline-flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {display.savings}
                </div>
              )}
            </div>
            {tiers.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gold/10 text-primary border border-gold/30 shrink-0">
                {tiers.length} מדרגות
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            ככל שיותר דיירים מצטרפים — ההנחה גדלה
          </p>
        </div>
      </article>
    </Link>
  );
}
