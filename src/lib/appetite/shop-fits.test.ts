import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { CARRIER_IDS } from "@/lib/fixtures/ids";
import type { AppetiteRuleInput, PriorAttempt, RiskSnapshot } from "@/lib/domain";
import { ORTEGA_FIT } from "@/lib/fixtures/ortega-ho3";
import { evaluateShopFits, shopCounts } from "./shop-fits";

type CarrierKey = keyof typeof CARRIER_IDS;

const dib: RiskSnapshot = {
  yearBuilt: fixture.risk.yearBuilt,
  roofYear: fixture.risk.roofYear,
  roofCovering: fixture.risk.roofCovering,
  construction: fixture.risk.construction,
  openingProtection: fixture.risk.openingProtection,
  occupancy: fixture.risk.occupancy,
  stories: fixture.risk.stories,
  pool: fixture.risk.pool,
  protectionClass: fixture.risk.protectionClass,
  milesToCoast: fixture.risk.milesToCoast,
  city: fixture.risk.city,
  county: fixture.risk.county,
  coverageA: fixture.risk.coverageA,
  mobileHome: false,
  replacementCostEstimate: null,
  state: fixture.risk.state,
};

const ortega: RiskSnapshot = {
  yearBuilt: ORTEGA_FIT.yearBuilt,
  roofYear: ORTEGA_FIT.roofYear,
  roofCovering: ORTEGA_FIT.roofCovering,
  construction: ORTEGA_FIT.construction,
  openingProtection: ORTEGA_FIT.openingProtection,
  occupancy: ORTEGA_FIT.occupancy,
  stories: ORTEGA_FIT.stories,
  pool: ORTEGA_FIT.pool,
  protectionClass: ORTEGA_FIT.protectionClass,
  milesToCoast: ORTEGA_FIT.milesToCoast,
  city: ORTEGA_FIT.city,
  county: ORTEGA_FIT.county,
  coverageA: ORTEGA_FIT.coverageA,
  mobileHome: false,
  replacementCostEstimate: null,
  state: ORTEGA_FIT.state,
};

function fixtureRules(appointed: boolean | null = true): AppetiteRuleInput[] {
  return fixture.carriers.map((carrier) => {
    const r = carrier.rule;
    return {
      carrierId: CARRIER_IDS[carrier.key as CarrierKey],
      carrierName: carrier.name,
      lineOfBusiness: r.lineOfBusiness,
      minCovA: "minCovA" in r ? (r.minCovA as number) : null,
      maxCovA: null,
      minYearBuilt: null,
      maxRoofAge: "maxRoofAge" in r ? (r.maxRoofAge as number) : null,
      allowedRoofCoverings:
        "allowedRoofCoverings" in r ? (r.allowedRoofCoverings as string[]) : null,
      coastalAllowed: true,
      minMilesToCoast: "minMilesToCoast" in r ? (r.minMilesToCoast as number) : null,
      maxMilesToCoast: null,
      mobileAllowed: false,
      requiresOpeningProtection: false,
      maxStories: null,
      allowedConstruction: "allowedConstruction" in r ? (r.allowedConstruction as string[]) : null,
      allowedOccupancy: null,
      allowedCounties: null,
      excludedCounties: null,
      countyMinCovA: "countyMinCovA" in r ? (r.countyMinCovA as Record<string, number>) : null,
      requireReplacementCost: false,
      rceFloorRatio: null,
      portalStatus: carrier.portalStatus as AppetiteRuleInput["portalStatus"],
      dontWriteNotes: carrier.dontWriteNotes,
      writtenLines: carrier.writtenLines,
      appointed,
    };
  });
}

function anaPrior(): PriorAttempt[] {
  return fixture.attempts.map((attempt) => ({
    carrierId: CARRIER_IDS[attempt.carrierKey as CarrierKey],
    result: attempt.result as PriorAttempt["result"],
    why: attempt.why,
    bindable: attempt.bindable,
    snapYearBuilt: fixture.risk.yearBuilt,
    snapRoofYear: fixture.risk.roofYear,
    snapRoofCovering: fixture.risk.roofCovering,
    snapConstruction: fixture.risk.construction,
    snapCounty: fixture.risk.county,
    snapMilesToCoast: fixture.risk.milesToCoast,
    snapCoverageA: fixture.risk.coverageA,
  }));
}

