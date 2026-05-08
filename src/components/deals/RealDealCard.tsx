import { Link } from "react-router-dom";
import { ShieldCheck, Tag as TagIcon, TrendingDown, Globe2, Building2, Flame, Users, Clock, Image as ImageIcon } from "lucide-react";
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
  cover_image_url?: string | null;
  gallery_images?: string[] | null;
}

function timeLeft(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  const ms = end - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `${days} ימים`;
  const hours = Math.floor(ms / 3600000);
  return `${hours} שעות`;
}

export function RealDealCard({ deal, joinersCount = 0 }: { deal: RealDealCardData; joinersCount?: number }) {
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
  const left = timeLeft(deal.ends_at);
  const realJoiners = Math.max(0, joinersCount);
  const isHot = realJoiners >= 5 || (left !== null && left.includes("שעות"));

  // Progress: real joiners → maxTier
  const minTier = tiers[0]?.minParticipants ?? 0;
  const maxTier = tiers[tiers.length - 1]?.minParticipants ?? Math.max(minTier + 1, 10);
  const progressPct = realJoiners > 0
    ? Math.min(100, Math.max(4, Math.round((realJoiners / Math.max(1, maxTier)) * 100)))
    : 0;

  const cover = deal.cover_image_url ?? null;
  const galleryCount = Array.isArray(deal.gallery_images) ? deal.gallery_images.length : 0;
  const discountBadge =
    offerType === "percentage" && deal.discount_percentage
      ? `${Math.round(Number(deal.discount_percentage))}%`
      : null;

  return (
    <Link to={`/resident/deals/${deal.id}`} className="block group">
      <article className="gb-card-premium overflow-hidden p-0 transition-all duration-300">
        {/* Hero image (if exists) */}
        {cover && (
          <div className="relative h-40 w-full overflow-hidden">
            <img
              src={cover}
              alt={deal.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
            <div className="absolute top-2 right-2 flex flex-wrap items-center gap-1.5">
              {isHot && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full bg-orange-500/95 text-white shadow">
                  <Flame className="h-3 w-3" strokeWidth={2.5} />
                  HOT
                </span>
              )}
              {discountBadge && (
                <span className="text-[11px] font-extrabold px-2 py-1 rounded-full bg-gradient-to-r from-gold to-gold-light text-primary shadow">
                  עד {discountBadge} הנחה
                </span>
              )}
            </div>
            {galleryCount > 0 && (
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-black/55 text-white">
                <ImageIcon className="h-3 w-3" /> {galleryCount + 1}
              </span>
            )}
            <div className="absolute bottom-2 left-2">
              <span
                className={
                  "text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 " +
                  (isProjectOnly
                    ? "bg-blue-500/90 text-white"
                    : "bg-success/90 text-white")
                }
              >
                {isProjectOnly ? <Building2 className="h-2.5 w-2.5" /> : <Globe2 className="h-2.5 w-2.5" />}
                {isProjectOnly ? "פרויקט" : "פתוח לכולם"}
              </span>
            </div>
          </div>
        )}

        <div className="p-5">
        {/* Top row: icon + title + visibility (only badges shown if no cover) */}
        <div className="flex items-start gap-3 mb-3 relative">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-gold/25 to-gold/5 border border-gold/30 flex items-center justify-center shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.5)]">
            <TagIcon className="h-5 w-5 text-gold" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            {!cover && (
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                {isHot && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-700 border border-orange-500/30">
                    <Flame className="h-2.5 w-2.5" strokeWidth={2.5} />
                    HOT
                  </span>
                )}
                <span
                  className={
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 " +
                    (isProjectOnly
                      ? "bg-blue-500/10 text-blue-600 border border-blue-500/30"
                      : "bg-success/10 text-success border border-success/30")
                  }
                >
                  {isProjectOnly ? <Building2 className="h-2.5 w-2.5" /> : <Globe2 className="h-2.5 w-2.5" />}
                  {isProjectOnly ? "פרויקט" : "פתוח"}
                </span>
              </div>
            )}
            <h3 className="font-bold text-[15px] text-foreground leading-snug truncate">{deal.title}</h3>
            {deal.supplier_name && (
              <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1 truncate">
                <ShieldCheck className="h-3 w-3 text-gold shrink-0" strokeWidth={2.5} />
                <span className="truncate">{deal.supplier_name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Price block */}
        <div className="pt-3 border-t border-border/50 relative">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[20px] font-extrabold text-primary leading-tight tracking-tight">{display.headline}</div>
              {bestSavings && bestSavings > 0 ? (
                <div className="text-[11px] font-bold text-success mt-1 inline-flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" strokeWidth={2.5} />
                  חוסכים עד {ils(bestSavings)}
                </div>
              ) : display.savings ? (
                <div className="text-[11px] font-bold text-success mt-1 inline-flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" strokeWidth={2.5} />
                  {display.savings}
                </div>
              ) : null}
            </div>
            {tiers.length > 0 && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-gold/25 to-gold/10 text-primary border border-gold/30 shrink-0">
                {tiers.length} מדרגות
              </span>
            )}
          </div>

          {/* Live progress bar */}
          {tiers.length > 0 && (
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-muted/80 overflow-hidden ring-1 ring-border/40 relative">
                <div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{
                    width: `${progressPct}%`,
                    background: "linear-gradient(90deg, hsl(44 53% 54%), hsl(44 73% 66%))",
                    boxShadow: "0 0 8px hsl(44 53% 54% / 0.6)",
                  }}
                >
                  <div className="absolute inset-0 gb-shimmer opacity-70" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px]">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <span className="gb-live-dot" />
                  <Users className="h-2.5 w-2.5" strokeWidth={2.5} />
                  {realJoiners > 0 ? (
                    <><span className="font-semibold text-foreground">{realJoiners}</span> דיירים הצטרפו</>
                  ) : (
                    <span className="font-semibold text-foreground">היו הראשונים להצטרף</span>
                  )}
                </span>
                {left && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
                    נסגר בעוד <span className="font-semibold text-foreground">{left}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </article>
    </Link>
  );
}
