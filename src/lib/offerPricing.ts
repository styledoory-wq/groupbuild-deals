// Helper utilities for the new "offer types" model on deals.
// Backward compatible with legacy tier-based deals.

export type OfferType = "percentage" | "price_comparison" | "tiers";

export type OfferTier = {
  minParticipants: number;
  maxParticipants: number | null;
  // For percentage offers
  discount_percentage?: number | null;
  // For price_comparison offers
  original_price?: number | null;
  discounted_price?: number | null;
  // Optional label
  label?: string | null;
};

export type OfferPricing = {
  offer_type: OfferType;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  tiers?: OfferTier[] | null;
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

export const ils = (n: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(n);

/** Sort tiers ascending by minParticipants. */
export function sortTiers(tiers: OfferTier[]): OfferTier[] {
  return [...tiers].sort((a, b) => (a.minParticipants ?? 0) - (b.minParticipants ?? 0));
}

/**
 * Returns the active tier given current participant count.
 * If no participants — returns the first tier.
 * Falls back to the highest tier whose min <= participants.
 */
export function getActiveTier(tiers: OfferTier[], participants: number): OfferTier | null {
  if (!tiers?.length) return null;
  const sorted = sortTiers(tiers);
  if (!participants || participants < sorted[0].minParticipants) return sorted[0];
  let active = sorted[0];
  for (const t of sorted) {
    if (participants >= t.minParticipants) active = t;
  }
  return active;
}

/** Returns the next tier (one with higher minParticipants than the active one), or null. */
export function getNextTier(tiers: OfferTier[], participants: number): OfferTier | null {
  if (!tiers?.length) return null;
  const sorted = sortTiers(tiers);
  const next = sorted.find((t) => t.minParticipants > Math.max(participants, 0));
  return next ?? null;
}

/** Short label for a tier (just discount/price headline, no range). */
export function tierShortValue(type: OfferType, t: OfferTier): string {
  if (type === "percentage" && t.discount_percentage) return `${t.discount_percentage}%`;
  if (type === "price_comparison" && t.discounted_price) return ils(Number(t.discounted_price));
  return "—";
}

/** Range label like "1–4" or "20+" */
export function tierRange(t: OfferTier): string {
  if (t.maxParticipants && t.maxParticipants >= t.minParticipants) {
    return `${t.minParticipants}–${t.maxParticipants}`;
  }
  return `${t.minParticipants}+`;
}

/** Describe a single tier for display. */
export function describeTier(type: OfferType, t: OfferTier): OfferDisplay {
  if (type === "price_comparison" && t.original_price && t.discounted_price) {
    const before = Number(t.original_price);
    const after = Number(t.discounted_price);
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
  if (type === "percentage" && t.discount_percentage) {
    return {
      headline: `${t.discount_percentage}% הנחה`,
      effectivePrice: null,
      referencePrice: null,
      discountPercent: Number(t.discount_percentage),
    };
  }
  return { headline: "—", effectivePrice: null, referencePrice: null, discountPercent: null };
}

export function describeOffer(p: Partial<OfferPricing>, participants = 0): OfferDisplay {
  const type = (p.offer_type ?? "percentage") as OfferType;

  // Tiered offer takes precedence
  if (p.tiers && p.tiers.length > 0) {
    const active = getActiveTier(p.tiers, participants);
    if (active) return describeTier(type, active);
  }

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
