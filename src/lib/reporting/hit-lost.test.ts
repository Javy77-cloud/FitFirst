import { describe, expect, it } from "vitest";
import { buildHitLostReport, hitPct } from "./hit-lost";
import { DEAL_ID, ELENA_DEAL_ID, CARRIER_IDS } from "@/lib/fixtures/ids";

describe("hitPct", () => {
  it("is bound ÷ quoted, rounded to one decimal", () => {
    expect(hitPct(1, 4)).toBe(25);
    expect(hitPct(1, 3)).toBe(33.3);
    expect(hitPct(0, 0)).toBe(0);
    expect(hitPct(8, 4)).toBe(100);
  });
});

describe("buildHitLostReport", () => {
  it("counts Ana as quoted-not-bound and Elena as a hit; tallies lost reasons", () => {
    const report = buildHitLostReport({
      attempts: [
        {
          id: "a1",
          dealId: DEAL_ID,
          carrierId: CARRIER_IDS.americanIntegrity,
          carrierName: "American Integrity",
          result: "quoted",
          bindable: false,
          premium: 5607.53,
          lostReason: null,
        },
        {
          id: "a2",
          dealId: DEAL_ID,
          carrierId: CARRIER_IDS.qbe,
          carrierName: "QBE",
          result: "declined",
          bindable: false,
          premium: null,
          lostReason: "uw_construction",
        },
        {
          id: "a3",
          dealId: DEAL_ID,
          carrierId: CARRIER_IDS.benchmark,
          carrierName: "Benchmark",
          result: "declined",
          bindable: false,
          premium: null,
          lostReason: "uw_roof",
        },
        {
          id: "a4",
          dealId: DEAL_ID,
          carrierId: CARRIER_IDS.hadron,
          carrierName: "Hadron",
          result: "declined",
          bindable: false,
          premium: null,
          lostReason: "uw_roof",
        },
        {
          id: "a5",
          dealId: DEAL_ID,
          carrierId: CARRIER_IDS.tailrow,
          carrierName: "Tailrow",
          result: "floor_only",
          bindable: false,
          premium: 7157,
          lostReason: null,
        },
      ],
      quotes: [
        {
          id: "q1",
          dealId: ELENA_DEAL_ID,
          carrierId: CARRIER_IDS.americanIntegrity,
          carrierName: "American Integrity",
          premium: 2840,
          lostReason: null,
        },
        {
          id: "q2",
          dealId: ELENA_DEAL_ID,
          carrierId: CARRIER_IDS.tailrow,
          carrierName: "Tailrow",
          premium: 3120,
          lostReason: null,
        },
      ],
      policies: [
        {
          dealId: ELENA_DEAL_ID,
          carrierId: CARRIER_IDS.americanIntegrity,
          carrierName: "American Integrity",
        },
      ],
    });

    expect(report.quotedCount).toBe(3);
    expect(report.declinedCount).toBe(3);
    expect(report.boundCount).toBe(1);
    expect(report.shopsQuoted).toBe(2);
    expect(report.shopsBound).toBe(1);
    expect(report.quoteHitPct).toBe(33.3);
    expect(report.shopHitPct).toBe(50);
    expect(report.lostReasons.find((r) => r.reason === "uw_roof")?.count).toBe(2);
    expect(report.lostReasons.find((r) => r.reason === "uw_construction")?.count).toBe(1);
    const ai = report.carriers.find((c) => c.carrierId === CARRIER_IDS.americanIntegrity);
    expect(ai?.quoted).toBe(2);
    expect(ai?.bound).toBe(1);
    expect(ai?.hitPct).toBe(50);
  });

  it("does not double-count a quote that already has a quoted attempt", () => {
    const report = buildHitLostReport({
      attempts: [
        {
          id: "a1",
          dealId: ELENA_DEAL_ID,
          carrierId: CARRIER_IDS.americanIntegrity,
          carrierName: "American Integrity",
          result: "quoted",
          bindable: true,
          premium: 2840,
          lostReason: null,
        },
      ],
      quotes: [
        {
          id: "q1",
          dealId: ELENA_DEAL_ID,
          carrierId: CARRIER_IDS.americanIntegrity,
          carrierName: "American Integrity",
          premium: 2840,
          lostReason: null,
        },
      ],
      policies: [],
    });
    expect(report.quotedCount).toBe(1);
  });

  it("ignores in-force book policies that were never quoted, so hit % cannot exceed 100", () => {
    const report = buildHitLostReport({
      attempts: [
        {
          id: "a1",
          dealId: DEAL_ID,
          carrierId: CARRIER_IDS.americanIntegrity,
          carrierName: "American Integrity",
          result: "quoted",
          bindable: false,
          premium: 5607.53,
          lostReason: null,
        },
      ],
      quotes: [
        {
          id: "q1",
          dealId: ELENA_DEAL_ID,
          carrierId: CARRIER_IDS.americanIntegrity,
          carrierName: "American Integrity",
          premium: 2840,
          lostReason: null,
        },
      ],
      policies: [
        {
          dealId: ELENA_DEAL_ID,
          carrierId: CARRIER_IDS.americanIntegrity,
          carrierName: "American Integrity",
        },
        {
          dealId: "book-only-deal",
          carrierId: CARRIER_IDS.americanIntegrity,
          carrierName: "American Integrity",
        },
        {
          dealId: "heritage-book",
          carrierId: "heritage",
          carrierName: "Heritage Property & Casualty",
        },
      ],
    });
    expect(report.quotedCount).toBe(2);
    expect(report.boundCount).toBe(1);
    expect(report.quoteHitPct).toBe(50);
    expect(report.quoteHitPct).toBeLessThanOrEqual(100);
    expect(report.carriers.some((c) => c.carrierName === "Heritage Property & Casualty")).toBe(false);
    const ai = report.carriers.find((c) => c.carrierId === CARRIER_IDS.americanIntegrity);
    expect(ai?.bound).toBe(1);
    expect(ai?.hitPct).toBe(50);
  });
});
