import { describe, expect, it } from "vitest";
import { buildMarketCompareRows } from "./market-compare";

describe("buildMarketCompareRows", () => {
  const carriers = [
    {
      id: "1",
      name: "Alpha Mutual",
      active: true,
      writtenLines: ["HO", "AUTO"],
      appetiteNotes: "Writes coastal HO3",
      dontWriteNotes: "No mobile homes",
      amBestRating: "A",
      amBestOutlook: "Stable",
      commissionSchedule: [
        { lob: "HO", newBusinessPct: "12", renewalPct: "10", bonusThresholds: "50k:+1%" },
      ],
      newBusinessCommPct: null,
      renewalCommPct: null,
    },
    {
      id: "2",
      name: "Beta Flood",
      active: true,
      writtenLines: ["FLOOD"],
      appetiteNotes: "NFIP + private",
      dontWriteNotes: "",
      amBestRating: "A-",
      amBestOutlook: "Positive",
      commissionSchedule: [],
      newBusinessCommPct: "15",
      renewalCommPct: "12",
    },
    {
      id: "3",
      name: "Gamma Life",
      active: false,
      writtenLines: ["LIFE"],
      appetiteNotes: "Term only",
      dontWriteNotes: "No UL",
      amBestRating: "B++",
      amBestOutlook: "",
      commissionSchedule: [
        { lob: "LIFE", newBusinessPct: "50", renewalPct: "3", bonusThresholds: "" },
      ],
      newBusinessCommPct: null,
      renewalCommPct: null,
    },
  ];

  it("filters to carriers that write or schedule the LOB", () => {
    const rows = buildMarketCompareRows(carriers, "HO");
    expect(rows.map((r) => r.carrierName)).toEqual(["Alpha Mutual"]);
    expect(rows[0].newBusinessPct).toBe("12");
    expect(rows[0].renewalPct).toBe("10");
    expect(rows[0].amBestRating).toBe("A");
    expect(rows[0].appetite).toContain("coastal");
    expect(rows[0].dontWrite).toContain("mobile");
  });

  it("includes schedule-only fallback via All rates for flood writer", () => {
    const rows = buildMarketCompareRows(carriers, "FLOOD");
    expect(rows).toHaveLength(1);
    expect(rows[0].carrierName).toBe("Beta Flood");
    expect(rows[0].newBusinessPct).toBe("15");
  });
});
