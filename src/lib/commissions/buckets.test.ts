import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import {
  commissionBucket,
  commissionBucketLabel,
  isPaidCommission,
  isPendingCommission,
  pendingPaidTotals,
} from "./buckets";

describe("commission pending vs paid", () => {
  it("treats payable and held as still pending money", () => {
    expect(commissionBucket("pending")).toBe("pending");
    expect(commissionBucket("payable")).toBe("pending");
    expect(commissionBucket("held")).toBe("pending");
    expect(commissionBucket("paid")).toBe("paid");
    expect(isPendingCommission("payable")).toBe(true);
    expect(isPaidCommission("paid")).toBe(true);
    expect(commissionBucketLabel("payable")).toMatch(/pending/i);
    expect(commissionBucketLabel("paid")).toBe("Paid");
  });

  it("splits a book into pending and paid dollars", () => {
    const totals = pendingPaidTotals([
      { status: "pending", amount: "1132.28" },
      { status: "payable", amount: 200 },
      { status: "paid", amount: "804.50" },
      { status: "held", amount: 50 },
    ]);
    expect(totals.pending).toBeCloseTo(1382.28);
    expect(totals.paid).toBeCloseTo(804.5);
    expect(totals.pendingCount).toBe(3);
    expect(totals.paidCount).toBe(1);
  });

  it("does not invent Ana commission", () => {
    expect(fixture.risk.coverageA).toBe(321000);
    expect(pendingPaidTotals([])).toEqual({
      pending: 0,
      paid: 0,
      pendingCount: 0,
      paidCount: 0,
    });
  });
});
