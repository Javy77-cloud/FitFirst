import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PolicyCoverageTab } from "@/components/policy/tabs/coverage-tab";
import { mapGeminiJsonToFields, sheetKeysForGeminiKey } from "@/lib/extraction/gemini/map";
import {
  GEMINI_EXTRACT_JSON_KEYS,
  GEMINI_FLOOD_EXTRACT_JSON_KEYS,
  buildGeminiSystemPrompt,
  buildGeminiUserPrompt,
  geminiKeysForShopLine,
} from "@/lib/extraction/gemini/prompt";
import {
  floodCoverageLimitsAfterFill,
  floodCoverageSchedule,
  floodFormCodeFromText,
} from "@/lib/policy/flood-coverage";
import { floodDecCacheSupportsFill } from "@/lib/policy/load-gemini-rows";
import { fillFamilyForPolicy, groupAppliedFill, proposeFillFromDec } from "@/lib/policy/fill-from-dec";

const zoilaRows = [
  { fieldKey: "policy_number", normalizedValue: "FLD1200043" },
  { fieldKey: "building_occupancy", normalizedValue: "SINGLE-FAMILY HOME" },
  { fieldKey: "number_of_units", normalizedValue: "N/A" },
  { fieldKey: "primary_residence", normalizedValue: "NO" },
  { fieldKey: "property_description", normalizedValue: "SLAB ON GRADE (NON-ELEVATED), 2 FLOOR(S), FRAME CONSTRUCTION" },
  { fieldKey: "prior_nfip_claims", normalizedValue: "0 CLAIM(S)" },
  { fieldKey: "date_of_construction", normalizedValue: "07/01/1989" },
  { fieldKey: "flood_zone", normalizedValue: "AE" },
  { fieldKey: "first_floor_height", normalizedValue: "1.2 FEET" },
  { fieldKey: "ffh_method", normalizedValue: "ELEVATION CERTIFICATE" },
  { fieldKey: "building_description_detail", normalizedValue: "N/A" },
  { fieldKey: "building_limit", normalizedValue: "250000" },
  { fieldKey: "building_premium", normalizedValue: "890.00" },
  { fieldKey: "building_deductible", normalizedValue: "1250" },
  { fieldKey: "contents_limit", normalizedValue: "100000" },
  { fieldKey: "contents_premium", normalizedValue: "210.00" },
  { fieldKey: "coverage_b", normalizedValue: "25000" },
  { fieldKey: "coverage_e", normalizedValue: "300000" },
  { fieldKey: "coverage_f", normalizedValue: "1000" },
  { fieldKey: "mortgagee", normalizedValue: "WELLS FARGO BANK NA" },
  { fieldKey: "premium", normalizedValue: "1100.00" },
];

