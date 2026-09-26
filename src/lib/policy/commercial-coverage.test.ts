import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PolicyCoverageTab } from "@/components/policy/tabs/coverage-tab";
import { mapGeminiJsonToFields, sheetKeysForGeminiKey } from "@/lib/extraction/gemini/map";
import {
  GEMINI_COMMERCIAL_EXTRACT_JSON_KEYS,
  GEMINI_EXTRACT_JSON_KEYS,
  buildGeminiSystemPrompt,
  buildGeminiUserPrompt,
  geminiKeysForShopLine,
} from "@/lib/extraction/gemini/prompt";
import {
  commercialCoverageLimitsAfterFill,
  commercialCoverageSchedule,
  commercialDecCacheSupportsFill,
  commercialLimitsSummary,
} from "@/lib/policy/commercial-coverage";
import { buildLobOverviewSections } from "@/lib/policy/lob-overview";
import { fillFamilyForPolicy, groupAppliedFill, proposeFillFromDec } from "@/lib/policy/fill-from-dec";

function rows(entries: Record<string, string>) {
  return Object.entries(entries).map(([fieldKey, normalizedValue]) => ({
    fieldKey,
    normalizedValue,
    rawValue: normalizedValue,
    confidence: 0.95,
    flagged: false,
  }));
}

function propose(entries: Record<string, string>) {
  return proposeFillFromDec({ family: "commercial", rows: rows(entries) });
}

