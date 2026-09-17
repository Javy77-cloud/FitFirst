import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fieldsForLine, emptySheetValues, blankSheetWithDefaults, sheetFieldIsVisible, sheetGroupIsVisible } from "./catalog";
import { applyExtractedToSheet } from "./apply";
import { fillSheetFromDealDetails } from "./fill-from-deal";
import { DEFAULT_HEALTH_SUBFILTERS, DEFAULT_LIFE_SUBFILTERS } from "@/lib/desk/line-settings";
import { RELATIONSHIP_TO_INSURED_OPTIONS } from "./applicant-core";
import {
  HEALTH_COST_PREF_OPTIONS,
  HEALTH_DEPENDENT_SLOT_COUNT,
  HEALTH_MEDICAL_CONDITION_OPTIONS,
  HEALTH_METAL_LEVEL_OPTIONS,
  HEALTH_PLAN_TYPE_OPTIONS,
  HEALTH_QLE_TYPE_OPTIONS,
  HOUSEHOLD_SIZE_OPTIONS,
  LIFE_HEIGHT_FT_OPTIONS,
  LIFE_HEIGHT_IN_OPTIONS,
  LIFE_MEDICAL_CONDITION_OPTIONS,
  LIFE_PREMIUM_MODE_OPTIONS,
  LIFE_PRODUCT_TYPE_OPTIONS,
  LIFE_PURPOSE_OPTIONS,
  LIFE_TERM_YEARS_OPTIONS,
  MEDICARE_COVERAGE_SHOW_VALUES,
  TOBACCO_STATUS_OPTIONS,
  TOBACCO_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  emptyDefaultsForLine,
  isMarketplaceCoverageType,
  isMedicareCoverageType,
  normalizeHealthPlanType,
  normalizeLifeProductType,
  normalizeTobaccoStatus,
} from "./sheet-defaults";