describe("Zoila Selective Flood fill", () => {
  it("maps rating facts and Building/Contents, and does not build HO3 A–F", () => {
    expect(fillFamilyForPolicy({ lineOfBusiness: "FLOOD", policyType: "Home", formType: "HO3" })).toBe(
      "flood",
    );
    expect(fillFamilyForPolicy({ lineOfBusiness: "HO3", formType: "HO3" })).toBe("homeowners");
    expect(floodFormCodeFromText("FLD1200043")).toBe("FLD");
    expect(floodFormCodeFromText("Flood")).toBe("Flood");

    const proposed = proposeFillFromDec({ family: "flood", rows: zoilaRows });
    expect(proposed.formType).toBe("FLD");
    expect(proposed.policySubType).toBe("FLD");
    expect(proposed.policyType).toBe("Flood");
    expect(proposed.floodBuildingOccupancy).toBe("SINGLE-FAMILY HOME");
    expect(proposed.floodNumberOfUnits).toBe("N/A");
    expect(proposed.floodPrimaryResidence).toBe("No");
    expect(proposed.floodPropertyDescription).toContain("FRAME CONSTRUCTION");
    expect(proposed.floodPriorNfipClaims).toBe("0 CLAIM(S)");
    expect(proposed.floodDateOfConstruction).toBe("07/01/1989");
    expect(proposed.yearBuilt).toBe("1989");
    expect(proposed.floodZone).toBe("AE");
    expect(proposed.floodFirstFloorHeight).toBe("1.2 FEET");
    expect(proposed.floodFfhMethod).toBe("ELEVATION CERTIFICATE");
    expect(proposed.floodBuildingDescription).toBe("N/A");
    expect(proposed.floodBuilding).toBe("$250,000");
    expect(proposed.floodBuildingPremium).toBe("$890");
    expect(proposed.floodContents).toBe("$100,000");
    expect(proposed.floodContentsPremium).toBe("$210");
    expect(proposed.coverageB).toBeUndefined();
    expect(proposed.coverageE).toBeUndefined();
    expect(proposed.coverageF).toBeUndefined();
    expect(proposed.floodLossOfUse).toBeUndefined();
    expect(proposed.mortgageeName).toMatch(/WELLS FARGO/i);
    expect(proposed.premium).toBe("1100.00");

    const home = proposeFillFromDec({
      family: "homeowners",
      rows: [
        { fieldKey: "coverage_a", normalizedValue: "321000" },
        { fieldKey: "coverage_b", normalizedValue: "32100" },
        { fieldKey: "form", normalizedValue: "HO3" },
      ],
    });
    expect(home.coverageB).toBe("$32,100");
    expect(home.formType).toBe("HO3");
  });

  it("adds loss of use and one extra, and strips a previous HO3 template", () => {
    const proposed = proposeFillFromDec({
      family: "flood",
      rows: [
        { fieldKey: "policy_number", normalizedValue: "FLD1200043" },
        { fieldKey: "building_limit", normalizedValue: "250000" },
        { fieldKey: "contents_limit", normalizedValue: "100000" },
        { fieldKey: "loss_of_use", normalizedValue: "50000" },
        { fieldKey: "loss_of_use_premium", normalizedValue: "Included" },
        { fieldKey: "increased_cost_of_compliance", normalizedValue: "30000" },
        { fieldKey: "debris_removal", normalizedValue: "5000" },
      ],
    });
    expect(proposed.floodLossOfUse).toBe("$50,000");
    expect(proposed.floodLossOfUsePremium).toBe("Included");
    expect(proposed.floodIcc).toBe("$30,000");
    expect(proposed.floodDebris).toBeUndefined();

    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    const limits = floodCoverageLimitsAfterFill(
      {
        coverage_a: "$250,000",
        coverage_b: "$25,000",
        coverage_c: "$100,000",
        coverage_e: "$300,000",
        coverage_f: "$1,000",
        ordinance_or_law: "10%",
      },
      patch.coverageLimits,
    );
    expect(limits.flood_building).toBe("$250,000");
    expect(limits.flood_contents).toBe("$100,000");
    expect(limits.flood_loss_of_use).toBe("$50,000");
    expect(limits.flood_icc).toBe("$30,000");
    expect(limits.coverage_a).toBeUndefined();
    expect(limits.coverage_b).toBeUndefined();
    expect(limits.coverage_c).toBeUndefined();
    expect(limits.coverage_e).toBeUndefined();
    expect(limits.coverage_f).toBeUndefined();
    expect(limits.ordinance_or_law).toBeUndefined();
  });
});

