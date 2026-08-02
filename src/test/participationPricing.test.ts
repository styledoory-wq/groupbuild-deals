import { describe, it, expect } from "vitest";
import { getCanonicalDealBasePrice } from "@/lib/participationPricing";

describe("canonical participation price", () => {
  it("uses the FIRST tier discounted price for price_comparison (equal for all participants)", () => {
    const deal = {
      offer_type: "price_comparison",
      original_price: 4000,
      discounted_price: 3200,
      tiers: [
        { minParticipants: 10, discounted_price: 2800 },
        { minParticipants: 3, discounted_price: 3200 },
      ],
    };
    // Regardless of how many people joined, the fee price stays the entry price.
    expect(getCanonicalDealBasePrice(deal)).toEqual({ valid: true, price: 3200, reason: "ok" });
  });

  it("falls back to deal.discounted_price when there are no tiers", () => {
    expect(
      getCanonicalDealBasePrice({ offer_type: "price_comparison", discounted_price: 5000 }).price,
    ).toBe(5000);
  });

  it("uses base_price for percentage offers, ignoring the discount", () => {
    const r = getCanonicalDealBasePrice({
      offer_type: "percentage",
      base_price: 12000,
      tiers: [{ minParticipants: 3, discount_percentage: 20 }],
    });
    expect(r.valid).toBe(true);
    expect(r.price).toBe(12000);
  });

  it("fails closed when a percentage offer has no base price", () => {
    const r = getCanonicalDealBasePrice({ offer_type: "percentage", original_price: 0 });
    expect(r.valid).toBe(false);
    expect(r.price).toBeNull();
    expect(r.reason).toBe("missing_base_price");
  });

  it("fails closed when a price_comparison offer has no discounted price", () => {
    const r = getCanonicalDealBasePrice({ offer_type: "price_comparison", original_price: 9000 });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("missing_comparison_price");
  });
});