describe("Life + Health Risk Profile depth", () => {
  it("locks the lean Life Risk Profile catalog (identity stays on Deal Details)", () => {
    expect(LIFE_PRODUCT_TYPE_OPTIONS).toEqual([
      "Term",
      "Whole Life",
      "Universal Life",
      "Indexed Universal Life",
      "Variable Universal Life",
      "Final Expense",
    ]);
    expect(DEFAULT_LIFE_SUBFILTERS.map((row) => row.label)).toEqual([
      "Term Life",
      "Whole Life",
      "IUL",
      "Final Expense",
    ]);
    const life = Object.fromEntries(fieldsForLine("life").map((field) => [field.key, field]));
    expect(life.applicant_name).toBeUndefined();
    expect(life.applicant_dob).toBeUndefined();
    expect(life.applicant_phone).toBeUndefined();
    expect(life.applicant_email).toBeUndefined();
    expect(life.co_applicant_name).toBeUndefined();
    expect(Object.keys(life).some((key) => /ssn|social/i.test(key))).toBe(false);
    expect(life.product_type).toMatchObject({ input: "select" });
    expect(life.product_type.options).toEqual([...LIFE_PRODUCT_TYPE_OPTIONS]);
    expect(life.term_years.options).toEqual([...LIFE_TERM_YEARS_OPTIONS]);
    expect(life.term_years.showWhen).toEqual({ key: "product_type", values: ["Term", "Term Life"] });
    expect(life.premium_budget.input).toBe("number");
    expect(life.premium_mode.options).toEqual([...LIFE_PREMIUM_MODE_OPTIONS]);
    expect(life.purpose_of_insurance.options).toEqual([...LIFE_PURPOSE_OPTIONS]);
    expect(life.height_ft.options).toEqual([...LIFE_HEIGHT_FT_OPTIONS]);
    expect(life.height_in.options).toEqual([...LIFE_HEIGHT_IN_OPTIONS]);
    expect(life.weight.input).toBe("number");
    expect(life.tobacco_status.options).toEqual([...TOBACCO_STATUS_OPTIONS]);
    expect(life.tobacco_type.options).toEqual([...TOBACCO_TYPE_OPTIONS]);
    expect(life.tobacco_type.showWhen?.values).toEqual(["Former", "Current"]);
    expect(life.last_tobacco_date.showWhen?.values).toEqual(["Former", "Current"]);
    expect(life.medical_conditions.input).toBe("multiselect");
    expect(life.medical_conditions.options).toEqual([...LIFE_MEDICAL_CONDITION_OPTIONS]);
    expect(life.medical_conditions.options).toEqual(
      expect.arrayContaining([
        "None",
        "High blood pressure",
        "Diabetes Type 2",
        "Sleep apnea",
        "Other",
        "AIDS / HIV",
        "Alzheimer’s",
        "CPAP without oxygen",
        "Wheelchair use",
      ]),
    );
    expect(life.medical_conditions.options.length).toBeGreaterThan(40);
    expect(life.medical_conditions.options.length).toBeLessThanOrEqual(80);
    expect(life.notes.group).toBe("Health");
    expect(life.existing_coverage.options).toEqual([...YES_NO_OPTIONS]);
    expect(life.existing_carrier.showWhen?.key).toBe("existing_coverage");
    expect(life.existing_face_amount.showWhen?.key).toBe("existing_coverage");
    expect(life.existing_coverage_type.showWhen?.key).toBe("existing_coverage");
    expect(life.replacement.options).toEqual([...YES_NO_OPTIONS]);
    expect(life.pending_applications.options).toEqual([...YES_NO_OPTIONS]);
    expect(life.beneficiary_relationship.options).toEqual([...RELATIONSHIP_TO_INSURED_OPTIONS]);
    expect(life.beneficiary_share.input).toBe("number");
    expect(life.contingent_beneficiary_share.input).toBe("number");
    expect(life.health_class).toBeUndefined();
    expect(life.physician_name).toBeUndefined();
    expect(life.us_residency).toBeUndefined();
    expect(emptyDefaultsForLine("life")).toEqual({ product_type: "Term" });
    expect(blankSheetWithDefaults("life").product_type.value).toBe("Term");
    expect(sheetFieldIsVisible(life.term_years, { product_type: "Term" })).toBe(true);
    expect(sheetFieldIsVisible(life.term_years, { product_type: "Whole Life" })).toBe(false);
    expect(sheetFieldIsVisible(life.tobacco_type, { tobacco_status: "Never" })).toBe(false);
    expect(sheetFieldIsVisible(life.tobacco_type, { tobacco_status: "Former" })).toBe(true);
    expect(sheetFieldIsVisible(life.existing_carrier, { existing_coverage: "yes" })).toBe(true);
    expect(sheetFieldIsVisible(life.existing_carrier, { existing_coverage: "no" })).toBe(false);
  });

  it("locks the lean Health Risk Profile catalog (identity stays on Deal Details)", () => {
    expect(HEALTH_PLAN_TYPE_OPTIONS).toEqual([
      "Marketplace",
      "Medicare",
      "Medicare Advantage",
      "Medicare Supplement",
      "Dental",
      "Vision",
      "Short-term",
      "Other",
    ]);
    expect(DEFAULT_HEALTH_SUBFILTERS.map((row) => row.label)).toEqual([
      "Marketplace",
      "Medicare Advantage",
      "Medicare A&B",
      "Supplemental",
    ]);
    const health = Object.fromEntries(fieldsForLine("health").map((field) => [field.key, field]));
    expect(health.applicant_name).toBeUndefined();
    expect(health.applicant_dob).toBeUndefined();
    expect(health.applicant_phone).toBeUndefined();
    expect(health.applicant_email).toBeUndefined();
    expect(health.co_applicant_name).toBeUndefined();
    expect(Object.keys(health).some((key) => /ssn|social|citizenship|preferred_doctor|prescription|alcohol|drug/i.test(key))).toBe(false);
    expect(health.plan_type).toMatchObject({ input: "select", label: "Coverage type" });
    expect(health.plan_type.options).toEqual([...HEALTH_PLAN_TYPE_OPTIONS]);
    expect(health.metal_level.options).toEqual([...HEALTH_METAL_LEVEL_OPTIONS]);
    expect(health.metal_level.showWhen).toEqual({ key: "plan_type", values: ["Marketplace"] });
    expect(health.deductible_preference.options).toEqual([...HEALTH_COST_PREF_OPTIONS]);
    expect(health.oop_max_preference.options).toEqual([...HEALTH_COST_PREF_OPTIONS]);
    expect(health.medicare_number.showWhen?.values).toEqual([...MEDICARE_COVERAGE_SHOW_VALUES]);
    expect(health.part_a_start.showWhen?.key).toBe("plan_type");
    expect(health.lis_extra_help.options).toEqual([...YES_NO_OPTIONS]);
    expect(health.household_size.options).toEqual([...HOUSEHOLD_SIZE_OPTIONS]);
    expect(health.household_income.input).toBe("number");
    expect(health.expected_tax_credit.options).toEqual([...YES_NO_OPTIONS]);
    expect(health.spouse_name.showWhen?.key).toBe("spouse_on_application");
    expect(health.spouse_dob.showWhen?.key).toBe("spouse_on_application");
    expect(health.dependents_under_26.options).toEqual([...YES_NO_OPTIONS]);
    expect(health.dependent_1_name.showWhen?.key).toBe("dependents_under_26");
    expect(health.dependent_1_student.options).toEqual([...YES_NO_OPTIONS]);
    expect(health[`dependent_${HEALTH_DEPENDENT_SLOT_COUNT}_dob`].showWhen?.key).toBe("dependents_under_26");
    expect(health.pregnancy_due_date.showWhen?.key).toBe("pregnancy");
    expect(health.tobacco_status.options).toEqual([...TOBACCO_STATUS_OPTIONS]);
    expect(health.tobacco_type.options).toEqual([...TOBACCO_TYPE_OPTIONS]);
    expect(health.tobacco_type.showWhen?.values).toEqual(["Former", "Current"]);
    expect(health.last_tobacco_date.showWhen?.values).toEqual(["Former", "Current"]);
    expect(health.medical_conditions.input).toBe("multiselect");
    expect(health.medical_conditions.options).toEqual([...HEALTH_MEDICAL_CONDITION_OPTIONS]);
    expect(health.notes.group).toBe("Health");
    expect(health.employer_plan_name.showWhen?.key).toBe("employer_plan");
    expect(health.employer_plan_premium.showWhen?.key).toBe("employer_plan");
    expect(health.qle_type.options).toEqual([...HEALTH_QLE_TYPE_OPTIONS]);
    expect(health.qle_type.showWhen?.key).toBe("qualifying_life_event");
    expect(health.qle_date.showWhen?.key).toBe("qualifying_life_event");
    expect(health.existing_carrier.showWhen?.key).toBe("existing_coverage");
    expect(health.existing_plan_type.showWhen?.key).toBe("existing_coverage");
    expect(health.network_type).toBeUndefined();
    expect(health.preferred_doctors).toBeUndefined();
    expect(health.medicare_parts).toBeUndefined();
    expect(health.members).toBeUndefined();
    expect(emptyDefaultsForLine("health")).toEqual({ plan_type: "Marketplace" });
    expect(blankSheetWithDefaults("health").plan_type.value).toBe("Marketplace");
    expect(sheetFieldIsVisible(health.metal_level, { plan_type: "Marketplace" })).toBe(true);
    expect(sheetFieldIsVisible(health.metal_level, { plan_type: "Medicare" })).toBe(false);
    expect(sheetFieldIsVisible(health.medicare_number, { plan_type: "Medicare" })).toBe(true);
    expect(sheetFieldIsVisible(health.medicare_number, { plan_type: "Medicare Advantage" })).toBe(true);
    expect(sheetFieldIsVisible(health.medicare_number, { plan_type: "Medicare Supplement" })).toBe(true);
    expect(sheetFieldIsVisible(health.medicare_number, { plan_type: "Marketplace" })).toBe(false);
    expect(sheetFieldIsVisible(health.medicare_number, { plan_type: "Dental" })).toBe(false);
    expect(sheetGroupIsVisible([health.medicare_number, health.part_a_start], { plan_type: "Marketplace" })).toBe(false);
    expect(sheetGroupIsVisible([health.medicare_number, health.part_a_start], { plan_type: "Medicare" })).toBe(true);
    expect(sheetFieldIsVisible(health.spouse_name, { spouse_on_application: "yes" })).toBe(true);
    expect(sheetFieldIsVisible(health.spouse_name, { spouse_on_application: "no" })).toBe(false);
    expect(sheetFieldIsVisible(health.dependent_1_name, { dependents_under_26: "yes" })).toBe(true);
    expect(sheetFieldIsVisible(health.dependent_1_name, { dependents_under_26: "no" })).toBe(false);
    expect(sheetFieldIsVisible(health.pregnancy_due_date, { pregnancy: "yes" })).toBe(true);
    expect(sheetFieldIsVisible(health.employer_plan_name, { employer_plan: "no" })).toBe(false);
    expect(sheetFieldIsVisible(health.qle_type, { qualifying_life_event: "yes" })).toBe(true);
    expect(sheetFieldIsVisible(health.existing_carrier, { existing_coverage: "no" })).toBe(false);
  });

  it("normalizes common Life/Health leftovers onto select values", () => {
    expect(normalizeLifeProductType("term")).toBe("Term");
    expect(normalizeLifeProductType("Term Life")).toBe("Term");
    expect(normalizeLifeProductType("Indexed Universal Life")).toBe("Indexed Universal Life");
    expect(normalizeLifeProductType("IUL")).toBe("Indexed Universal Life");
    expect(normalizeLifeProductType("UL")).toBe("Universal Life");
    expect(normalizeLifeProductType("VUL")).toBe("Variable Universal Life");
    expect(normalizeLifeProductType("final expense")).toBe("Final Expense");
    expect(normalizeHealthPlanType("MAPD")).toBe("Medicare Advantage");
    expect(normalizeHealthPlanType("Original Medicare")).toBe("Medicare");
    expect(normalizeHealthPlanType("Medicare A&B")).toBe("Medicare");
    expect(normalizeHealthPlanType("Medigap")).toBe("Medicare Supplement");
    expect(normalizeHealthPlanType("Supplemental")).toBe("Medicare Supplement");
    expect(normalizeHealthPlanType("short term")).toBe("Short-term");
    expect(isMedicareCoverageType("Medicare Advantage")).toBe(true);
    expect(isMedicareCoverageType("Marketplace")).toBe(false);
    expect(isMarketplaceCoverageType("Marketplace")).toBe(true);
    expect(normalizeTobaccoStatus("never smoked")).toBe("Never");
    expect(normalizeTobaccoStatus("quit")).toBe("Former");
    expect(normalizeTobaccoStatus("yes")).toBe("Current");
  });

  it("applies extract values onto Life/Health selects", () => {
    const life = applyExtractedToSheet("life", emptySheetValues("life"), [
      { fieldKey: "product_type", normalizedValue: "whole life" },
      { fieldKey: "tobacco", normalizedValue: "smoker" },
    ]);
    expect(life.values.product_type.value).toBe("Whole Life");
    expect(life.values.tobacco_status.value).toBe("Current");

    const health = applyExtractedToSheet("health", emptySheetValues("health"), [
      { fieldKey: "plan_type", normalizedValue: "medicare advantage" },
      { fieldKey: "tobacco", normalizedValue: "never" },
    ]);
    expect(health.values.plan_type.value).toBe("Medicare Advantage");
    expect(health.values.tobacco_status.value).toBe("Never");
  });

  it("copies cascade subtype onto Life product type / Health plan family when filling from deal", () => {
    const life = fillSheetFromDealDetails(
      {
        quotingForm: "IUL",
        policySubType: "IUL",
        stored: { first_name: "Ada", last_name: "Lovelace", date_of_birth: "1980-01-01" },
      },
      emptySheetValues("life"),
    );
    expect(life.values.product_type.value).toBe("Indexed Universal Life");
    expect(life.values.applicant_name).toBeUndefined();
    expect(life.values.applicant_dob).toBeUndefined();

    const health = fillSheetFromDealDetails(
      {
        quotingForm: "Medicare A&B",
        policySubType: "Medicare A&B",
        stored: { first_name: "Ada", last_name: "Lovelace", date_of_birth: "1980-01-01" },
      },
      emptySheetValues("health"),
    );
    expect(health.values.plan_type.value).toBe("Medicare");
    expect(health.values.applicant_name).toBeUndefined();
    expect(health.values.applicant_dob).toBeUndefined();

    const home = fillSheetFromDealDetails(
      { quotingForm: "HO3", policySubType: "HO3" },
      emptySheetValues("home"),
    );
    expect(home.values.product_type).toBeUndefined();
    expect(home.values.plan_type).toBeUndefined();
  });

  it("keeps Life/Health out of the PC package checkboxes and hides them from add-line when off", () => {
    const pkg = readFileSync("src/lib/deals/package-lines.ts", "utf8");
    expect(pkg).toMatch(/PC_PACKAGE_LINES = \["home", "auto", "flood"\]/);
    const panel = readFileSync("src/components/deal/quote-sheet-panel.tsx", "utf8");
    expect(panel).toMatch(/visibleShopLines/);
    const add = readFileSync("src/app/actions/quote-sheet.ts", "utf8");
    expect(add).toMatch(/That line is turned off in Settings → Lines/);
    const stages = readFileSync("src/lib/deals/product-stages.ts", "utf8");
    expect(stages).toMatch(/group === "life" \|\| group === "health"/);
    expect(stages).toMatch(/PC_FORM_LEFTOVER/);
  });
});
