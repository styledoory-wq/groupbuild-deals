import { Link } from "react-router-dom";
import { ShieldCheck, Tag as TagIcon, TrendingDown, Globe2, Building2 } from "lucide-react";
import { describeOffer, ils, type OfferTier, type OfferType } from "@/lib/offerPricing";

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
  visibility_type?: string | null;
  visibility_project_id?: string | null;
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

  // Compute savings (best tier) — only for price_comparison offers
  let bestSavings: number | null = null;
  if (offerType === "price_comparison" && tiers.length > 0) {
    const savingsList = tiers
      .map((t) => (t.original_price && t.discounted_price ? Number(t.original_price) - Number(t.discounted_price) : 0))
      .filter((s) => s > 0);
    if (savingsList.length) bestSavings = Math.max(...savingsList);
  } else if (offerType === "price_comparison" && deal.original_price && deal.discounted_price) {
    bestSavings = Number(deal.original_price) - Number(deal.discounted_price);
  }

  const isProjectOnly = deal.visibility_type === "project_only";

  return (
    <Link to={`/resident/deals/${deal.id}`} className="block group">
      <article className="gb-card-premium p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_hsl(217_56%_13%_/_0.35)]">
        <div className="flex items-start gap-4 mb-3">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center text-primary shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.4)]">
            <TagIcon className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-foreground leading-snug truncate">{deal.title}</h3>
            {deal.supplier_name && (
              <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-gold" />
                {deal.supplier_name}
              </p>
            )}
          </div>
          <span
            className={
              "shrink-0 text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 backdrop-blur " +
              (isProjectOnly
                ? "bg-blue-500/10 text-blue-600 border border-blue-500/30"
                : "bg-success/10 text-success border border-success/30")
            }
            aria-label={isProjectOnly ? "מותאם לפרויקט שלך" : "פתוח לכל הדיירים"}
          >
            {isProjectOnly ? <Building2 className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}
            {isProjectOnly ? "מותאם לפרויקט" : "לכל הדיירים"}
          </span>
        </div>

        <div className="pt-3 border-t border-border/60">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-extrabold text-primary leading-tight tracking-tight">{display.headline}</div>
              {bestSavings && bestSavings > 0 ? (
                <div className="text-[11px] font-bold text-success mt-1 inline-flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  חוסכים עד {ils(bestSavings)}
                </div>
              ) : display.savings ? (
                <div className="text-[11px] font-bold text-success mt-1 inline-flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {display.savings}
                </div>
              ) : null}
            </div>
            {tiers.length > 0 && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-gold/20 to-gold/10 text-primary border border-gold/30 shrink-0">
                {tiers.length} מדרגות
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 inline-flex items-center gap-1">
            <span className="gb-live-dot" />
            ככל שיותר דיירים מצטרפים — ההנחה גדלה
          </p>
        </div>
      </article>
    </Link>
  );
}