describe("commercial fill aliases", () => {
  it("keeps home, flood, and auto families on their own paths", () => {
    expect(fillFamilyForPolicy({ lineOfBusiness: "HO3" })).toBe("homeowners");
    expect(fillFamilyForPolicy({ lineOfBusiness: "DP3" })).toBe("homeowners");
    expect(fillFamilyForPolicy({ lineOfBusiness: "FLOOD" })).toBe("flood");
    expect(fillFamilyForPolicy({ lineOfBusiness: "PA" })).toBe("auto");
    expect(fillFamilyForPolicy({ lineOfBusiness: "BOP" })).toBe("other");
    expect(fillFamilyForPolicy({ lineOfBusiness: "WC" })).toBe("commercial");
    expect(fillFamilyForPolicy({ lineOfBusiness: "GL" })).toBe("commercial");
    expect(
      fillFamilyForPolicy({
        lineOfBusiness: "GL",
        formType: "Errors & Omissions",
        policySubType: "Errors & Omissions",
      }),
    ).toBe("commercial");
    expect(
      fillFamilyForPolicy({ lineOfBusiness: "HO3", formType: "Errors & Omissions" }),
    ).toBe("homeowners");

    const home = proposeFillFromDec({
      family: "homeowners",
      rows: rows({ coverage_a: "200000", el_each_accident: "100000" }),
    });
    expect(home.coverageA).toBe("200000");
    expect(home.elEachAccident).toBeUndefined();
  });

  it("maps the Virginia Pie ACORD 25 workers compensation certificate", () => {
    expect(sheetKeysForGeminiKey("E.L. EACH ACCIDENT")).toEqual(["el_each_accident"]);
    expect(sheetKeysForGeminiKey("E.L. DISEASE - EA EMPLOYEE")).toEqual(["el_disease_each_employee"]);
    expect(sheetKeysForGeminiKey("E.L. DISEASE - POLICY LIMIT")).toEqual(["el_disease_policy_limit"]);
    expect(sheetKeysForGeminiKey("PER STATUTE")).toEqual(["wc_per_statute"]);

    const mapped = mapGeminiJsonToFields(
      {
        named_insured: { value: "VP painting and Construction", confidence: 0.95 },
        policy_number: { value: "WC PC 924909-000", confidence: 0.95 },
        current_carrier: { value: "Pie Casualty Insurance Company", confidence: 0.95 },
        effective_date: { value: "05/06/2026", confidence: 0.95 },
        expiration_date: { value: "05/06/2027", confidence: 0.95 },
        "E.L. EACH ACCIDENT": { value: "$100,000.00", confidence: 0.95 },
        "E.L. DISEASE - EA EMPLOYEE": { value: "$100,000.00", confidence: 0.95 },
        "E.L. DISEASE - POLICY LIMIT": { value: "$500,000.00", confidence: 0.95 },
        "PER STATUTE": { value: "X", confidence: 0.95 },
        certificate_date: { value: "05/07/2026", confidence: 0.95 },
      },
      "dec",
      "workers_comp",
    );
    const proposed = proposeFillFromDec({ family: "commercial", rows: mapped.fields });
    expect(proposed.policyNumber).toBe("WC PC 924909-000");
    expect(proposed.insurerName).toBe("Pie Casualty Insurance Company");
    expect(proposed.namedInsured).toBe("VP painting and Construction");
    expect(proposed.effectiveDate).toBe("2026-05-06");
    expect(proposed.expirationDate).toBe("2027-05-06");
    expect(proposed.termMonths).toBe("12");
    expect(proposed.elEachAccident).toBe("$100,000");
    expect(proposed.elDiseaseEachEmployee).toBe("$100,000");
    expect(proposed.elDiseasePolicyLimit).toBe("$500,000");
    expect(proposed.wcPerStatute).toBe("Per Statute");
    expect(proposed.premium).toBeUndefined();
    expect(proposed.coverageA).toBeUndefined();
    expect(proposed.coverageE).toBeUndefined();
    expect(proposed.yearBuilt).toBeUndefined();
    expect(Object.values(proposed).join(" ")).not.toContain("05/07/2026");

    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    expect(patch.policy.policyNumber).toBe("WC PC 924909-000");
    expect(patch.policy.effectiveDate?.toISOString().slice(0, 10)).toBe("2026-05-06");
    expect(patch.coverageLimits.el_each_accident).toBe("$100,000");
    expect(patch.coverageLimits.el_disease_policy_limit).toBe("$500,000");
    expect(patch.coverageLimits.wc_per_statute).toBe("Per Statute");
    expect(patch.coverageLimits.insurer_name).toBe("Pie Casualty Insurance Company");
    expect(patch.coverageLimits.coverage_e).toBeUndefined();
  });

  it("maps the Hartford information page and does not treat estimated premium as a limit", () => {
    expect(sheetKeysForGeminiKey("Bodily injury by Accident")).toEqual(["el_each_accident"]);
    expect(sheetKeysForGeminiKey("Bodily injury by Disease each employee")).toEqual([
      "el_disease_each_employee",
    ]);
    expect(sheetKeysForGeminiKey("Bodily injury by Disease policy limit")).toEqual([
      "el_disease_policy_limit",
    ]);
    expect(sheetKeysForGeminiKey("Total Estimated Annual Premium")).toEqual(["premium"]);

    const proposed = propose({
      policy_number: "83 WEC CD0BKN",
      current_carrier: "The Hartford",
      effective_date: "06/02/26",
      expiration_date: "06/02/27",
      "Bodily injury by Accident": "$100,000",
      "Bodily injury by Disease each employee": "$100,000",
      "Bodily injury by Disease policy limit": "$500,000",
      total_estimated_annual_premium: "292",
      business_of_named_insured: "Custom Computer Programming Services",
    });
    expect(proposed.policyNumber).toBe("83 WEC CD0BKN");
    expect(proposed.insurerName).toBe("The Hartford");
    expect(proposed.effectiveDate).toBe("2026-06-02");
    expect(proposed.expirationDate).toBe("2027-06-02");
    expect(proposed.premium).toBe("292.00");
    expect(proposed.elEachAccident).toBe("$100,000");
    expect(proposed.elDiseaseEachEmployee).toBe("$100,000");
    expect(proposed.elDiseasePolicyLimit).toBe("$500,000");
    expect(proposed.wcPerStatute).toBeUndefined();
    expect(proposed.namedInsured).toBeUndefined();
    expect(proposed.glEachOccurrence).toBeUndefined();
    const limitValues = [
      proposed.elEachAccident,
      proposed.elDiseaseEachEmployee,
      proposed.elDiseasePolicyLimit,
    ];
    expect(limitValues).not.toContain("$292");
    expect(limitValues.join(" ")).not.toContain("292");
  });

  it("maps a general liability schedule, including Included and a separate advertising-injury line", () => {
    expect(sheetKeysForGeminiKey("General Aggregate Limit (Other than Products/Completed Limit)")).toEqual([
      "gl_general_aggregate",
    ]);
    expect(sheetKeysForGeminiKey("Products/Completed Operations Aggregate Limit")).toEqual([
      "gl_products_completed_ops",
    ]);
    expect(sheetKeysForGeminiKey("Personal & Advertising Injury Limit")).toEqual([
      "gl_personal_advertising_injury",
    ]);
    expect(sheetKeysForGeminiKey("Each Occurrence Limit")).toEqual(["gl_each_occurrence"]);
    expect(sheetKeysForGeminiKey("Damage to Premises Rented to you Limit (Any 1 Premises)")).toEqual([
      "gl_damage_to_premises_rented",
    ]);
    expect(sheetKeysForGeminiKey("Medical Expenses Limit (Any 1 Person) unless amended")).toEqual([
      "gl_medical_expenses",
    ]);
    expect(sheetKeysForGeminiKey("Deductible Amount")).toEqual(["gl_deductible"]);

    const proposed = propose({
      "General Aggregate Limit (Other than Products/Completed Limit)": "$2,000,000",
      "Products/Completed Operations Aggregate Limit": "Included",
      "Personal & Advertising Injury Limit": "$1,000,000",
      "Each Occurrence Limit": "$1,000,000",
      "Damage to Premises Rented to you Limit (Any 1 Premises)": "$100,000",
      "Medical Expenses Limit (Any 1 Person) unless amended": "$5,000",
      "Deductible Amount": "$1,000",
    });
    expect(proposed.effectiveDate).toBeUndefined();
    expect(proposed.expirationDate).toBeUndefined();
    expect(proposed.premium).toBeUndefined();
    expect(proposed.glGeneralAggregate).toBe("$2,000,000");
    expect(proposed.glProductsCompletedOps).toBe("Included");
    expect(proposed.glPersonalAdvertisingInjury).toBe("$1,000,000");
    expect(proposed.glEachOccurrence).toBe("$1,000,000");
    expect(proposed.glDamageToPremisesRented).toBe("$100,000");
    expect(proposed.glMedicalExpenses).toBe("$5,000");
    expect(proposed.glDeductible).toBe("$1,000");
    expect(proposed.elEachAccident).toBeUndefined();
    expect(proposed.plPerClaim).toBeUndefined();

    const schedule = commercialCoverageSchedule(
      groupAppliedFill(proposed, Object.keys(proposed)).coverageLimits,
    );
    expect(schedule.map((row) => row.label)).toEqual([
      "Each occurrence",
      "General aggregate",
      "Products/completed operations aggregate",
      "Personal and advertising injury",
      "Damage to premises rented to you",
      "Medical expenses",
      "Deductible",
    ]);
    expect(schedule.find((row) => row.key === "gl_products_completed_ops")?.limit).toBe("Included");
    expect(schedule.find((row) => row.key === "gl_deductible")?.deductible).toBe("$1,000");
  });

  it("maps the liability coverage overview, including a printed zero deductible", () => {
    expect(sheetKeysForGeminiKey("Property Damage Deductible")).toEqual(["gl_deductible"]);
    expect(sheetKeysForGeminiKey("General Liability (Each Occurrence)")).toEqual(["gl_each_occurrence"]);
    expect(sheetKeysForGeminiKey("General Liability (Annual Aggregate)")).toEqual(["gl_general_aggregate"]);
    expect(sheetKeysForGeminiKey("Products/Completed Operations Annual Aggregate")).toEqual([
      "gl_products_completed_ops",
    ]);
    expect(sheetKeysForGeminiKey("Damage to Premises Rented to You")).toEqual(["gl_damage_to_premises_rented"]);
    expect(sheetKeysForGeminiKey("Medical Expense Limit")).toEqual(["gl_medical_expenses"]);

    const proposed = propose({
      "Property Damage Deductible": "$0",
      "General Liability (Each Occurrence)": "$1,000,000",
      "General Liability (Annual Aggregate)": "$2,000,000",
      "Products/Completed Operations Annual Aggregate": "$2,000,000",
      "Damage to Premises Rented to You": "$50,000",
      "Medical Expense Limit": "$5,000",
    });
    expect(proposed.glDeductible).toBe("$0");
    expect(proposed.glEachOccurrence).toBe("$1,000,000");
    expect(proposed.glGeneralAggregate).toBe("$2,000,000");
    expect(proposed.glProductsCompletedOps).toBe("$2,000,000");
    expect(proposed.glDamageToPremisesRented).toBe("$50,000");
    expect(proposed.glMedicalExpenses).toBe("$5,000");
    expect(proposed.glPersonalAdvertisingInjury).toBeUndefined();
    expect(proposed.premium).toBeUndefined();
  });

  it("maps a professional liability ACORD 25, including claims-made and per-claim deductible", () => {
    expect(sheetKeysForGeminiKey("Per Claim Limit")).toEqual(["pl_per_claim"]);
    expect(sheetKeysForGeminiKey("Aggregate Limit")).toEqual(["printed_aggregate_limit"]);
    expect(sheetKeysForGeminiKey("Per Claim Deductible")).toEqual(["pl_per_claim_deductible"]);
    expect(sheetKeysForGeminiKey("CLAIMS-MADE")).toEqual(["pl_claims_made"]);

    const proposed = propose({
      named_insured: "Javier Garcia Insurance",
      policy_number: "NXTH4RCXPW-00-PL",
      current_carrier: "Next Insurance US Company",
      effective_date: "06/01/2026",
      expiration_date: "06/01/2027",
      "Per Claim Limit": "$1,000,000.00",
      "Aggregate Limit": "$1,000,000.00",
      "Per Claim Deductible": "$2,000.00",
      "CLAIMS-MADE": "CLAIMS-MADE",
    });
    expect(proposed.policyNumber).toBe("NXTH4RCXPW-00-PL");
    expect(proposed.insurerName).toBe("Next Insurance US Company");
    expect(proposed.namedInsured).toBe("Javier Garcia Insurance");
    expect(proposed.effectiveDate).toBe("2026-06-01");
    expect(proposed.expirationDate).toBe("2027-06-01");
    expect(proposed.plPerClaim).toBe("$1,000,000");
    expect(proposed.plAggregate).toBe("$1,000,000");
    expect(proposed.plPerClaimDeductible).toBe("$2,000");
    expect(proposed.plClaimsMade).toBe("Claims-Made");
    expect(proposed.glGeneralAggregate).toBeUndefined();
    expect(proposed.glEachOccurrence).toBeUndefined();
    expect(proposed.premium).toBeUndefined();

    const limits = commercialCoverageLimitsAfterFill(
      { coverage_e: "$300,000", coverage_a: "$250,000", eachOccurrence: "1000000" },
      groupAppliedFill(proposed, Object.keys(proposed)).coverageLimits,
    );
    expect(limits.coverage_e).toBeUndefined();
    expect(limits.coverage_a).toBeUndefined();
    expect(limits.pl_per_claim).toBe("$1,000,000");
    expect(limits.eachOccurrence).toBe("1000000");
  });

  it("leaves a thin page thin", () => {
    const proposed = propose({
      policy_number: "WC PC 924909-000",
      effective_date: "05/06/2026",
      expiration_date: "05/06/2027",
    });
    expect(proposed.policyNumber).toBe("WC PC 924909-000");
    expect(proposed.effectiveDate).toBe("2026-05-06");
    expect(proposed.elEachAccident).toBeUndefined();
    expect(proposed.glEachOccurrence).toBeUndefined();
    expect(proposed.plPerClaim).toBeUndefined();
    expect(proposed.premium).toBeUndefined();
    expect(proposed.wcPerStatute).toBeUndefined();
    expect(commercialCoverageSchedule({})).toEqual([]);
  });
});

