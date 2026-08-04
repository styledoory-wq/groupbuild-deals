import { describe, expect, it } from "vitest";
import {
  buildShareText,
  computeCreditSplit,
  REFERRAL_STATUS_LABELS,
  statusLabel,
} from "@/lib/supplierReferral";
import { buildPaymentBreakdownDisplay } from "@/lib/residentCredits";

describe("supplier referral — share + status", () => {
  it("builds referral share text with link", () => {
    const link = "https://groupbuild.co.il/auth/supplier?mode=signup&ref=ABC12345";
    const text = buildShareText(link);
    expect(text).toContain("GroupBuild");
    expect(text).toContain(link);
    expect(text).toContain("חשבתי שזה יכול להתאים לך");
  });

  it("maps all referral statuses to Hebrew labels", () => {
    expect(statusLabel("invited")).toBe("נשלחה הזמנה");
    expect(statusLabel("registered")).toBe("הספק נרשם");
    expect(statusLabel("pending_approval")).toBe("ממתין לאישור");
    expect(statusLabel("approved")).toBe("הספק אושר");
    expect(statusLabel("reward_granted")).toMatch(/קרדיט/);
    expect(statusLabel("rejected")).toBe("ההפניה נדחתה");
    expect(Object.keys(REFERRAL_STATUS_LABELS)).toHaveLength(8);
  });

  it("builds a stable provisional code from user id", async () => {
    const { provisionalReferralCode, buildReferralLink } = await import("@/lib/supplierReferral");
    const code = provisionalReferralCode("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(code).toBe("GBA1B2C3D4");
    expect(buildReferralLink(code)).toContain(`ref=${code}`);
  });
});

describe("credit split math", () => {
  it("pays fully from credit when balance covers fee", () => {
    const split = computeCreditSplit(100, 150);
    expect(split.creditApplied).toBe(100);
    expect(split.cardAmount).toBe(0);
    expect(split.fullyCovered).toBe(true);
  });

  it("splits credit + card when balance is partial", () => {
    const split = computeCreditSplit(100, 40);
    expect(split.creditApplied).toBe(40);
    expect(split.cardAmount).toBe(60);
    expect(split.fullyCovered).toBe(false);
  });

  it("charges full fee on card when no credit", () => {
    const split = computeCreditSplit(49, 0);
    expect(split.creditApplied).toBe(0);
    expect(split.cardAmount).toBe(49);
    expect(split.fullyCovered).toBe(false);
  });

  it("never applies more credit than the fee", () => {
    const split = computeCreditSplit(19, 1000);
    expect(split.creditApplied).toBe(19);
    expect(split.cardAmount).toBe(0);
  });

  it("handles invalid inputs safely", () => {
    const split = computeCreditSplit(Number.NaN, -10);
    expect(split.creditApplied).toBe(0);
    expect(split.cardAmount).toBe(0);
  });
});

describe("payment breakdown display", () => {
  it("shows fee, credit, and remaining card amount", () => {
    const d = buildPaymentBreakdownDisplay({
      fee: 100,
      creditApplied: 40,
      cardAmount: 60,
      available: 40,
    });
    expect(d.feeLabel).toContain("100");
    expect(d.creditLabel).toContain("40");
    expect(d.cardLabel).toContain("60");
    expect(d.availableLabel).toContain("40");
    expect(d.fullyCovered).toBe(false);
  });
});

describe("idempotency key conventions", () => {
  it("uses stable referral reward keys", () => {
    const referralId = "11111111-1111-1111-1111-111111111111";
    expect(`referral_reward:${referralId}`).toBe(`referral_reward:${referralId}`);
    expect(`credit_reserve:dep-1`).toBe("credit_reserve:dep-1");
    expect(`credit_refund:dep-1`).toBe("credit_refund:dep-1");
  });
});
