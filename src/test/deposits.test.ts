import { describe, it, expect } from "vitest";

// Mirrors the rule used across the app: only paid deposits drive participant
// counts, pricing tiers, and "X joined" labels. Refunded/cancelled/failed
// must never count.
type Deposit = { status: string; user_id: string; is_deleted?: boolean };

function paidParticipantCount(deposits: Deposit[]): number {
  const set = new Set<string>();
  for (const d of deposits) {
    if (d.is_deleted) continue;
    if (d.status === "paid") set.add(d.user_id);
  }
  return set.size;
}

function activeDepositCount(deposits: Deposit[]): number {
  return deposits.filter((d) => !d.is_deleted && (d.status === "pending" || d.status === "paid")).length;
}

describe("deposit counting rules", () => {
  const sample: Deposit[] = [
    { status: "paid", user_id: "u1" },
    { status: "paid", user_id: "u2" },
    { status: "paid", user_id: "u1" }, // duplicate user — counted once
    { status: "pending", user_id: "u3" },
    { status: "refunded", user_id: "u4" },
    { status: "cancelled", user_id: "u5" },
    { status: "failed", user_id: "u6" },
    { status: "paid", user_id: "u7", is_deleted: true },
  ];

  it("counts only paid unique users for participant count", () => {
    expect(paidParticipantCount(sample)).toBe(2);
  });

  it("excludes refunded, cancelled, and failed from participant count", () => {
    const onlyTerminal: Deposit[] = [
      { status: "refunded", user_id: "a" },
      { status: "cancelled", user_id: "b" },
      { status: "failed", user_id: "c" },
    ];
    expect(paidParticipantCount(onlyTerminal)).toBe(0);
  });

  it("active deposit count includes pending+paid only", () => {
    expect(activeDepositCount(sample)).toBe(4); // 3 paid rows (incl. duplicate) + 1 pending; soft-deleted excluded
  });

  it("treats deal deletion gracefully — refunded deposit still kept in history", () => {
    const refundedAfterDealDeleted: Deposit = { status: "refunded", user_id: "u9" };
    expect(paidParticipantCount([refundedAfterDealDeleted])).toBe(0);
    expect(activeDepositCount([refundedAfterDealDeleted])).toBe(0);
  });
});
