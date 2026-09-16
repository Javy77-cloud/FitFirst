import { describe, expect, it } from "vitest";
import { matchCarrier } from "./match";
import type { AppetiteRuleInput, RiskSnapshot } from "@/lib/domain";
import {
  TRIDENT_HO_APPETITE,
  minCovAToken,
  parseMinCovAToken,
  publishedHoBySlug,
} from "./published-appetite";

function hoRisk(coverageA: number): RiskSnapshot {
  return {
    yearBuilt: 2015,
    roofYear: 2018,
    roofCovering: "shingle",
    construction: "masonry",
    openingProtection: "full",
    occupancy: "owner",
    stories: 1,
    pool: false,
    protectionClass: "3",
    milesToCoast: 12,
    city: "Tampa",
    county: "Hillsborough",
    coverageA,
    mobileHome: false,
    replacementCostEstimate: null,
    state: "FL",
  };
}

function publishedRule(partial: Partial<AppetiteRuleInput> = {}): AppetiteRuleInput {
  return {
    carrierId: "carrier-1",
    carrierName: TRIDENT_HO_APPETITE.legalName,
    lineOfBusiness: "HO",
    minCovA: TRIDENT_HO_APPETITE.minCovA,
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
    appetiteNotes: TRIDENT_HO_APPETITE.notesForAgent,
    ...partial,
  };
}

describe("published HO appetite", () => {
  it("soft-filters Cov A below the published minimum and shows the agent note", () => {
    expect(publishedHoBySlug("trident_reciprocal")?.minCovA).toBe(300_000);
    expect(minCovAToken(300_000)).toBe("min_cov_a:300000");
    expect(parseMinCovAToken("min_cov_a:300000")).toBe(300_000);

    const skip = matchCarrier(hoRisk(250_000), publishedRule(), []);
    expect(skip.band).toBe("red");
    expect(skip.shoppable).toBe(false);
    expect(skip.reasons.some((r) => r.code === "min_cov_a" && r.severity === "fail")).toBe(true);

    const stretch = matchCarrier(hoRisk(280_000), publishedRule(), []);
    expect(stretch.band).toBe("yellow");
    expect(stretch.reasons.some((r) => r.code === "min_cov_a" && r.severity === "stretch")).toBe(true);

    const ok = matchCarrier(hoRisk(310_000), publishedRule(), []);
    expect(ok.band).toBe("green");
    expect(ok.reasons.some((r) => r.code === "appetite_note")).toBe(true);
    expect(ok.reasons.find((r) => r.code === "appetite_note")?.message).toMatch(/re-shop/i);
  });
});
