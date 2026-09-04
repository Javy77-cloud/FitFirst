import { describe, expect, it } from "vitest";
import { DESK_AS_OF } from "./as-of";
import type { HomePolicy } from "./aggregate";
import {
  activeAccountCount,
  bookRatios,
  cancelledInMonth,
  carrierCount,
  isNewBusiness,
  momDelta,
  writingsInMonth,
} from "./kpis";

function policy(partial: Partial<HomePolicy> & Pick<HomePolicy, "id" | "status" | "premium">): HomePolicy {
  return {
    contactId: "c1",
    carrierId: "car1",
    carrierName: "American Integrity",
    contactName: "Ruiz, Camila",
    policyNumber: "P-1",
    lineOfBusiness: "HO",
    effectiveDate: new Date("2026-09-01T00:00:00.000Z"),
    expirationDate: new Date("2027-09-01T00:00:00.000Z"),
    ...partial,
  };
}

describe("home KPI density math", () => {
  it("counts unique contacts and businesses with active/bound/pending as accounts", () => {
    const rows = [
      policy({ id: "1", status: "active", premium: 1000, contactId: "c1" }),
      policy({ id: "2", status: "pending", premium: 500, contactId: "c1" }),
      policy({ id: "3", status: "bound", premium: 2000, contactId: "", accountId: "a1" }),
      policy({ id: "4", status: "quoted", premium: 321000, contactId: "ana" }),
      policy({ id: "5", status: "cancelled", premium: 800, contactId: "gone" }),
    ];
    expect(activeAccountCount(rows)).toBe(2);
  });

  it("does not let Ana's unbound $321k shop inflate premium-per-account", () => {
    const rows = [
      policy({ id: "1", status: "active", premium: 2000, contactId: "c1" }),
      policy({ id: "ana", status: "quoted", premium: 321000, contactId: "ana" }),
    ];
    const ratios = bookRatios(rows);
    expect(ratios.inForcePremium).toBe(2000);
    expect(ratios.premiumPerAccount).toBe(2000);
    expect(ratios.premiumPerPolicy).toBe(2000);
    expect(ratios.policiesPerAccount).toBe(1);
  });

  it("splits new business vs renewal writings by original effective date", () => {
    const rows = [
      policy({
        id: "nb",
        status: "active",
        premium: 1800,
        originalEffectiveDate: new Date("2026-09-01T00:00:00.000Z"),
      }),
      policy({
        id: "rn",
        status: "active",
        premium: 2200,
        originalEffectiveDate: new Date("2024-09-01T00:00:00.000Z"),
      }),
    ];
    expect(isNewBusiness(rows[0])).toBe(true);
    expect(isNewBusiness(rows[1])).toBe(false);
    expect(writingsInMonth(rows, DESK_AS_OF, "new").map((p) => p.id)).toEqual(["nb"]);
    expect(writingsInMonth(rows, DESK_AS_OF, "renewal").map((p) => p.id)).toEqual(["rn"]);
  });

  it("counts cancellations this month from endedAt, not quotes", () => {
    const rows = [
      policy({
        id: "cx",
        status: "cancelled",
        premium: 900,
        endedAt: new Date("2026-09-02T00:00:00.000Z"),
      }),
      policy({
        id: "old",
        status: "cancelled",
        premium: 400,
        endedAt: new Date("2026-08-02T00:00:00.000Z"),
      }),
      policy({ id: "ana", status: "quoted", premium: 321000 }),
    ];
    expect(cancelledInMonth(rows, DESK_AS_OF).map((p) => p.id)).toEqual(["cx"]);
  });

  it("counts distinct in-force carriers only", () => {
    const rows = [
      policy({ id: "1", status: "active", premium: 1, carrierId: "a" }),
      policy({ id: "2", status: "bound", premium: 1, carrierId: "b" }),
      policy({ id: "3", status: "quoted", premium: 321000, carrierId: "c" }),
    ];
    expect(carrierCount(rows)).toBe(2);
  });

  it("formats MoM with a null percent when last month is zero", () => {
    expect(momDelta(100, 0)).toEqual({ change: 100, pct: null });
    expect(momDelta(120, 100)).toEqual({ change: 20, pct: 20 });
  });
});
