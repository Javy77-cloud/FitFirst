import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fieldsForLine, emptySheetValues, blankSheetWithDefaults } from "./catalog";
import { applyExtractedToSheet } from "./apply";
import { fillSheetFromDealDetails } from "./fill-from-deal";
import { DEFAULT_HEALTH_SUBFILTERS, DEFAULT_LIFE_SUBFILTERS } from "@/lib/desk/line-settings";
import { RELATIONSHIP_TO_INSURED_OPTIONS } from "./applicant-core";
import {
  BENEFICIARY_SHARE_OPTIONS,
  HEALTH_EFFECTIVE_DATE_TYPE_OPTIONS,
  HEALTH_METAL_LEVEL_OPTIONS,
  HEALTH_NETWORK_TYPE_OPTIONS,
  HEALTH_PLAN_TYPE_OPTIONS,
  HEALTH_SEP_REASON_OPTIONS,
  HOUSEHOLD_INCOME_BAND_OPTIONS,
  HOUSEHOLD_SIZE_OPTIONS,
  LAST_NICOTINE_USE_OPTIONS,
  LIFE_HEALTH_CLASS_OPTIONS,
  LIFE_HEIGHT_FT_OPTIONS,
  LIFE_HEIGHT_IN_OPTIONS,
  LIFE_PREMIUM_MODE_OPTIONS,
  LIFE_PRODUCT_TYPE_OPTIONS,
  LIFE_PURPOSE_OPTIONS,
  LIFE_TERM_YEARS_OPTIONS,
  MEDICARE_PARTS_OPTIONS,
  NICOTINE_TYPE_OPTIONS,
  RESIDENCY_STATUS_OPTIONS,
  TAX_FILING_STATUS_OPTIONS,
  TOBACCO_STATUS_OPTIONS,
  YES_NO_OPTIONS,
  emptyDefaultsForLine,
  normalizeHealthPlanType,
  normalizeLifeProductType,
  normalizeTobaccoStatus,
} from "./sheet-defaults";

describe("Life + Health master-sheet depth", () => {
  it("aligns Life product types to desk Term / Whole / IUL / Final Expense chips", () => {
    expect(LIFE_PRODUCT_TYPE_OPTIONS.slice(0, 4)).toEqual(
      DEFAULT_LIFE_SUBFILTERS.map((row) => row.label),
    );
    const life = Object.fromEntries(fieldsForLine("life").map((field) => [field.key, field]));
    expect(life.product_type).toMatchObject({ input: "select" });
    expect(life.product_type.options).toEqual([...LIFE_PRODUCT_TYPE_OPTIONS]);
    expect(life.term_years.options).toEqual([...LIFE_TERM_YEARS_OPTIONS]);
    expect(life.premium_mode.options).toEqual([...LIFE_PREMIUM_MODE_OPTIONS]);
    expect(life.purpose_of_insurance.options).toEqual([...LIFE_PURPOSE_OPTIONS]);
    expect(life.height_ft.options).toEqual([...LIFE_HEIGHT_FT_OPTIONS]);
    expect(life.height_in.options).toEqual([...LIFE_HEIGHT_IN_OPTIONS]);
    expect(life.weight.input).toBe("number");
    expect(life.tobacco_status.options).toEqual([...TOBACCO_STATUS_OPTIONS]);
    expect(life.nicotine_type.options).toEqual([...NICOTINE_TYPE_OPTIONS]);
    expect(life.last_nicotine_use.options).toEqual([...LAST_NICOTINE_USE_OPTIONS]);
    expect(life.health_class.options).toEqual([...LIFE_HEALTH_CLASS_OPTIONS]);
    expect(life.us_residency.options).toEqual([...RESIDENCY_STATUS_OPTIONS]);
    expect(life.beneficiary_relationship.options).toEqual([...RELATIONSHIP_TO_INSURED_OPTIONS]);
    expect(life.beneficiary_share.options).toEqual([...BENEFICIARY_SHARE_OPTIONS]);
    expect(life.existing_coverage.options).toEqual([...YES_NO_OPTIONS]);
    expect(life.replacement.options).toEqual([...YES_NO_OPTIONS]);
    expect(life.face_amount.input).toBe("number");
    expect(life.notes.group).toBe("Notes");
    expect(emptyDefaultsForLine("life")).toEqual({ product_type: "Term Life" });
    expect(blankSheetWithDefaults("life").product_type.value).toBe("Term Life");
  });

  it("aligns Health plan family to Marketplace / MA / A&B / Supplemental chips", () => {
    expect(HEALTH_PLAN_TYPE_OPTIONS.slice(0, 4)).toEqual(
      DEFAULT_HEALTH_SUBFILTERS.map((row) => row.label),
    );
    const health = Object.fromEntries(fieldsForLine("health").map((field) => [field.key, field]));
    expect(health.plan_type).toMatchObject({ input: "select", label: "Plan family" });
    expect(health.plan_type.options).toEqual([...HEALTH_PLAN_TYPE_OPTIONS]);
    expect(health.network_type.options).toEqual([...HEALTH_NETWORK_TYPE_OPTIONS]);
    expect(health.metal_level.options).toEqual([...HEALTH_METAL_LEVEL_OPTIONS]);
    expect(health.household_size.options).toEqual([...HOUSEHOLD_SIZE_OPTIONS]);
    expect(health.tax_filing_status.options).toEqual([...TAX_FILING_STATUS_OPTIONS]);
    expect(health.income_band.options).toEqual([...HOUSEHOLD_INCOME_BAND_OPTIONS]);
    expect(health.tobacco_status.options).toEqual([...TOBACCO_STATUS_OPTIONS]);
    expect(health.effective_date_type.options).toEqual([...HEALTH_EFFECTIVE_DATE_TYPE_OPTIONS]);
    expect(health.sep_reason.options).toEqual([...HEALTH_SEP_REASON_OPTIONS]);
    expect(health.medicare_parts.options).toEqual([...MEDICARE_PARTS_OPTIONS]);
    expect(health.medicaid_or_extra_help.options).toEqual([...YES_NO_OPTIONS]);
    expect(health.preferred_doctors.input).toBe("textarea");
    expect(health.members.input).toBe("number");
    expect(emptyDefaultsForLine("health")).toEqual({ plan_type: "Marketplace" });
    expect(blankSheetWithDefaults("health").plan_type.value).toBe("Marketplace");
  });

  it("normalizes common Life/Health leftovers onto select values", () => {
    expect(normalizeLifeProductType("term")).toBe("Term Life");
    expect(normalizeLifeProductType("Indexed Universal Life")).toBe("IUL");
    expect(normalizeLifeProductType("final expense")).toBe("Final Expense");
    expect(normalizeHealthPlanType("MAPD")).toBe("Medicare Advantage");
    expect(normalizeHealthPlanType("Original Medicare")).toBe("Medicare A&B");
    expect(normalizeHealthPlanType("Medigap")).toBe("Supplemental");
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
      { quotingForm: "IUL", policySubType: "IUL" },
      emptySheetValues("life"),
    );
    expect(life.values.product_type.value).toBe("IUL");

    const health = fillSheetFromDealDetails(
      { quotingForm: "Medicare A&B", policySubType: "Medicare A&B" },
      emptySheetValues("health"),
    );
    expect(health.values.plan_type.value).toBe("Medicare A&B");

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
  });
});
