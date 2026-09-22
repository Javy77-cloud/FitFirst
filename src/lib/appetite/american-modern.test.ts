import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appointmentLine, WRITTEN_LINE_LABELS } from "@/lib/domain";
import type { AppetiteRuleInput, RiskSnapshot } from "@/lib/domain";
import { COMMON_CARRIER_OPTIONS } from "@/lib/custom-fields/starter-picklists";
import {
  AMERICAN_MODERN_CARRIER_ID,
  AMERICAN_MODERN_CARRIER_NAME,
} from "@/lib/fixtures/ids";
import { AMERICAN_MODERN_SLUG, DEFAULT_FL_HO_ORDER } from "./gate/fl-ho-order";
import { slugFromCarrierName } from "./gate/identity";
import { matchCarrier } from "./match";
import {
  AMERICAN_MODERN_CARRIER_INFO,
  AMERICAN_MODERN_DONT_WRITE,
  AMERICAN_MODERN_HO_APPETITE,
  AMERICAN_MODERN_HO_NOTES,
  AMERICAN_MODERN_WEBSITE,
  PUBLISHED_HO_APPETITE,
} from "./published-appetite";

function source(rel: string) {
  return readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

function hoRisk(mobileHome: boolean): RiskSnapshot {
  return {
    yearBuilt: 1998,
    roofYear: 2016,
    roofCovering: "shingle",
    construction: "frame",
    openingProtection: "none",
    occupancy: "owner",
    stories: 1,
    pool: false,
    protectionClass: "4",
    milesToCoast: 12,
    city: "Ocala",
    county: "Marion",
    coverageA: 180_000,
    mobileHome,
    replacementCostEstimate: null,
    state: "FL",
  };
}

function americanModernRule(): AppetiteRuleInput {
  return {
    carrierId: AMERICAN_MODERN_SLUG,
    carrierName: AMERICAN_MODERN_CARRIER_NAME,
    lineOfBusiness: "HO",
    minCovA: AMERICAN_MODERN_HO_APPETITE.minCovA,
    maxCovA: AMERICAN_MODERN_HO_APPETITE.maxCovA,
    minYearBuilt: AMERICAN_MODERN_HO_APPETITE.minYearBuilt,
    maxRoofAge: AMERICAN_MODERN_HO_APPETITE.maxRoofAge,
    allowedRoofCoverings: AMERICAN_MODERN_HO_APPETITE.allowedRoofCoverings,
    coastalAllowed: true,
    minMilesToCoast: AMERICAN_MODERN_HO_APPETITE.minMilesToCoast,
    maxMilesToCoast: null,
    mobileAllowed: AMERICAN_MODERN_HO_APPETITE.mobileAllowed,
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
    dontWriteNotes: AMERICAN_MODERN_DONT_WRITE,
    writtenLines: ["HO"],
    appointed: true,
    appetiteNotes: AMERICAN_MODERN_HO_NOTES,
  };
}

describe("American Modern", () => {
  it("publishes MHO appetite with mobile allowed and no invented UW mins", () => {
    expect(AMERICAN_MODERN_HO_APPETITE.legalName).toBe(AMERICAN_MODERN_CARRIER_NAME);
    expect(AMERICAN_MODERN_HO_APPETITE.slug).toBe(AMERICAN_MODERN_SLUG);
    expect(AMERICAN_MODERN_HO_APPETITE.line).toBe("MHO");
    expect(AMERICAN_MODERN_HO_APPETITE.mobileAllowed).toBe(true);
    expect(AMERICAN_MODERN_HO_APPETITE.minCovA).toBeNull();
    expect(AMERICAN_MODERN_HO_APPETITE.maxCovA).toBeNull();
    expect(AMERICAN_MODERN_HO_APPETITE.minYearBuilt).toBeNull();
    expect(AMERICAN_MODERN_HO_APPETITE.maxRoofAge).toBeNull();
    expect(AMERICAN_MODERN_HO_APPETITE.minMilesToCoast).toBeNull();
    expect(AMERICAN_MODERN_HO_APPETITE.website).toBe(AMERICAN_MODERN_WEBSITE);
    expect(AMERICAN_MODERN_HO_APPETITE.website).toBe("https://www.americanmodern.com");
    expect(AMERICAN_MODERN_HO_APPETITE.csPhone).toBeNull();
    expect(AMERICAN_MODERN_HO_APPETITE.supportEmail).toBeNull();
    expect(AMERICAN_MODERN_HO_APPETITE.placement).toBe("");
    expect(AMERICAN_MODERN_HO_NOTES).toMatch(/\bMHO\b/);
    expect(AMERICAN_MODERN_HO_NOTES).not.toMatch(/\bHMO\b/);
    expect(AMERICAN_MODERN_HO_NOTES).toMatch(/standard HO-3/);
    expect(AMERICAN_MODERN_HO_NOTES).toMatch(/Does not write standard personal auto, standard HO-3 homeowners, or life/);
    expect(AMERICAN_MODERN_HO_NOTES).toMatch(/No UW mins sheet yet/);
    expect(AMERICAN_MODERN_HO_NOTES).toMatch(/all 50 states/);
    expect(AMERICAN_MODERN_HO_NOTES).toMatch(/no age cap/);
    expect(AMERICAN_MODERN_HO_NOTES).toMatch(/collector and classic cars/);
    expect(AMERICAN_MODERN_CARRIER_INFO).toMatch(/\bMHO\b/);
    expect(AMERICAN_MODERN_CARRIER_INFO).toMatch(/DP1/);
    expect(AMERICAN_MODERN_CARRIER_INFO).toMatch(/DP3/);
    expect(AMERICAN_MODERN_CARRIER_INFO).not.toMatch(/\bHMO\b/);
    expect(AMERICAN_MODERN_DONT_WRITE).toMatch(/standard HO-3/);
    expect(PUBLISHED_HO_APPETITE.map((row) => row.slug)).not.toContain(AMERICAN_MODERN_SLUG);
    expect(DEFAULT_FL_HO_ORDER).not.toContain(AMERICAN_MODERN_SLUG);
    expect(COMMON_CARRIER_OPTIONS).toContain(AMERICAN_MODERN_CARRIER_NAME);
    expect(slugFromCarrierName("American Modern")).toBe(AMERICAN_MODERN_SLUG);
    expect(slugFromCarrierName("American Modern Insurance")).toBe(AMERICAN_MODERN_SLUG);
    expect(slugFromCarrierName("American Integrity")).toBe("american_integrity");
    expect(Object.keys(WRITTEN_LINE_LABELS)).not.toContain("COLLECTOR_AUTO");
    expect(appointmentLine("MOTORCYCLE")).toBe("AUTO");
  });

  it("accepts manufactured homes on the HO rule and keeps mins unset", () => {
    const rule = americanModernRule();
    expect(rule.mobileAllowed).toBe(true);
    expect(rule.writtenLines).toEqual(["HO"]);
    expect(rule.minCovA).toBeNull();

    const mobile = matchCarrier(hoRisk(true), rule, []);
    expect(mobile.band).toBe("green");
    expect(mobile.reasons.some((reason) => reason.code === "mobile")).toBe(false);
    expect(mobile.reasons.some((reason) => reason.message.includes("standard HO-3"))).toBe(true);

    const declined = matchCarrier(hoRisk(true), { ...rule, mobileAllowed: false, carrierId: "other" }, []);
    expect(declined.band).toBe("red");
    expect(declined.reasons.some((reason) => reason.code === "mobile")).toBe(true);
  });

  it("upserts the desk row by name without a portal secret or an AUTO written line", () => {
    const seed = source("src/lib/db/seed-american-modern.ts");
    expect(seed).toContain("seedAmericanModern");
    expect(seed).toContain("carrierInfo: AMERICAN_MODERN_CARRIER_INFO");
    expect(seed).toContain("appetiteNotes: AMERICAN_MODERN_APPETITE_NOTE");
    expect(seed).toContain("mobileAllowed: AMERICAN_MODERN_HO_APPETITE.mobileAllowed");
    expect(seed).toMatch(/written\.add\("HO"\)/);
    expect(seed).not.toMatch(/written\.add\("AUTO"\)/);
    expect(seed).not.toMatch(/portalLogin/);
    expect(seed).not.toMatch(/portalPassword/);
    expect(seed).toMatch(/%american modern%/);
    expect(source("src/lib/db/seed.ts")).toMatch(/seedAmericanModern/);

    const sql = source("drizzle/0149_american_modern.sql");
    expect(sql).toContain(AMERICAN_MODERN_CARRIER_ID);
    expect(sql).toContain(AMERICAN_MODERN_CARRIER_NAME);
    expect(sql).toContain(AMERICAN_MODERN_HO_NOTES);
    expect(sql).toContain(AMERICAN_MODERN_CARRIER_INFO);
    expect(sql).toContain("https://www.americanmodern.com");
    expect(sql).toContain(`'["HO"]'::jsonb`);
    expect(sql).toContain("mobile_allowed = true");
    expect(sql).toContain("min_cov_a = NULL");
    expect(sql).toMatch(/'HO', true, true, false, false/);
    expect(sql).toMatch(/lower\(c\.name\) LIKE '%american modern%'/);
    expect(sql).toMatch(/\bMHO\b/);
    expect(sql).toMatch(/standard HO-3/);
    expect(sql).not.toMatch(/\bHMO\b/);
    expect(sql).not.toMatch(/"AUTO"/);
    expect(sql).not.toMatch(/portal_login/);
    expect(sql).not.toMatch(/portal_password/);
    expect(source("drizzle/meta/_journal.json")).toMatch(/0149_american_modern/);
  });
});
