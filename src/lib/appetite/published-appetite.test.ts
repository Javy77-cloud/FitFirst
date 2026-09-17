import { describe, expect, it } from "vitest";
import { matchCarrier } from "./match";
import type { AppetiteRuleInput, RiskSnapshot } from "@/lib/domain";
import {
  SOUTHERN_OAK_BULLETIN_DATE,
  SOUTHERN_OAK_DP_MAX_COV_A,
  SOUTHERN_OAK_HO_APPETITE,
  SOUTHERN_OAK_HO_NOTES,
  SOUTHERN_OAK_MAX_TIV,
  SOUTHERN_OAK_MIN_YEAR_BUILT,
  SOUTHERN_OAK_RATE_EFFECTIVE,
  TRIDENT_HO_APPETITE,
  TRIDENT_HO_NOTES,
  TRIDENT_QRG_AS_OF_YEAR,
  TRIDENT_QRG_VERSION,
  maxCovAToken,
  maxDwellingAgeToken,
  minCovAToken,
  minMilesToCoastToken,
  minYearBuiltToken,
  parseMaxCovAToken,
  parseMaxDwellingAgeToken,
  parseMinCovAToken,
  parseMinMilesToCoastToken,
  parseMinYearBuiltToken,
  parseProtectionClassToken,
  parseProtectionClassValue,
  protectionClassToken,
  publishedHoBySlug,
} from "./published-appetite";

function hoRisk(partial: Partial<RiskSnapshot> & Pick<RiskSnapshot, "coverageA">): RiskSnapshot {
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
    mobileHome: false,
    replacementCostEstimate: null,
    state: "FL",
    ...partial,
  };
}

