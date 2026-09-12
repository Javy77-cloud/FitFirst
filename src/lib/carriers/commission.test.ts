import { describe, expect, it } from "vitest";
import { normalizeCommissionSchedule, parseCommissionScheduleJson } from "./commission";

describe("normalizeCommissionSchedule", () => {
  it("returns schedule rows when present", () => {
    expect(
      normalizeCommissionSchedule([
        { lob: "HO", newBusinessPct: "12", renewalPct: "10", bonusThresholds: "50k" },
      ]),
    ).toEqual([
      { lob: "HO", newBusinessPct: "12", renewalPct: "10", bonusThresholds: "50k" },
    ]);
  });

  it("falls back to scalar NB/renewal percents", () => {
    expect(
      normalizeCommissionSchedule([], { newBusinessPct: "11", renewalPct: "9" }),
    ).toEqual([{ lob: "All", newBusinessPct: "11", renewalPct: "9", bonusThresholds: "" }]);
  });

  it("parses JSON schedule", () => {
    expect(
      parseCommissionScheduleJson(
        JSON.stringify([{ lob: "AUTO", new_business_pct: "8", renewal_pct: "6" }]),
      ),
    ).toEqual([{ lob: "AUTO", newBusinessPct: "8", renewalPct: "6", bonusThresholds: "" }]);
  });
});
