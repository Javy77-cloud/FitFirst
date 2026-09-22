import { describe, expect, it } from "vitest";
import {
  buildPolicyCareItems,
  formatMissingDocsWhy,
  policyTabCareCounts,
  shouldShowManualRenewalHelp,
} from "./care-strip";

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

  it("jumps renewal care to documents with soft why copy", () => {
    const items = buildPolicyCareItems({
      expirationDate: "2026-10-06T00:00:00.000Z",
      updatedAt: "2026-09-18T12:00:00.000Z",
      status: "active",
      missingDocs: 0,
      pendingEndorsements: 0,
      openClaims: 0,
      asOf,
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      key: "renewal",
      tab: "documents",
      label: "Renewal docs",
    });
    expect(items[0]?.why).toMatch(/Expires in 17 days — upload current \+ renewal paper here/);
    expect(shouldShowManualRenewalHelp({
      expirationDate: "2026-10-06T00:00:00.000Z",
      status: "active",
      asOf,
    })).toBe(true);
  });

  it("jumps to the waiting tab and only counts open work", () => {
    const items = buildPolicyCareItems({
      expirationDate: "2026-09-25T00:00:00.000Z",
      updatedAt: "2026-09-01T12:00:00.000Z",
      status: "active",
      missingDocs: 2,
      missingDocNames: ["Dec on file", "ID cards"],
      pendingEndorsements: 1,
      openClaims: 1,
      asOf,
    });
    expect(items.map((item) => item.tab)).toEqual([
      "documents",
      "documents",
      "endorsements",
      "claims",
    ]);
    expect(items.find((item) => item.key === "documents")?.why).toBe(
      "2 servicing files still missing: Dec on file and ID cards",
    );
    expect(policyTabCareCounts(items).documents).toBe(3);
    expect(policyTabCareCounts(items).overview).toBeUndefined();
    expect(policyTabCareCounts(items).coverage).toBeUndefined();
  });

  it("names a single missing servicing file", () => {
    expect(formatMissingDocsWhy(1, ["Dec on file"])).toBe(
      "1 servicing file still missing: Dec on file",
    );
  });

  it("hides manual renewal help when expiration is far out", () => {
    expect(
      shouldShowManualRenewalHelp({
        expirationDate: "2027-03-01T00:00:00.000Z",
        status: "active",
        asOf,
      }),
    ).toBe(false);
  });
});
