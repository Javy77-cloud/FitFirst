import { describe, expect, it } from "vitest";
import { matchCarrier, rankFits } from "./match";
import type { AppetiteRuleInput, PriorAttempt, RiskSnapshot } from "@/lib/domain";

const palmBay: RiskSnapshot = {
  yearBuilt: 1989,
  roofYear: 1989,
  roofCovering: "clay tile + metal",
  construction: "frame",
  openingProtection: "none",
  occupancy: "owner",
  stories: 1,
  pool: false,
  protectionClass: "4",
  milesToCoast: 8,
  city: "Palm Bay",
  county: "Brevard",
  coverageA: 321000,
  mobileHome: false,
  replacementCostEstimate: null,
  state: "FL",
};

const qbe: AppetiteRuleInput = {
  carrierId: "qbe",
  carrierName: "QBE",
  lineOfBusiness: "HO",
  minCovA: 150000,
  maxCovA: 1500000,
  minYearBuilt: null,
  maxRoofAge: null,
  allowedRoofCoverings: null,
  coastalAllowed: true,
  minMilesToCoast: 20,
  maxMilesToCoast: null,
  mobileAllowed: false,
  requiresOpeningProtection: false,
  maxStories: null,
  allowedConstruction: ["masonry"],
  allowedOccupancy: null,
  allowedCounties: null,
  excludedCounties: null,
  countyMinCovA: null,
  requireReplacementCost: false,
  rceFloorRatio: null,
  portalStatus: "open",
  dontWriteNotes: "Frame within 20 miles of coast.",
  writtenLines: ["HO"],
};

const surplus: AppetiteRuleInput = {
  carrierId: "southern-oak",
  carrierName: "Southern Oak Surplus",
  lineOfBusiness: "HO",
  minCovA: 200000,
  maxCovA: 750000,
  minYearBuilt: 1970,
  maxRoofAge: 50,
  allowedRoofCoverings: ["clay tile", "metal", "shingle"],
  coastalAllowed: true,
  minMilesToCoast: 0,
  maxMilesToCoast: null,
  mobileAllowed: false,
  requiresOpeningProtection: false,
  maxStories: null,
  allowedConstruction: ["frame", "masonry"],
  allowedOccupancy: null,
  allowedCounties: null,
  excludedCounties: null,
  countyMinCovA: null,
  requireReplacementCost: false,
  rceFloorRatio: null,
  portalStatus: "open",
  dontWriteNotes: null,
  writtenLines: ["HO"],
};

const vyrd: AppetiteRuleInput = {
  carrierId: "vyrd",
  carrierName: "VYRD",
  lineOfBusiness: "HO",
  minCovA: 250000,
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
  countyMinCovA: { Brevard: 350000 },
  requireReplacementCost: false,
  rceFloorRatio: null,
  portalStatus: "closed",
  dontWriteNotes: "Voluntary NB closed",
  writtenLines: ["HO"],
};

const rceFloor: AppetiteRuleInput = {
  ...surplus,
  carrierId: "sagesure",
  carrierName: "SageSure",
  requireReplacementCost: true,
  rceFloorRatio: 0.95,
};

describe("appetite matching", () => {
  it("marks QBE red for frame within 20 miles of coast", () => {
    const result = matchCarrier(palmBay, qbe, []);
    expect(result.band).toBe("red");
    expect(result.shoppable).toBe(false);
    expect(result.reasons.some((r) => r.code === "min_miles_coast" && r.severity === "fail")).toBe(
      true,
    );
  });

  it("keeps an in-appetite surplus market green", () => {
    const result = matchCarrier(palmBay, surplus, [], 2026);
    expect(result.band).toBe("green");
    expect(result.shoppable).toBe(true);
    expect(result.reasons.every((r) => r.severity === "pass")).toBe(true);
  });

  it("skips VYRD on portal closed and Brevard Cov A floor", () => {
    const result = matchCarrier(palmBay, vyrd, []);
    expect(result.band).toBe("red");
    expect(result.reasons.some((r) => r.code === "portal_closed")).toBe(true);
    expect(result.reasons.some((r) => r.code === "county_min_cov_a")).toBe(true);
  });

  it("treats missing RCE as yellow stretch, not a shop-all submit", () => {
    const result = matchCarrier(palmBay, rceFloor, []);
    expect(result.band).toBe("yellow");
    expect(result.shoppable).toBe(true);
    expect(result.reasons.some((r) => r.code === "rce_required")).toBe(true);
  });

  it("uses the decline log to skip a previously declined lookalike risk", () => {
    const prior: PriorAttempt[] = [
      {
        carrierId: "southern-oak",
        result: "declined",
        why: "UW closed after inspection",
        bindable: false,
        snapYearBuilt: 1989,
        snapRoofYear: 1989,
        snapRoofCovering: "clay tile",
        snapConstruction: "frame",
        snapCounty: "Brevard",
        snapMilesToCoast: 8,
        snapCoverageA: 321000,
      },
    ];
    const result = matchCarrier(palmBay, surplus, prior, 2026);
    expect(result.band).toBe("red");
    expect(result.learnedDecline).toBe(true);
  });

  it("ranks greens before yellows before reds", () => {
    const ranked = rankFits([
      matchCarrier(palmBay, qbe, []),
      matchCarrier(palmBay, surplus, [], 2026),
      matchCarrier(palmBay, rceFloor, []),
    ]);
    expect(ranked.map((r) => r.band)).toEqual(["green", "yellow", "red"]);
    expect(ranked[0].carrierName).toBe("Southern Oak Surplus");
  });
});
