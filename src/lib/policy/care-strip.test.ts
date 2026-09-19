import { describe, expect, it } from "vitest";
import { buildPolicyCareItems, policyTabCareCounts } from "./care-strip";

describe("policy care strip", () => {
  const asOf = new Date("2026-09-19T12:00:00.000Z");

  it("stays quiet when nothing waits", () => {
    expect(
      buildPolicyCareItems({
        expirationDate: "2027-03-01T00:00:00.000Z",
        updatedAt: "2026-09-18T12:00:00.000Z",
        status: "active",
        missingDocs: 0,
        pendingEndorsements: 0,
        openClaims: 0,
        asOf,
      }),
    ).toEqual([]);
  });

  it("jumps to the waiting tab and only counts open work", () => {
    const items = buildPolicyCareItems({
      expirationDate: "2026-09-25T00:00:00.000Z",
      updatedAt: "2026-09-01T12:00:00.000Z",
      status: "active",
      missingDocs: 2,
      pendingEndorsements: 1,
      openClaims: 1,
      asOf,
    });
    expect(items.map((item) => item.tab)).toEqual(["overview", "documents", "endorsements", "claims"]);
    expect(policyTabCareCounts(items).documents).toBe(2);
    expect(policyTabCareCounts(items).coverage).toBeUndefined();
  });
});