describe("shop-fits wiring", () => {
  it("locks Ana Dib 2026-09-02 at 0 green / 10 skip with Home appointed", () => {
    const result = evaluateShopFits({
      risk: dib,
      dealLine: "HO",
      rules: fixtureRules(true),
      prior: anaPrior(),
      sheetValues: {
        coverage_a: { value: "321000", status: "confirmed", source: "javy" },
        construction: { value: "frame", status: "confirmed", source: "seed" },
        county: { value: "Brevard", status: "confirmed", source: "seed" },
      },
      asOfYear: 2026,
    });

    const counts = shopCounts(result.matches);
    expect(result.risk.coverageA).toBe(321000);
    expect(result.matches).toHaveLength(10);
    expect(counts.green).toBe(0);
    expect(counts.skip).toBe(10);
    expect(result.shopThese).toHaveLength(0);
    expect(result.skip.every((m) => m.reasons.some((r) => r.severity !== "pass"))).toBe(true);
  });

  it("shops appointed first-wave Home fits for the Ortega inland masonry deal", () => {
    const result = evaluateShopFits({
      risk: {
        ...ortega,
        coverageA: 200000,
        construction: "frame",
      },
      dealLine: "HO",
      rules: fixtureRules(true),
      prior: anaPrior(),
      sheetValues: {
        coverage_a: { value: String(ORTEGA_FIT.coverageA), status: "confirmed", source: "seed" },
        construction: { value: ORTEGA_FIT.construction, status: "confirmed", source: "seed" },
        roof_covering: { value: ORTEGA_FIT.roofCovering, status: "confirmed", source: "seed" },
        roof_year: { value: String(ORTEGA_FIT.roofYear), status: "confirmed", source: "seed" },
        year_built: { value: String(ORTEGA_FIT.yearBuilt), status: "confirmed", source: "seed" },
        county: { value: ORTEGA_FIT.county, status: "confirmed", source: "seed" },
        miles_to_coast: { value: String(ORTEGA_FIT.milesToCoast), status: "confirmed", source: "seed" },
        opening_protection: { value: ORTEGA_FIT.openingProtection, status: "confirmed", source: "seed" },
      },
      asOfYear: 2026,
    });

    expect(result.risk.coverageA).toBe(425000);
    expect(result.risk.construction).toBe("masonry");
    expect(result.shopThese.length).toBeGreaterThan(0);
    expect(result.shopThese.some((m) => m.band === "green" || m.band === "yellow")).toBe(true);
    expect(result.shopThese.every((m) => m.band !== "red")).toBe(true);

    const qbe = result.shopThese.find((m) => m.carrierId === CARRIER_IDS.qbe);
    expect(qbe).toBeTruthy();
    expect(qbe?.band).toBe("green");

    const names = result.shopThese.map((m) => m.carrierName);
    const ai = names.indexOf("American Integrity");
    const tailrow = names.indexOf("Tailrow");
    const sagesure = names.indexOf("SageSure (Markel)");
    expect(ai).toBeGreaterThanOrEqual(0);
    expect(tailrow).toBeGreaterThan(ai);
    expect(sagesure).toBeGreaterThan(tailrow);

    const hoc = result.skip.find((m) => m.carrierId === CARRIER_IDS.hoc);
    expect(hoc).toBeTruthy();
    expect(hoc?.reasons.some((r) => r.severity === "fail")).toBe(true);
  });

  it("skips a not-appointed line and ignores Auto-only writers on a Home shop", () => {
    const autoOnly: AppetiteRuleInput = {
      ...fixtureRules(true)[0],
      carrierId: "auto-only",
      carrierName: "Progressive",
      writtenLines: ["AUTO"],
      appointed: true,
    };
    const notAppointed = fixtureRules(true).map((rule) =>
      rule.carrierId === CARRIER_IDS.qbe ? { ...rule, appointed: false } : rule,
    );

    const result = evaluateShopFits({
      risk: ortega,
      dealLine: "HO",
      rules: [...notAppointed, autoOnly],
      prior: [],
      asOfYear: 2026,
    });

    expect(result.matches.some((m) => m.carrierId === "auto-only")).toBe(false);
    const qbe = result.matches.find((m) => m.carrierId === CARRIER_IDS.qbe);
    expect(qbe?.band).toBe("red");
    expect(qbe?.reasons.some((r) => r.code === "not_appointed")).toBe(true);
  });
});
