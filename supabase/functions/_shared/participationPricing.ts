/**
 * Deno mirror of src/lib/participationPricing.ts — keep both in sync.
 * Canonical (published) deal price used to resolve the participation fee.
 */

export type CanonicalPriceReason =
  | "ok"
  | "missing_base_price"
  | "missing_comparison_price"
  | "unknown_offer_type";

export type CanonicalPriceResult = {
  valid: boolean;
  price: number | null;
  reason: CanonicalPriceReason;
};

type TierLike = {
  minParticipants?: number | null;
  discounted_price?: number | null;
  original_price?: number | null;
  discount_percentage?: number | null;
};

export type CanonicalPriceInput = {
  offer_type?: string | null;
  base_price?: number | null;
  discounted_price?: number | null;
  original_price?: number | null;
  tiers?: TierLike[] | null;
};

const pos = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function firstTier(tiers: TierLike[] | null | undefined): TierLike | null {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  return [...tiers].sort(
    (a, b) => (Number(a.minParticipants) || 0) - (Number(b.minParticipants) || 0),
  )[0];
}

export function getCanonicalDealBasePrice(deal: CanonicalPriceInput): CanonicalPriceResult {
  const tiers = Array.isArray(deal.tiers) ? deal.tiers : [];
  const t0 = firstTier(tiers);
  const type = (deal.offer_type ?? "percentage") as string;

  const isComparison =
    type === "price_comparison" ||
    (type === "tiers" && t0?.discounted_price != null);

  if (isComparison) {
    const price = pos(t0?.discounted_price) ?? pos(deal.discounted_price);
    if (price != null) return { valid: true, price, reason: "ok" };
    return { valid: false, price: null, reason: "missing_comparison_price" };
  }

  if (type === "percentage" || type === "tiers") {
    const price = pos(deal.base_price);
    if (price != null) return { valid: true, price, reason: "ok" };
    return { valid: false, price: null, reason: "missing_base_price" };
  }

  return { valid: false, price: null, reason: "unknown_offer_type" };
}
