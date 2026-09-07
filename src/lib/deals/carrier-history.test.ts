import { describe, expect, it } from "vitest";
import {
  capturedFieldLabels,
  groupCarrierHistory,
  historyConfidence,
} from "./carrier-history";

describe("carrier history grouping", () => {
  it("builds one row per carrier per line and colors by confidence", () => {
    expect(historyConfidence({ pullCount: 1, hasCorrectionRule: false, laterPullAfterRule: false })).toBe(
      "single_source",
    );
    expect(historyConfidence({ pullCount: 2, hasCorrectionRule: false, laterPullAfterRule: false })).toBe(
      "verified",
    );
    expect(historyConfidence({ pullCount: 3, hasCorrectionRule: true, laterPullAfterRule: false })).toBe(
      "overridden",
    );
    expect(historyConfidence({ pullCount: 3, hasCorrectionRule: true, laterPullAfterRule: true })).toBe(
      "verified",
    );

    const rows = groupCarrierHistory(
      [
        {
          carrierId: "c1",
          carrierName: "Citizens",
          lineOfBusiness: "HO",
          attemptedAt: "2026-09-01T00:00:00.000Z",
          snap: { snapCoverageA: 321000, premium: "5607" },
        },
        {
          carrierId: "c1",
          carrierName: "Citizens",
          lineOfBusiness: "HO",
          attemptedAt: "2026-09-06T00:00:00.000Z",
          snap: { snapCoverageA: 321000 },
        },
        {
          carrierId: "c1",
          carrierName: "Citizens",
          lineOfBusiness: "AUTO",
          attemptedAt: "2026-09-04T00:00:00.000Z",
          snap: {},
        },
      ],
      [
        {
          carrierId: "c1",
          shopLine: "home",
          loggedAt: "2026-09-05T00:00:00.000Z",
          fieldKey: "coverage_a",
        },
      ],
    );

    expect(rows).toHaveLength(2);
    const ho = rows.find((row) => row.lineOfBusiness === "HO");
    expect(ho?.pullCount).toBe(2);
    expect(ho?.hasCorrectionRule).toBe(true);
    expect(ho?.laterPullAfterRule).toBe(true);
    expect(historyConfidence(ho!)).toBe("verified");
    expect(capturedFieldLabels({ snapCoverageA: 100, snapCity: "Melbourne", snapCounty: null })).toEqual([
      "city",
      "coverage A",
    ]);
  });
});