describe("flood coverage schedule", () => {
  it("shows Building and Contents once, and drops HO3 B/E/F and a second Coverage A", () => {
    const rows = floodCoverageSchedule({
      coverageA: 250000,
      coverageLimits: {
        coverage_a: "$250,000",
        coverage_a_premium: "$890.00",
        coverage_c: "$100,000",
        coverage_b: "$25,000",
        coverage_e: "$300,000",
        coverage_f: "$1,000",
      },
      coverages: [
        { key: "coverage_a", label: "Coverage A", value: "$250,000", premium: "$1,100.00" },
      ],
    });
    expect(rows.map((row) => row.label)).toEqual(["Building", "Contents"]);
    expect(rows.filter((row) => row.label === "Coverage A")).toHaveLength(0);
    expect(rows[0]?.limit).toBe("$250,000");
    expect(rows[0]?.premium).toBe("$890");
    expect(rows[1]?.limit).toBe("$100,000");

    const html = renderToStaticMarkup(
      createElement(PolicyCoverageTab, {
        policy: {
          id: "zoila",
          coverageA: 250000,
          coverageLimits: {
            flood_building: "$250,000",
            flood_building_premium: "$890.00",
            flood_building_deductible: "$1,250",
            flood_contents: "$100,000",
            flood_contents_premium: "$210.00",
            coverage_b: "$25,000",
            coverage_e: "$300,000",
          },
          faceAmount: null,
          lineOfBusiness: "FLOOD",
          formType: "FLD",
          policyType: "Flood",
          policySubType: "FLD",
        },
        terms: [],
        currentTerm: {
          id: "term",
          role: "current",
          premium: "1100.00",
          aopDeductible: null,
          hurricaneDeductible: null,
          comprehensiveDeductible: null,
          collisionDeductible: null,
          coverages: [{ key: "coverage_a", label: "Coverage A", value: "$250,000" }],
          termEffective: new Date("2026-09-25T12:00:00.000Z"),
          termExpiration: new Date("2027-09-25T12:00:00.000Z"),
        },
      }),
    );
    expect(html).toContain("Building");
    expect(html).toContain("Contents");
    expect(html).toContain("$250,000");
    expect(html).toContain("$100,000");
    expect(html).toContain("$890");
    expect(html).not.toContain("Coverage A");
    expect(html).not.toContain("Coverage B");
    expect(html).not.toContain("Coverage E");
    expect(html).not.toContain("$1,100");
  });
});

describe("flood extract prompt", () => {
  it("asks for the rating block and keeps HO3 keys on the home list", () => {
    expect(geminiKeysForShopLine("flood")).toEqual(GEMINI_FLOOD_EXTRACT_JSON_KEYS);
    expect(GEMINI_FLOOD_EXTRACT_JSON_KEYS).toContain("building_occupancy");
    expect(GEMINI_FLOOD_EXTRACT_JSON_KEYS).toContain("first_floor_height");
    expect(GEMINI_FLOOD_EXTRACT_JSON_KEYS).not.toContain("coverage_b");
    expect(GEMINI_EXTRACT_JSON_KEYS).toContain("coverage_b");
    expect(sheetKeysForGeminiKey("building_occupancy")).toEqual(["building_occupancy"]);
    expect(sheetKeysForGeminiKey("Most Favorable FFH Method")).toEqual(["ffh_method"]);
    expect(sheetKeysForGeminiKey("date_of_construction")).toEqual(["date_of_construction"]);

    const user = buildGeminiUserPrompt("dec", "flood");
    const system = buildGeminiSystemPrompt("dec", "flood");
    expect(user).toMatch(/building_occupancy/);
    expect(user).toMatch(/never Home or HO3/);
    expect(user).not.toMatch(/coverage_b_premium/);
    expect(system).toMatch(/not a homeowners HO3/);
    expect(system).toMatch(/first_floor_height/);

    const home = buildGeminiUserPrompt("dec", "home");
    expect(home).toMatch(/coverage_b/);
    expect(home).toMatch(/All Other Perils/);

    expect(
      floodDecCacheSupportsFill([
        { fieldKey: "coverage_a", normalizedValue: "250000", rawValue: "250000", confidence: 0.9, flagged: false },
      ]),
    ).toBe(false);
    expect(
      floodDecCacheSupportsFill([
        {
          fieldKey: "building_occupancy",
          normalizedValue: "SINGLE-FAMILY HOME",
          rawValue: null,
          confidence: 0.9,
          flagged: false,
        },
      ]),
    ).toBe(true);

    const mapped = mapGeminiJsonToFields(
      {
        number_of_units: { value: "N/A", confidence: 0.9 },
        building_description_detail: "N/A",
        coverage_a: "N/A",
      },
      "dec",
      "flood",
    );
    const byKey = Object.fromEntries(mapped.fields.map((field) => [field.fieldKey, field.normalizedValue]));
    expect(byKey.number_of_units).toBe("N/A");
    expect(byKey.building_description_detail).toBe("N/A");
    expect(byKey.coverage_a).toBeUndefined();

    const homeNa = mapGeminiJsonToFields(
      { number_of_units: { value: "N/A", confidence: 0.9 } },
      "dec",
      "home",
    );
    expect(homeNa.fields.find((field) => field.fieldKey === "number_of_units")).toBeUndefined();
  });
});
