/**
 * Canonical deal base price for participation-fee calculation.
 *
 * The participation fee must be IDENTICAL for every participant in a deal.
 * It is therefore derived from the deal's *originally published* price and
 * never from the dynamic, tier-discounted price that changes as the group grows.
 *
 * Rules (approved):
 *  - percentage offers        → `deals.base_price` (REQUIRED, must be > 0)
 *  - price_comparison offers  → discounted price of the FIRST tier
 *                               (lowest minParticipants); if no tiers,
 *                               `deals.discounted_price`
 *
 * When no valid canonical price can be derived, the result is invalid and
 * joining MUST be blocked (fail-closed). Never fall back to 0.
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

/** Tier with the lowest minParticipants (the entry-level group price). */
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

export const CANONICAL_PRICE_REASON_HE: Record<CanonicalPriceReason, string> = {
  ok: "תקין",
  missing_base_price: "חסר מחיר בסיס להצעת אחוזי הנחה",
  missing_comparison_price: "חסר מחיר מוזל להצעת השוואת מחיר",
  unknown_offer_type: "סוג הצעה לא מזוהה",
};

/** Copy shown to residents when the fee cannot be resolved (fail-closed). */
export const JOIN_BLOCKED_MESSAGE =
  "ההצטרפות לעסקה אינה זמינה כרגע. נסו שוב מאוחר יותר.";
