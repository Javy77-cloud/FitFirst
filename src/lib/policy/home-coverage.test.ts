import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PolicyCoverageTab } from "@/components/policy/tabs/coverage-tab";
import { mapGeminiJsonToFields, sheetKeysForGeminiKey } from "@/lib/extraction/gemini/map";
import { GEMINI_EXTRACT_JSON_KEYS, buildGeminiUserPrompt } from "@/lib/extraction/gemini/prompt";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues, extractKeyToSheetKey, fieldsForLine } from "@/lib/quote-sheet/catalog";
import { groupAppliedFill, proposeFillFromDec } from "@/lib/policy/fill-from-dec";
import {
  HOME_COVERAGE_DESK_KEYS,
  homeCoverageSchedule,
} from "@/lib/policy/home-coverage";

function rowLabels(html: string): string[] {
  return [...html.matchAll(/font-medium text-navy">([^<]+)</g)].map((match) => match[1] ?? "");
}

describe("home coverage schedule order", () => {
  it("keeps desk order when Gemini stored the DEC read order", () => {
    const rows = homeCoverageSchedule({
      coverageA: 400000,
      aopDeductible: "2500",
      hurricaneDeductible: "2% of Coverage A",
      coverageLimits: {
        theft: "130900",
        extended_replacement_cost_dwelling: "No Extended Coverage",
        sinkhole_deductible: "Not Included",
        coverage_f: "1000",
        personal_property_replacement_cost: "Included",
        coverage_b: "20000",
        hurricane_deductible: "2% of Coverage A",
        water_backup: "10000",
        ordinance_or_law: "10%",
        aop_deductible: "2500",
        dwelling_replacement_cost: "Included",
        coverage_e: "300000",
        wind_hail_deductible: "2500",
        coverage_d: "10000",
        coverage_c: "50000",
        personal_injury: "100000",
        home_computer: "1000",
        coverage_f_premium: "Included",
      },
      coverages: [
        { key: "extended_replacement_cost_dwelling", label: "Extended Replacement Cost - Dwelling", value: "No Extended Coverage" },
        { key: "theft", label: "Theft", value: "130900" },
        { key: "coverage_b", label: "Coverage B", value: "999" },
      ],
    });

    expect(rows.map((row) => row.label)).toEqual([
      "Coverage A",
      "Coverage B",
      "Coverage C",
      "Coverage D",
      "Coverage E",
      "Coverage F",
      "Water Back Up and Sump Overflow",
      "Personal Injury",
      "Ordinance or Law",
      "Theft",
      "Home Computer",
      "Replacement Cost Dwelling",
      "Replacement Cost Contents",
      "Extended Replacement Cost - Dwelling",
      "All Other Perils (AOP)",
      "Windstorm or Hail (Other Than Hurricane)",
      "Hurricane (% of Cov A)",
      "Sinkhole",
    ]);

    const byLabel = Object.fromEntries(rows.map((row) => [row.label, row]));
    expect(byLabel["Coverage A"]?.limit).toBe("$400,000");
    expect(byLabel["Coverage B"]?.limit).toBe("$20,000");
    expect(byLabel["Coverage F"]?.premium).toBe("Included");
    expect(byLabel["Theft"]?.limit).toBe("$130,900");
    expect(byLabel["Theft"]?.premium).toBe("—");
    expect(byLabel["Ordinance or Law"]?.limit).toBe("10%");
    expect(byLabel["Ordinance or Law"]?.premium).toBe("—");
    expect(byLabel["Water Back Up and Sump Overflow"]?.limit).toBe("$10,000");
    expect(byLabel["Water Back Up and Sump Overflow"]?.premium).toBe("—");
    expect(byLabel["Extended Replacement Cost - Dwelling"]?.limit).toBe("No Extended Coverage");
    expect(byLabel["Extended Replacement Cost - Dwelling"]?.premium).toBe("—");
    expect(byLabel["Replacement Cost Contents"]?.limit).toBe("Included");
    expect(byLabel["Replacement Cost Contents"]?.premium).toBe("—");
    expect(byLabel["Replacement Cost Dwelling"]?.limit).toBe("Included");
    expect(byLabel["Replacement Cost Dwelling"]?.premium).toBe("—");

    const labels = rows.map((row) => row.label);
    const coverageF = labels.indexOf("Coverage F");
    const theft = labels.indexOf("Theft");
    const extended = labels.indexOf("Extended Replacement Cost - Dwelling");
    const aop = labels.indexOf("All Other Perils (AOP)");
    expect(coverageF).toBeGreaterThan(-1);
    expect(coverageF).toBeLessThan(theft);
    expect(theft).toBeLessThan(extended);
    expect(extended).toBeLessThan(aop);
  });

  it("renders that order on the policy Coverage tab", () => {
    const html = renderToString(
      createElement(PolicyCoverageTab, {
        policy: {
          id: "p-vave",
          coverageA: 400000,
          coverageLimits: {
            extended_replacement_cost_dwelling: "No Extended Coverage",
            theft: "$130,900",
            coverage_e: "$300,000",
            water_backup: "$10,000",
            ordinance_or_law: "10%",
            personal_property_replacement_cost: "Included",
            dwelling_replacement_cost: "Included",
            wind_hail_deductible: "$1,000",
            sinkhole_deductible: "Not Included",
          },
          faceAmount: null,
          lineOfBusiness: "HO",
          formType: "HO3",
          policyType: "HO3",
        },
        terms: [],
        currentTerm: {
          id: "t-vave",
          role: "current",
          premium: "2935.49",
          aopDeductible: "$2,500",
          hurricaneDeductible: "2%",
          comprehensiveDeductible: null,
          collisionDeductible: null,
          coverages: [
            { key: "theft", label: "Theft", value: "$130,900" },
            { key: "coverage_c", label: "Coverage C", value: "$80,000" },
          ],
          termEffective: new Date("2026-06-04T12:00:00.000Z"),
          termExpiration: new Date("2027-06-04T12:00:00.000Z"),
        },
      }),
    );
    const labels = rowLabels(html);
    expect(labels).toEqual([
      "Coverage A",
      "Coverage C",
      "Coverage E",
      "Water Back Up and Sump Overflow",
      "Ordinance or Law",
      "Theft",
      "Replacement Cost Dwelling",
      "Replacement Cost Contents",
      "Extended Replacement Cost - Dwelling",
      "All Other Perils (AOP)",
      "Windstorm or Hail (Other Than Hurricane)",
      "Hurricane (% of Cov A)",
      "Sinkhole",
    ]);
    expect(html).toContain("$130,900");
    expect(html).toContain("10%");
    expect(html).toContain("$10,000");
    expect(html).toContain("No Extended Coverage");
    expect(html).toContain("Included");
    expect(html).not.toContain("$2,935.49");
    expect(html).not.toContain(">Deductible<");
  });
});

describe("VAVE optional coverage mapping", () => {
  it("maps Douglas Additional/Optional Coverages onto desk rows without inventing premiums", () => {
    expect(sheetKeysForGeminiKey("Theft")).toEqual(["theft"]);
    expect(sheetKeysForGeminiKey("Building Ordinance Or Law")).toEqual(["ordinance_or_law"]);
    expect(sheetKeysForGeminiKey("Water Backup")).toEqual(["water_backup"]);
    expect(sheetKeysForGeminiKey("Extended Replacement Cost - Dwelling")).toEqual([
      "extended_replacement_cost_dwelling",
    ]);
    expect(sheetKeysForGeminiKey("Replacement Cost Contents")).toEqual([
      "personal_property_replacement_cost",
    ]);
    expect(sheetKeysForGeminiKey("Replacement Cost Dwelling")).toEqual(["dwelling_replacement_cost"]);
    expect(extractKeyToSheetKey("home", "building_ordinance_or_law")).toBe("ordinance_or_law");
    expect(extractKeyToSheetKey("home", "replacement_cost_contents")).toBe(
      "personal_property_replacement_cost",
    );
    expect(extractKeyToSheetKey("home", "replacement_cost_dwelling")).toBe("dwelling_replacement_cost");
    expect(extractKeyToSheetKey("home", "theft")).toBe("theft");
    expect(extractKeyToSheetKey("home", "extended_replacement_cost_dwelling")).toBe(
      "extended_replacement_cost_dwelling",
    );
    expect(GEMINI_EXTRACT_JSON_KEYS).toEqual(
      expect.arrayContaining([
        "theft",
        "extended_replacement_cost_dwelling",
        "replacement_cost_contents",
        "replacement_cost_dwelling",
      ]),
    );

    const prompt = buildGeminiUserPrompt("dec", "home");
    expect(prompt).toMatch(/theft/);
    expect(prompt).toMatch(/No Extended Coverage/);
    expect(prompt).toMatch(/Building Ordinance Or Law/);
    expect(prompt).toMatch(/do not invent a premium/i);

    const mapped = mapGeminiJsonToFields(
      {
        Theft: { value: "130900", confidence: 0.97 },
        "Building Ordinance Or Law": { value: "10%", confidence: 0.97 },
        "Water Backup": { value: "10000", confidence: 0.97 },
        "Extended Replacement Cost - Dwelling": { value: "No Extended Coverage", confidence: 0.97 },
        "Replacement Cost Contents": { value: "Included", confidence: 0.97 },
        "Replacement Cost Dwelling": { value: "Included", confidence: 0.97 },
        coverage_a: { value: "400000", confidence: 0.97 },
      },
      "dec",
      "home",
    );
    const byKey = Object.fromEntries(mapped.fields.map((field) => [field.fieldKey, field.normalizedValue]));
    expect(byKey.theft).toBe("$130,900");
    expect(byKey.ordinance_or_law).toBe("10%");
    expect(byKey.water_backup).toBe("$10,000");
    expect(byKey.extended_replacement_cost_dwelling).toBe("No Extended Coverage");
    expect(byKey.personal_property_replacement_cost).toBe("Included");
    expect(byKey.dwelling_replacement_cost).toBe("Included");
    expect(byKey.theft_premium).toBeUndefined();
    expect(byKey.extended_replacement_cost_dwelling_premium).toBeUndefined();
    expect(byKey.ordinance_or_law_premium).toBeUndefined();
    expect(byKey.water_backup_premium).toBeUndefined();

    const filled = applyExtractedToSheet("home", emptySheetValues("home", "homeowners"), mapped.fields, {
      docType: "dec",
    });
    expect(filled.values.theft?.value).toBe("$130,900");
    expect(filled.values.ordinance_or_law?.value).toBe("10%");
    expect(filled.values.water_backup?.value).toBe("$10,000");
    expect(filled.values.extended_replacement_cost_dwelling?.value).toBe("No Extended Coverage");
    expect(filled.values.personal_property_replacement_cost?.value).toBe("Included");
    expect(filled.values.dwelling_replacement_cost?.value).toBe("Included");
    expect(filled.filledKeys).not.toEqual(expect.arrayContaining(["theft_premium"]));
    expect(filled.values.ordinance_or_law?.value).not.toBe("25%");
    expect(filled.values.water_backup?.value).not.toBe("$5,000");

    const proposed = proposeFillFromDec({ family: "homeowners", rows: mapped.fields });
    expect(proposed.theft).toBe("$130,900");
    expect(proposed.ordinanceOrLaw).toBe("10%");
    expect(proposed.waterBackup).toBe("$10,000");
    expect(proposed.extendedReplacementCostDwelling).toBe("No Extended Coverage");
    expect(proposed.personalPropertyReplacementCost).toBe("Included");
    expect(proposed.dwellingReplacementCost).toBe("Included");
    expect(proposed.theftPremium).toBeUndefined();
    expect(proposed.waterBackupPremium).toBeUndefined();

    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    expect(patch.coverageLimits.theft).toBe("$130,900");
    expect(patch.coverageLimits.ordinance_or_law).toBe("10%");
    expect(patch.coverageLimits.water_backup).toBe("$10,000");
    expect(patch.coverageLimits.extended_replacement_cost_dwelling).toBe("No Extended Coverage");
    expect(patch.coverageLimits.personal_property_replacement_cost).toBe("Included");
    expect(patch.coverageLimits.dwelling_replacement_cost).toBe("Included");
    expect(patch.coverageLimits.theft_premium).toBeUndefined();
    expect(patch.coverageLimits.water_backup_premium).toBeUndefined();
    expect(patch.coverageLimits.ordinance_or_law_premium).toBeUndefined();
  });

  it("keeps the home Coverages group in the same desk order", () => {
    const coverages = fieldsForLine("home", "homeowners")
      .filter((field) => field.group === "Coverages")
      .map((field) => field.key);
    expect(coverages).toEqual([...HOME_COVERAGE_DESK_KEYS]);
  });
});
