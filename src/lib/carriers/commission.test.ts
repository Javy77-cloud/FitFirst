import { describe, expect, it } from "vitest";
import {
  calculateAgencyCommission,
  normalizeCommissionSchedule,
  parseBonusThresholds,
  parseCommissionScheduleJson,
  parseMoneyAmount,
  parsePercentPoints,
  pickScheduleRowForLob,
} from "./commission";

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

describe("commission calculator helpers", () => {
  it("parses percent points and money thresholds", () => {
    expect(parsePercentPoints("12%")).toBe(12);
    expect(parsePercentPoints("10.5")).toBe(10.5);
    expect(parseMoneyAmount("50k")).toBe(50_000);
    expect(parseMoneyAmount("$100,000")).toBe(100_000);
  });

  it("parses bonus threshold tiers", () => {
    expect(parseBonusThresholds("50k:+1%; 100k → +2%")).toEqual([
      { threshold: 50_000, bonusPctPoints: 1, raw: "50k:+1%" },
      { threshold: 100_000, bonusPctPoints: 2, raw: "100k → +2%" },
    ]);
  });

  it("picks LOB schedule then All", () => {
    const rows = normalizeCommissionSchedule([
      { lob: "All", newBusinessPct: "8", renewalPct: "6", bonusThresholds: "" },
      { lob: "HO", newBusinessPct: "12", renewalPct: "10", bonusThresholds: "50k:+1%" },
    ]);
    expect(pickScheduleRowForLob(rows, "HO")?.newBusinessPct).toBe("12");
    expect(pickScheduleRowForLob(rows, "GL")?.lob).toBe("All");
  });

  it("calculates agency cut with bonus tier", () => {
    const row = {
      lob: "HO",
      newBusinessPct: "12",
      renewalPct: "10",
      bonusThresholds: "50k:+1%; 100k:+2%",
    };
    const mid = calculateAgencyCommission({ premium: 60_000, kind: "new", scheduleRow: row });
    expect(mid?.basePctPoints).toBe(12);
    expect(mid?.bonusPctPoints).toBe(1);
    expect(mid?.effectivePctPoints).toBe(13);
    expect(mid?.agencyCut).toBe(7800);

    const renew = calculateAgencyCommission({
      premium: 10_000,
      kind: "renewal",
      scheduleRow: row,
    });
    expect(renew?.effectivePctPoints).toBe(10);
    expect(renew?.agencyCut).toBe(1000);
  });
});