function publishedRule(partial: Partial<AppetiteRuleInput> = {}): AppetiteRuleInput {
  return {
    carrierId: "carrier-1",
    carrierName: TRIDENT_HO_APPETITE.legalName,
    lineOfBusiness: "HO",
    minCovA: TRIDENT_HO_APPETITE.minCovA,
    maxCovA: TRIDENT_HO_APPETITE.maxCovA,
    minYearBuilt: TRIDENT_HO_APPETITE.minYearBuilt,
    maxRoofAge: TRIDENT_HO_APPETITE.maxRoofAge,
    allowedRoofCoverings: TRIDENT_HO_APPETITE.allowedRoofCoverings,
    coastalAllowed: true,
    minMilesToCoast: TRIDENT_HO_APPETITE.minMilesToCoast,
    maxMilesToCoast: null,
    mobileAllowed: TRIDENT_HO_APPETITE.mobileAllowed,
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

    const skip = matchCarrier(hoRisk({ coverageA: 250_000 }), publishedRule(), []);
    expect(skip.band).toBe("red");
    expect(skip.shoppable).toBe(false);
    expect(skip.reasons.some((r) => r.code === "min_cov_a" && r.severity === "fail")).toBe(true);

    const stretch = matchCarrier(hoRisk({ coverageA: 280_000 }), publishedRule(), []);
    expect(stretch.band).toBe("yellow");
    expect(stretch.reasons.some((r) => r.code === "min_cov_a" && r.severity === "stretch")).toBe(true);

    const ok = matchCarrier(hoRisk({ coverageA: 310_000 }), publishedRule(), []);
    expect(ok.band).toBe("green");
    expect(ok.reasons.some((r) => r.code === "appetite_note")).toBe(true);
    expect(ok.reasons.find((r) => r.code === "appetite_note")?.message).toMatch(/re-shop/i);
    expect(ok.reasons.find((r) => r.code === "appetite_note")?.message).toMatch(/WIND DRIVEN RAIN/);
  });

  it("encodes the QRG 06122026 Markets fields (max Cov A, age, coast, roof)", () => {
    expect(TRIDENT_QRG_VERSION).toBe("06122026");
    expect(TRIDENT_HO_APPETITE.maxCovA).toBe(5_000_000);
    expect(TRIDENT_HO_APPETITE.maxDwellingAgeYears).toBe(40);
    expect(TRIDENT_HO_APPETITE.minYearBuilt).toBe(TRIDENT_QRG_AS_OF_YEAR - 40);
    expect(TRIDENT_HO_APPETITE.minMilesToCoast).toBe(0.5);
    expect(TRIDENT_HO_APPETITE.maxRoofAge).toBe(15);
    expect(TRIDENT_HO_APPETITE.allowedRoofCoverings).toEqual(["shingle", "tile", "metal"]);
    expect(TRIDENT_HO_APPETITE.notesForAgent).toBe(TRIDENT_HO_NOTES);
    expect(TRIDENT_HO_APPETITE.hardDeclines).toEqual([
      "state!=FL",
      "mobile_home",
      "min_cov_a:300000",
      "max_cov_a:5000000",
      "max_dwelling_age:40",
      "min_miles_to_coast:0.5",
      "pc:10",
    ]);

    const overMax = matchCarrier(hoRisk({ coverageA: 5_100_000 }), publishedRule(), []);
    expect(overMax.reasons.some((r) => r.code === "max_cov_a" && r.severity === "fail")).toBe(true);

    const oldHome = matchCarrier(hoRisk({ coverageA: 310_000, yearBuilt: 1980 }), publishedRule(), []);
    expect(oldHome.reasons.some((r) => r.code === "year_built" && r.severity === "fail")).toBe(true);

    const closeCoast = matchCarrier(hoRisk({ coverageA: 310_000, milesToCoast: 0.25 }), publishedRule(), []);
    expect(closeCoast.reasons.some((r) => r.code === "min_miles_coast" && r.severity === "fail")).toBe(true);

    const oldRoof = matchCarrier(hoRisk({ coverageA: 310_000, roofYear: 2005 }), publishedRule(), [], 2026);
    expect(oldRoof.reasons.some((r) => r.code === "roof_age")).toBe(true);

    const flat = matchCarrier(hoRisk({ coverageA: 310_000, roofCovering: "flat" }), publishedRule(), []);
    expect(flat.reasons.some((r) => r.code === "roof_covering" && r.severity === "fail")).toBe(true);
  });

  it("parses parameterized gate tokens with the existing name:value convention", () => {
    expect(maxCovAToken(5_000_000)).toBe("max_cov_a:5000000");
    expect(parseMaxCovAToken("max_cov_a:5000000")).toBe(5_000_000);
    expect(maxDwellingAgeToken(40)).toBe("max_dwelling_age:40");
    expect(parseMaxDwellingAgeToken("max_dwelling_age:40")).toBe(40);
    expect(minMilesToCoastToken(0.5)).toBe("min_miles_to_coast:0.5");
    expect(parseMinMilesToCoastToken("min_miles_to_coast:0.5")).toBe(0.5);
    expect(protectionClassToken(10)).toBe("pc:10");
    expect(parseProtectionClassToken("pc:10")).toBe(10);
    expect(parseProtectionClassToken("pc:9")).toBe(9);
    expect(parseProtectionClassValue("PC10")).toBe(10);
    expect(parseProtectionClassValue("9")).toBe(9);
    expect(parseProtectionClassValue(null)).toBeNull();
    expect(parseMinCovAToken("older_roof")).toBeNull();
    expect(minYearBuiltToken(1950)).toBe("min_year_built:1950");
    expect(parseMinYearBuiltToken("min_year_built:1950")).toBe(1950);
  });

  it("encodes Southern Oak bulletin 2026-09-16 Markets fields (TIV, 1950+, DP3 $1M)", () => {
    expect(publishedHoBySlug("southern_oak")?.maxCovA).toBe(SOUTHERN_OAK_MAX_TIV);
    expect(SOUTHERN_OAK_HO_APPETITE.minYearBuilt).toBe(SOUTHERN_OAK_MIN_YEAR_BUILT);
    expect(SOUTHERN_OAK_HO_APPETITE.dpMaxCovA).toBe(SOUTHERN_OAK_DP_MAX_COV_A);
    expect(SOUTHERN_OAK_HO_APPETITE.bulletinDate).toBe(SOUTHERN_OAK_BULLETIN_DATE);
    expect(SOUTHERN_OAK_RATE_EFFECTIVE).toBe("2026-07-15");
    expect(SOUTHERN_OAK_HO_APPETITE.website).toBe("https://www.southernoak.com");
    expect(SOUTHERN_OAK_HO_APPETITE.agentPortalUrl).toMatch(/policyport/);
    expect(SOUTHERN_OAK_HO_APPETITE.notesForAgent).toBe(SOUTHERN_OAK_HO_NOTES);
    expect(SOUTHERN_OAK_HO_APPETITE.hardDeclines).toEqual([
      "mobile_home",
      "max_cov_a:7500000",
      "min_year_built:1950",
    ]);

    const oakRule = publishedRule({
      carrierName: SOUTHERN_OAK_HO_APPETITE.legalName,
      minCovA: SOUTHERN_OAK_HO_APPETITE.minCovA,
      maxCovA: SOUTHERN_OAK_HO_APPETITE.maxCovA,
      minYearBuilt: SOUTHERN_OAK_HO_APPETITE.minYearBuilt,
      maxRoofAge: SOUTHERN_OAK_HO_APPETITE.maxRoofAge,
      allowedRoofCoverings: SOUTHERN_OAK_HO_APPETITE.allowedRoofCoverings,
      minMilesToCoast: SOUTHERN_OAK_HO_APPETITE.minMilesToCoast,
      mobileAllowed: SOUTHERN_OAK_HO_APPETITE.mobileAllowed,
      appetiteNotes: SOUTHERN_OAK_HO_APPETITE.notesForAgent,
    });

    const overTiv = matchCarrier(hoRisk({ coverageA: 7_600_000 }), oakRule, []);
    expect(overTiv.reasons.some((r) => r.code === "max_cov_a" && r.severity === "fail")).toBe(true);

    const pre1950 = matchCarrier(hoRisk({ coverageA: 300_000, yearBuilt: 1944 }), oakRule, []);
    expect(pre1950.reasons.some((r) => r.code === "year_built" && r.severity === "fail")).toBe(true);

    const ok1950 = matchCarrier(hoRisk({ coverageA: 300_000, yearBuilt: 1950 }), oakRule, []);
    expect(ok1950.band).toBe("green");
    expect(ok1950.reasons.find((r) => r.code === "appetite_note")?.message).toMatch(/7\/15\/2026/);
    expect(ok1950.reasons.find((r) => r.code === "appetite_note")?.message).toMatch(/52 counties/);
    expect(ok1950.reasons.find((r) => r.code === "appetite_note")?.message).toMatch(/\$1 million/);
  });
});