describe("commercial coverage desk", () => {
  it("shows the workers compensation schedule and not HO3 rows", () => {
    const limits = {
      wc_per_statute: "Per Statute",
      el_each_accident: "$100,000",
      el_disease_each_employee: "$100,000",
      el_disease_policy_limit: "$500,000",
      insurer_name: "Pie Casualty Insurance Company",
      named_insured: "VP painting and Construction",
      coverage_e: "$300,000",
    };
    const html = renderToStaticMarkup(
      createElement(PolicyCoverageTab, {
        policy: {
          id: "pie",
          coverageA: null,
          coverageLimits: limits,
          faceAmount: null,
          lineOfBusiness: "WC",
          formType: "WC",
          policyType: "Workers Comp",
          policySubType: "Workers Comp",
        },
        terms: [],
        currentTerm: null,
      }),
    );
    expect(html).toContain("EL each accident");
    expect(html).toContain("EL disease policy limit");
    expect(html).toContain("$500,000");
    expect(html).toContain("Per statute");
    expect(html).not.toContain("Coverage A");
    expect(html).not.toContain("Coverage E");
    expect(html).not.toContain("Pie Casualty");

    const overview = buildLobOverviewSections({
      policyId: "pie",
      lineOfBusiness: "WC",
      coverageLimits: limits,
    });
    expect(overview[0]?.fields.find((field) => field.key === "limits")?.value).toContain("$100,000");
    expect(overview[0]?.fields.find((field) => field.key === "namedInsured")?.value).toBe(
      "VP painting and Construction",
    );
    expect(commercialLimitsSummary(limits, "wc")).toContain("Per statute");
    expect(commercialDecCacheSupportsFill(rows({ coverage_a: "250000" }))).toBe(false);
    expect(commercialDecCacheSupportsFill(rows({ el_each_accident: "$100,000" }))).toBe(true);
  });

  it("shows E&O limits and claims-made on the overview without workers comp fields", () => {
    const sections = buildLobOverviewSections({
      policyId: "javier",
      lineOfBusiness: "GL",
      formType: "Errors & Omissions",
      policySubType: "Errors & Omissions",
      coverageLimits: {
        pl_per_claim: "$1,000,000",
        pl_aggregate: "$1,000,000",
        pl_per_claim_deductible: "$2,000",
        pl_claims_made: "Claims-Made",
      },
    });
    expect(sections[0]?.title).toBe("E&O");
    expect(sections[0]?.fields.map((field) => field.key)).toEqual([
      "limits",
      "deductible",
      "claimsMade",
    ]);
    expect(sections[0]?.fields.find((field) => field.key === "limits")?.value).toContain("Per claim");
    expect(sections[0]?.fields.find((field) => field.key === "deductible")?.value).toBe("$2,000");
    expect(sections[0]?.fields.find((field) => field.key === "claimsMade")?.value).toBe("Claims-Made");
    expect(sections[0]?.fields.some((field) => field.key === "payroll")).toBe(false);
  });
});

