import { memo } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Tag as TagIcon, TrendingDown, Flame, Users, Clock, Image as ImageIcon } from "lucide-react";
import { describeOffer, ils, type OfferTier, type OfferType } from "@/lib/offerPricing";
import { FavoriteButton } from "@/components/deals/FavoriteButton";

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
  target_participants?: number | null;
  join_deadline?: string | null;
  redemption_deadline?: string | null;
  auto_closed_at?: string | null;
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

/**
 * Square grid deal card — fits into grid-cols-2 lg:grid-cols-3 xl:grid-cols-4.
 * Top half: cover image (aspect-square). Bottom: supplier, title, price, status.
 */
function RealDealCardImpl({
  deal,
  joinersCount = 0,
  isFavorite = false,
  to,
  hideFavorite = false,
  onFavoriteChange,
}: {
  deal: RealDealCardData;
  joinersCount?: number;
  isFavorite?: boolean;
  to?: string;
  hideFavorite?: boolean;
  onFavoriteChange?: (isFavorite: boolean) => void;
}) {
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
  let bestDiscountPct: number | null = null;
  if (offerType === "price_comparison" && tiers.length > 0) {
    const list = tiers
      .map((t) => (t.original_price && t.discounted_price ? Number(t.original_price) - Number(t.discounted_price) : 0))
      .filter((s) => s > 0);
    if (list.length) bestSavings = Math.max(...list);
  } else if (offerType === "price_comparison" && deal.original_price && deal.discounted_price) {
    bestSavings = Number(deal.original_price) - Number(deal.discounted_price);
  } else if (offerType === "percentage") {
    const tierPcts = tiers
      .map((t) => (t.discount_percentage != null ? Number(t.discount_percentage) : 0))
      .filter((p) => p > 0);
    const base = deal.discount_percentage ? Number(deal.discount_percentage) : 0;
    const all = [...tierPcts, base].filter((p) => p > 0);
    if (all.length) bestDiscountPct = Math.max(...all);
  }

  const left = timeLeft(deal.ends_at);
  const realJoiners = Math.max(0, joinersCount);
  const isHot = realJoiners >= 5 || (left !== null && left.includes("שעות"));
  const isClosed = deal.status === "closed" || !!deal.auto_closed_at;
  const cover = deal.cover_image_url ?? null;
  const galleryCount = Array.isArray(deal.gallery_images) ? deal.gallery_images.length : 0;
  const discountBadge =
    offerType === "percentage" && deal.discount_percentage
      ? `${Math.round(Number(deal.discount_percentage))}%`
      : null;

  return (
    <Link to={to ?? `/resident/deals/${deal.id}`} className="block group">
      <article className="bg-white rounded-[20px] overflow-hidden border border-[#ECEEF2] shadow-[0_1px_3px_rgba(17,24,39,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(17,24,39,0.15)] hover:-translate-y-[1px] transition-all duration-200 flex flex-col h-full">
        {/* Square image top half */}
        <div className="relative aspect-square w-full overflow-hidden bg-[#F4F6FA]">
          {cover ? (
            <img
              src={cover}
              alt={deal.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <TagIcon className="h-10 w-10 text-[#0E6B5A]/40" strokeWidth={1.5} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* Badges row */}
          <div className="absolute top-2 right-2 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-56px)]">
            {isHot && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FFF1E4] text-[#E8742C]">
                <Flame className="h-2.5 w-2.5" strokeWidth={2.5} /> HOT
              </span>
            )}
            {discountBadge && (
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#0E6B5A] text-white shadow-[0_2px_6px_-2px_rgba(14,107,90,0.5)]">
                {discountBadge} הנחה
              </span>
            )}
          </div>

          {/* Favorite */}
          {!hideFavorite && (
            <FavoriteButton dealId={deal.id} initial={isFavorite} onChange={onFavoriteChange} className="absolute top-2 left-2 h-8 w-8" />
          )}

          {galleryCount > 0 && (
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/55 text-white">
              <ImageIcon className="h-2.5 w-2.5" /> {galleryCount + 1}
            </span>
          )}

          {isClosed && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-extrabold text-sm px-3 py-1 rounded-full bg-emerald-600">נסגרה</span>
            </div>
          )}
        </div>

        {/* Bottom info */}
        <div className="p-3 flex-1 flex flex-col gap-1.5">
          {deal.supplier_name && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
              {deal.supplier_logo_url ? (
                <img src={deal.supplier_logo_url} alt="" className="h-5 w-5 rounded-full object-cover border border-[#ECEEF2]" />
              ) : (
                <ShieldCheck className="h-3 w-3 text-[#0E6B5A]" strokeWidth={2.5} />
              )}
              <span className="truncate font-medium">{deal.supplier_name}</span>
            </div>
          )}
          <h3 className="font-semibold text-[13px] text-[#1F2937] leading-snug line-clamp-2 min-h-[2.4em]">
            {deal.title}
          </h3>

          <div className="mt-auto pt-1.5 flex items-end justify-between gap-2 border-t border-[#F4F6F9]">
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold text-[#1F2937] leading-tight truncate">{display.headline}</div>
              {bestSavings && bestSavings > 0 ? (
                <div className="text-[10px] font-bold text-emerald-600 inline-flex items-center gap-0.5 mt-0.5">
                  <TrendingDown className="h-2.5 w-2.5" /> חוסכים {ils(bestSavings)}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-0.5 text-[10px]">
              {realJoiners > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[#6B7280] font-bold">
                  <Users className="h-2.5 w-2.5" /> {realJoiners}
                </span>
              )}
              {!isClosed && left && (
                <span className="inline-flex items-center gap-0.5 text-[#6B7280]">
                  <Clock className="h-2.5 w-2.5" /> {left}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export const RealDealCard = memo(RealDealCardImpl);
