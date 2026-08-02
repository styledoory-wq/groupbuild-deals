import { describe, it, expect } from "vitest";
import {
  getDealPriceForFee,
  matchPlatformFeeRule,
  resolveParticipationFeeFromRules,
  type PlatformFeeRule,
} from "@/lib/platformFees";

const sampleRules: PlatformFeeRule[] = [
  { id: "1", name: "עד 2,000", fee_type: "participation", min_deal_price: 0, max_deal_price: 2000, fee_amount: 19, currency: "ILS", is_active: true, priority: 100, sort_order: 10 },
  { id: "2", name: "2,001–10,000", fee_type: "participation", min_deal_price: 2001, max_deal_price: 10000, fee_amount: 49, currency: "ILS", is_active: true, priority: 100, sort_order: 20 },
  { id: "3", name: "10,001–30,000", fee_type: "participation", min_deal_price: 10001, max_deal_price: 30000, fee_amount: 99, currency: "ILS", is_active: true, priority: 100, sort_order: 30 },
  { id: "4", name: "30,001–70,000", fee_type: "participation", min_deal_price: 30001, max_deal_price: 70000, fee_amount: 199, currency: "ILS", is_active: true, priority: 100, sort_order: 40 },
  { id: "5", name: "70,001–150,000", fee_type: "participation", min_deal_price: 70001, max_deal_price: 150000, fee_amount: 299, currency: "ILS", is_active: true, priority: 100, sort_order: 50 },
  { id: "6", name: "מעל 150,000", fee_type: "participation", min_deal_price: 150001, max_deal_price: null, fee_amount: 499, currency: "ILS", is_active: true, priority: 100, sort_order: 60 },
];

describe("platform fee band matching", () => {
  it("matches the example bands", () => {
    expect(matchPlatformFeeRule(sampleRules, { dealPrice: 1500 })?.fee_amount).toBe(19);
    expect(matchPlatformFeeRule(sampleRules, { dealPrice: 2000 })?.fee_amount).toBe(19);
    expect(matchPlatformFeeRule(sampleRules, { dealPrice: 2001 })?.fee_amount).toBe(49);
    expect(matchPlatformFeeRule(sampleRules, { dealPrice: 10000 })?.fee_amount).toBe(49);
    expect(matchPlatformFeeRule(sampleRules, { dealPrice: 25000 })?.fee_amount).toBe(99);
    expect(matchPlatformFeeRule(sampleRules, { dealPrice: 50000 })?.fee_amount).toBe(199);
    expect(matchPlatformFeeRule(sampleRules, { dealPrice: 100000 })?.fee_amount).toBe(299);
    expect(matchPlatformFeeRule(sampleRules, { dealPrice: 200000 })?.fee_amount).toBe(499);
  });

  it("ignores inactive rules", () => {
    const rules = sampleRules.map((r) =>
      r.id === "2" ? { ...r, is_active: false } : r,
    );
    expect(matchPlatformFeeRule(rules, { dealPrice: 5000 })).toBeNull();
  });

  it("prefers more specific category rules", () => {
    const rules: PlatformFeeRule[] = [
      ...sampleRules,
      {
        id: "cat",
        name: "קטגוריה מיוחדת",
        fee_type: "participation",
        min_deal_price: 0,
        max_deal_price: 10000,
        fee_amount: 9,
        currency: "ILS",
        is_active: true,
        category_id: "cat-1",
        priority: 100,
        sort_order: 5,
      },
    ];
    expect(matchPlatformFeeRule(rules, { dealPrice: 5000, categoryId: "cat-1" })?.fee_amount).toBe(9);
    expect(matchPlatformFeeRule(rules, { dealPrice: 5000, categoryId: "other" })?.fee_amount).toBe(49);
  });

  it("resolves total due as participation fee only", () => {
    const resolved = resolveParticipationFeeFromRules(sampleRules, { dealPrice: 12000 });
    expect(resolved.feeAmount).toBe(99);
    expect(resolved.totalDueNow).toBe(99);
    expect(resolved.dealPrice).toBe(12000);
  });
});

describe("getDealPriceForFee", () => {
  it("uses discounted_price for price_comparison offers", () => {
    expect(
      getDealPriceForFee({
        offer_type: "price_comparison",
        original_price: 10000,
        discounted_price: 8000,
      }),
    ).toBe(8000);
  });

  it("uses active tier discounted price when tiers present", () => {
    expect(
      getDealPriceForFee(
        {
          offer_type: "price_comparison",
          original_price: 10000,
          discounted_price: 9000,
          tiers: [
            { minParticipants: 1, maxParticipants: 4, original_price: 10000, discounted_price: 9000 },
            { minParticipants: 5, maxParticipants: null, original_price: 10000, discounted_price: 7500 },
          ],
        },
        6,
      ),
    ).toBe(7500);
  });
});
