import { describe, expect, it } from "vitest";
import {
  daysUntilRenewal,
  declaredCoverageFromElsewhere,
  elsewhereRenewalsInWindow,
  mergeDeclaredCoverage,
  parseElsewhereCoverage,
  seedElsewhereFromDeclared,
  serializeElsewhereCoverage,
} from "./elsewhere-coverage";

describe("elsewhere coverage persistence", () => {
  it("parses and serializes agent-entered rows", () => {
    const rows = parseElsewhereCoverage([
      {
        id: "a1",
        line: "AUTO",
        carrier: "Geico",
        renewalDate: "2026-11-01",
        roughPremium: "1800",
      },
      { line: "", carrier: "skip" },
    ]);
    expect(rows).toEqual([
      {
        id: "a1",
        line: "AUTO",
        carrier: "Geico",
        renewalDate: "2026-11-01",
        roughPremium: "1800",
      },
    ]);
    expect(JSON.parse(serializeElsewhereCoverage(rows))).toEqual(rows);
  });

  it("maps elsewhere rows onto other-carrier declared coverage", () => {
    expect(
      declaredCoverageFromElsewhere([
        {
          id: "1",
          line: "HO3",
          carrier: "Citizens",
          renewalDate: "",
          roughPremium: "",
        },
      ]),
    ).toEqual([{ line: "HO", carrierOfRecord: "other" }]);
  });

  it("merges field marks with elsewhere without inventing us", () => {
    const merged = mergeDeclaredCoverage(
      [{ line: "AUTO", carrierOfRecord: "other" }],
      [{ line: "FLOOD", carrierOfRecord: "other" }],
    );
    expect(merged.map((r) => r.line).sort()).toEqual(["AUTO", "FLOOD"]);
  });

  it("seeds elsewhere from legacy other-carrier marks when empty", () => {
    const seeded = seedElsewhereFromDeclared(
      [
        { line: "AUTO", carrierOfRecord: "other" },
        { line: "HO", carrierOfRecord: "us" },
      ],
      [],
    );
    expect(seeded).toHaveLength(1);
    expect(seeded[0]?.line).toMatch(/Auto/i);
  });

  it("flags renewals inside the 90-day chase window", () => {
    const asOf = new Date("2026-09-23T12:00:00");
    expect(daysUntilRenewal("2026-10-20", asOf)).toBe(27);
    const hits = elsewhereRenewalsInWindow(
      [
        {
          id: "soon",
          line: "AUTO",
          carrier: "Geico",
          renewalDate: "2026-10-20",
          roughPremium: "1k",
        },
        {
          id: "far",
          line: "HO",
          carrier: "State Farm",
          renewalDate: "2027-06-01",
          roughPremium: "",
        },
      ],
      { asOf, withinDays: 90 },
    );
    expect(hits.map((r) => r.id)).toEqual(["soon"]);
    expect(hits[0]?.daysUntil).toBe(27);
  });
});
