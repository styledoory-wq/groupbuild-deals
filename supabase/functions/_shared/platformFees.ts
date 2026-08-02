/**
 * Deno-side participation fee helpers (mirrors src/lib/platformFees.ts matching logic).
 */

export type PlatformFeeRule = {
  id: string;
  name: string | null;
  fee_type: string;
  min_deal_price: number;
  max_deal_price: number | null;
  fee_amount: number;
  currency: string;
  is_active: boolean;
  category_id?: string | null;
  offer_type?: string | null;
  listing_type?: string | null;
  priority?: number;
  sort_order?: number;
};

export type OfferTier = {
  minParticipants?: number;
  maxParticipants?: number | null;
  discount_percentage?: number | null;
  original_price?: number | null;
  discounted_price?: number | null;
};

export function getActiveTier(tiers: OfferTier[], participants: number): OfferTier | null {
  if (!tiers?.length) return null;
  const sorted = [...tiers].sort(
    (a, b) => (a.minParticipants ?? 0) - (b.minParticipants ?? 0),
  );
  if (!participants || participants < (sorted[0].minParticipants ?? 0)) return sorted[0];
  let active = sorted[0];
  for (const t of sorted) {
    if (participants >= (t.minParticipants ?? 0)) active = t;
  }
  return active;
}

export function getDealPriceForFee(
  deal: {
    offer_type?: string | null;
    original_price?: number | null;
    discounted_price?: number | null;
    discount_percentage?: number | null;
    base_price?: number | null;
    tiers?: OfferTier[] | null;
  },
  participants = 0,
): number {
  const tiers = Array.isArray(deal.tiers) ? deal.tiers : [];
  const type = deal.offer_type ?? "percentage";

  if (tiers.length > 0) {
    const active = getActiveTier(tiers, participants);
    if (active) {
      if (type === "price_comparison" && active.discounted_price != null) {
        const n = Number(active.discounted_price);
        if (n > 0) return n;
      }
      if (
        type === "percentage" &&
        active.discount_percentage != null &&
        deal.base_price != null
      ) {
        const base = Number(deal.base_price);
        const pct = Number(active.discount_percentage);
        if (base > 0) return Math.round(base * (1 - pct / 100));
      }
      if (active.original_price != null) {
        const n = Number(active.original_price);
        if (n > 0) return n;
      }
    }
  }

  if (type === "price_comparison" && deal.discounted_price != null) {
    const n = Number(deal.discounted_price);
    if (n > 0) return n;
  }
  if (type === "percentage" && deal.discount_percentage != null && deal.base_price != null) {
    const base = Number(deal.base_price);
    const pct = Number(deal.discount_percentage);
    if (base > 0) return Math.round(base * (1 - pct / 100));
  }
  if (deal.original_price != null && Number(deal.original_price) > 0) {
    return Number(deal.original_price);
  }
  if (deal.base_price != null && Number(deal.base_price) > 0) {
    return Number(deal.base_price);
  }
  return 0;
}

export function matchPlatformFeeRule(
  rules: PlatformFeeRule[],
  ctx: {
    dealPrice: number;
    feeType?: string;
    categoryId?: string | null;
    offerType?: string | null;
    listingType?: string | null;
  },
): PlatformFeeRule | null {
  const feeType = ctx.feeType ?? "participation";
  const price = Math.max(0, Number(ctx.dealPrice) || 0);
  const candidates = rules
    .filter((r) => r.is_active && (r.fee_type || "participation") === feeType)
    .filter((r) => price >= Number(r.min_deal_price))
    .filter((r) => r.max_deal_price == null || price <= Number(r.max_deal_price))
    .filter((r) => r.category_id == null || r.category_id === ctx.categoryId)
    .filter((r) => r.offer_type == null || r.offer_type === ctx.offerType)
    .filter((r) => r.listing_type == null || r.listing_type === ctx.listingType);

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const spec = (r: PlatformFeeRule) =>
      (r.category_id ? 0 : 1) + (r.offer_type ? 0 : 1) + (r.listing_type ? 0 : 1);
    const bySpec = spec(a) - spec(b);
    if (bySpec !== 0) return bySpec;
    const byPri = (a.priority ?? 100) - (b.priority ?? 100);
    if (byPri !== 0) return byPri;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  return candidates[0];
}
