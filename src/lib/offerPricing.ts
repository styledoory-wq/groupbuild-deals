// Helper utilities for the new "offer types" model on deals.
// Backward compatible with legacy tier-based deals.

export type OfferType = "percentage" | "price_comparison" | "tiers";

export type OfferPricing = {
  offer_type: OfferType;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
};

export type OfferDisplay = {
  // Headline label, e.g. "20% הנחה" or "₪5,000 → ₪4,200"
  headline: string;
  // Optional savings text, e.g. "חיסכון: ₪800"
  savings?: string;
  // Numeric effective price the user is offered (for sorting/display), or null.
  effectivePrice: number | null;
  // Numeric reference price (the "before"), or null.
  referencePrice: number | null;
  // Computed discount percent (rounded), or null.
  discountPercent: number | null;
};

const ils = (n: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(n);

export function describeOffer(p: Partial<OfferPricing>): OfferDisplay {
  const type = (p.offer_type ?? "percentage") as OfferType;

  if (type === "price_comparison" && p.original_price && p.discounted_price) {
    const before = Number(p.original_price);
    const after = Number(p.discounted_price);
    const savings = before - after;
    const pct = before > 0 ? Math.round((savings / before) * 100) : null;
    return {
      headline: `${ils(before)} → ${ils(after)}`,
      savings: savings > 0 ? `חיסכון: ${ils(savings)}` : undefined,
      effectivePrice: after,
      referencePrice: before,
      discountPercent: pct,
    };
  }

  if (type === "percentage" && p.discount_percentage) {
    const pct = Number(p.discount_percentage);
    const base = p.base_price ? Number(p.base_price) : null;
    if (base && base > 0) {
      const after = Math.round(base * (1 - pct / 100));
      const savings = base - after;
      return {
        headline: `${ils(base)} → ${ils(after)} (${pct}%)`,
        savings: savings > 0 ? `חיסכון: ${ils(savings)}` : undefined,
        effectivePrice: after,
        referencePrice: base,
        discountPercent: pct,
      };
    }
    return {
      headline: `${pct}% הנחה`,
      effectivePrice: null,
      referencePrice: null,
      discountPercent: pct,
    };
  }

  // Legacy / tier-based fallback: derive from original_price if available.
  const before = p.original_price ? Number(p.original_price) : null;
  if (before) {
    return {
      headline: ils(before),
      effectivePrice: before,
      referencePrice: before,
      discountPercent: null,
    };
  }
  return {
    headline: "הצעה מיוחדת",
    effectivePrice: null,
    referencePrice: null,
    discountPercent: null,
  };
}