describe("commercial extract prompt", () => {
  it("teaches one shared alias list and leaves the homeowners prompt alone", () => {
    expect(geminiKeysForShopLine("workers_comp")).toEqual(GEMINI_COMMERCIAL_EXTRACT_JSON_KEYS);
    expect(geminiKeysForShopLine("general_liability")).toEqual(GEMINI_COMMERCIAL_EXTRACT_JSON_KEYS);
    expect(geminiKeysForShopLine("commercial")).toEqual(GEMINI_COMMERCIAL_EXTRACT_JSON_KEYS);
    expect(GEMINI_COMMERCIAL_EXTRACT_JSON_KEYS).not.toContain("coverage_b");
    expect(GEMINI_EXTRACT_JSON_KEYS).toContain("coverage_b");
    expect(geminiKeysForShopLine("home")).not.toContain("el_each_accident");
    expect(geminiKeysForShopLine("flood")).not.toContain("gl_each_occurrence");

    const wc = buildGeminiSystemPrompt("dec", "workers_comp");
    const gl = buildGeminiSystemPrompt("dec", "general_liability");
    expect(wc).toBe(gl);
    expect(wc).toMatch(/EL Each Accident/);
    expect(wc).toMatch(/Bodily injury by Accident/);
    expect(wc).toMatch(/Bodily injury by Disease/);
    expect(wc).toMatch(/PER STATUTE/);
    expect(wc).toMatch(/Total Estimated Annual Premium/);
    expect(wc).toMatch(/General Aggregate/);
    expect(wc).toMatch(/Annual Aggregate/);
    expect(wc).toMatch(/Products\/Completed Operations/);
    expect(wc).toMatch(/Personal & Advertising Injury/);
    expect(wc).toMatch(/Each Occurrence/);
    expect(wc).toMatch(/Damage to Premises Rented/);
    expect(wc).toMatch(/Medical Expense/);
    expect(wc).toMatch(/Property Damage Deductible/);
    expect(wc).toMatch(/Per Claim Limit/);
    expect(wc).toMatch(/Claims-Made/);
    expect(wc).toMatch(/certificate holder/i);
    expect(wc).toMatch(/not a homeowners HO3/);
    expect(wc).not.toMatch(/coverage_b_premium/);

    const user = buildGeminiUserPrompt("dec", "workers_comp");
    expect(user).toMatch(/el_each_accident/);
    expect(user).toMatch(/do not fill Coverage A–F/i);
    expect(user).not.toMatch(/coverage_b_premium/);

    const home = buildGeminiUserPrompt("dec", "home");
    expect(home).toMatch(/coverage_b/);
    expect(home).toMatch(/All Other Perils/);
    expect(home).not.toMatch(/el_each_accident/);
  });
});
