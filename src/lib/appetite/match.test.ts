import { describe, expect, it } from "vitest";
import { matchCarrier, rankFits } from "./match";
import type { AppetiteRuleInput, PriorAttempt, RiskSnapshot } from "@/lib/domain";

const dib: RiskSnapshot = {
  yearBuilt: 1989,
  roofYear: 1989,
  roofCovering: "clay tile + metal",
  construction: "frame",
  openingProtection: "none",
  occupancy: "owner",
  stories: 1,
  pool: false,
  protectionClass: "3",
  milesToCoast: 8,
  city: "Palm Bay",
  county: "Brevard",
  coverageA: 321000,
  mobileHome: false,
  replacementCostEstimate: null,
  state: "FL",
};

function rule(partial: Partial<AppetiteRuleInput> & Pick<AppetiteRuleInput, "carrierId" | "carrierName">): AppetiteRuleInput {
  return {
    lineOfBusiness: "HO",
    minCovA: null,
    maxCovA: null,
    minYearBuilt: null,
    maxRoofAge: null,
    allowedRoofCoverings: null,
    coastalAllowed: true,
    minMilesToCoast: null,
    maxMilesToCoast: null,
    mobileAllowed: false,
    requiresOpeningProtection: false,
    maxStories: null,
    allowedConstruction: null,
    allowedOccupancy: null,
    allowedCounties: null,
    excludedCounties: null,
    countyMinCovA: null,
    requireReplacementCost: false,
    rceFloorRatio: null,
    portalStatus: "open",
    dontWriteNotes: null,
    writtenLines: ["HO"],
    ...partial,
  };
}

const qbe = rule({
  carrierId: "qbe",
  carrierName: "QBE",
  minMilesToCoast: 20,
  allowedConstruction: ["masonry"],
  dontWriteNotes: "Frame construction within 20 miles of coast.",
});

const benchmark = rule({
  carrierId: "benchmark",
  carrierName: "Benchmark",
  maxRoofAge: 20,
  allowedRoofCoverings: ["shingle", "metal"],
});

const sagesure = rule({
  carrierId: "sagesure",
  carrierName: "SageSure (Markel)",
  minCovA: 100000,
});

const vyrd = rule({
  carrierId: "vyrd",
  carrierName: "VYRD",
  portalStatus: "takeout_only",
  countyMinCovA: { Brevard: 350000 },
});

const tailrow = rule({
  carrierId: "tailrow",
  carrierName: "Tailrow",
});

const surplus = rule({
  carrierId: "surplus",
  carrierName: "Example surplus",
  minCovA: 200000,
  maxCovA: 750000,
  minYearBuilt: 1970,
  maxRoofAge: 50,
  allowedRoofCoverings: ["clay tile", "metal", "shingle"],
  allowedConstruction: ["frame", "masonry"],
  minMilesToCoast: 0,
});

describe("appetite matching", () => {
  it("marks QBE red for frame within 20 miles of coast", () => {
    const result = matchCarrier(dib, qbe, []);
    expect(result.band).toBe("red");
    expect(result.shoppable).toBe(false);
    expect(result.reasons.some((r) => r.code === "min_miles_coast" && r.severity === "fail")).toBe(
      true,
    );
  });

  it("does not treat clay tile + metal as metal-only appetite", () => {
    const result = matchCarrier(dib, benchmark, [], 2026);
    expect(result.band).toBe("red");
    expect(result.reasons.some((r) => r.code === "roof_covering")).toBe(true);
    expect(result.reasons.some((r) => r.code === "roof_age")).toBe(true);
  });

  it("does not promote a house RCE floor into SageSure published min Cov A", () => {
    const result = matchCarrier(dib, sagesure, []);
    expect(result.reasons.some((r) => r.code === "min_cov_a" && r.severity === "fail")).toBe(false);
    expect(result.band).toBe("green");
  });

  it("applies VYRD Brevard $350k as a county rule, not a universal min", () => {
    const brevard = matchCarrier(dib, vyrd, []);
    expect(brevard.band).toBe("red");
    expect(brevard.reasons.some((r) => r.code === "county_min_cov_a")).toBe(true);

    const orange = matchCarrier({ ...dib, county: "Orange", coverageA: 321000 }, vyrd, []);
    expect(orange.reasons.some((r) => r.code === "county_min_cov_a")).toBe(false);
    expect(orange.band).toBe("yellow");
  });

  it("treats a quoted-but-not-bindable attempt as a learned skip", () => {
    const prior: PriorAttempt[] = [
      {
        carrierId: "american-integrity",
        result: "quoted",
        why: "Roof age + RCS requires UW",
        bindable: false,
        snapYearBuilt: 1989,
        snapRoofYear: 1989,
        snapRoofCovering: "clay tile + metal",
        snapConstruction: "frame",
        snapCounty: "Brevard",
        snapMilesToCoast: 8,
        snapCoverageA: 321000,
      },
    ];
    const result = matchCarrier(
      dib,
      rule({ carrierId: "american-integrity", carrierName: "American Integrity" }),
      prior,
      2026,
    );
    expect(result.band).toBe("red");
    expect(result.learnedDecline).toBe(true);
  });

  it("uses the floor log to skip a lookalike house without changing published min Cov A", () => {
    const prior: PriorAttempt[] = [
      {
        carrierId: "tailrow",
        result: "floor_only",
        why: "Building RCE outside allowable range",
        bindable: false,
        snapYearBuilt: 1989,
        snapRoofYear: 1989,
        snapRoofCovering: "clay tile + metal",
        snapConstruction: "frame",
        snapCounty: "Brevard",
        snapMilesToCoast: 8,
        snapCoverageA: 321000,
      },
    ];
    expect(matchCarrier(dib, tailrow, []).band).toBe("green");
    const learned = matchCarrier(dib, tailrow, prior);
    expect(learned.band).toBe("red");
    expect(learned.learnedDecline).toBe(true);
  });

  it("ranks greens before yellows before reds", () => {
    const takeout = rule({
      carrierId: "hoc",
      carrierName: "Homeowners Choice",
      portalStatus: "takeout_only",
    });
    const ranked = rankFits([
      matchCarrier(dib, qbe, []),
      matchCarrier(dib, surplus, [], 2026),
      matchCarrier(dib, takeout, []),
    ]);
    expect(ranked.map((r) => r.band)).toEqual(["green", "yellow", "red"]);
    expect(ranked[0].carrierName).toBe("Example surplus");
  });
});
