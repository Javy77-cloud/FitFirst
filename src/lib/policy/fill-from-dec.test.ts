import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProcessingLabel, WaitHold } from "@/components/desk/wait-hold";
import { PolicyCoverageTab } from "@/components/policy/tabs/coverage-tab";
import { policyInformationFields } from "@/lib/desk/policy-information";
import type { MintGeminiRow } from "@/lib/policy/mint-gate";
import { GEMINI_EXTRACT_JSON_KEYS, buildGeminiUserPrompt } from "@/lib/extraction/gemini/prompt";
import { fillableGeminiFields, mapGeminiJsonToFields, sheetKeysForGeminiKey } from "@/lib/extraction/gemini/map";
import { propertyProtectionWithDwelling } from "@/lib/policy/dwelling-facts";
import {
  INES_CAMPS_TOWER_HILL_DP3_EXTRACT,
  INES_CAMPS_TOWER_HILL_DP3_RATING,
} from "@/lib/policy/fixtures/ines-camps-tower-hill-dp3";
import { buildLobOverviewSections } from "@/lib/policy/lob-overview";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { autoCoverageExtras, autoCoverageSchedule, autoVehicleCoverageBlocks } from "@/lib/policy/auto-coverage";
import {
  applyInForceFillTermDateGuard,
  buildPolicyFillAuditInsert,
  classifyFillFields,
  countFillOverwrites,
  fillFamilyForPolicy,
  fillOverwriteWarning,
  formatDecDeductible,
  groupAppliedFill,
  guardInForceFillTermDates,
  manualFillReasonError,
  parseDecTermDate,
  pickPolicyDecDocument,
  proposeFillFromDec,
  snapshotFillTargets,
} from "@/lib/policy/fill-from-dec";

function source(file: string) {
  return readFileSync(file, "utf8");
}

function rows(entries: Record<string, string>): MintGeminiRow[] {
  return Object.entries(entries).map(([fieldKey, normalizedValue]) => ({
    fieldKey,
    normalizedValue,
    rawValue: normalizedValue,
    confidence: 0.95,
    flagged: false,
  }));
}

const gloria = rows({
  property_address: "8944 ADRIATICO LN KISSIMMEE, FL 34747 OSCEOLA COUNTY",
  mailing_address: "10358 NW 30 TER Doral, FL 33172",
  construction: "Masonry",
  year_built: "2017",
  dwelling_type: "Y",
  number_of_families: "1",
  occupancy: "Y",
  protection_class: "3",
  bceg_grade: "4",
  county: "OSCEOLA",
  dwelling_replacement_cost: "Y",
  personal_property_replacement_cost: "N",
  burglar_alarm: "Y",
  fire_alarm: "Y",
  sprinkler: "N",
  mortgagee: "WELLS FARGO BANK, NA",
  loan_number: "0509210662",
  form: "HO3",
  coverage_a: "433613",
  coverage_b: "43368",
  coverage_c: "108404",
  coverage_d: "86723",
  coverage_e: "300000",
  coverage_f: "1000",
  aop_deductible: "$2,500",
  hurricane_deductible: "2.0% of Coverage A - $8,672",
  ordinance_or_law: "25%",
  premium: "6567.76",
  effective_date: "06/28/2026",
  expiration_date: "06/28/2027",
});

describe("fillPolicyFromDec field map", () => {
  it("maps a stick-built HO3 dec onto overview and coverage fields", () => {
    const proposed = proposeFillFromDec({ family: "homeowners", rows: gloria });
    expect(proposed.premisesAddress).toMatch(/ADRIATICO/i);
    expect(proposed.premisesCity).toMatch(/KISSIMMEE/i);
    expect(proposed.premisesState).toBe("FL");
    expect(proposed.premisesZip).toBe("34747");
    expect(proposed.mailingAddress).toMatch(/10358 NW 30 TER/i);
    expect(proposed.mailingCity).toMatch(/Doral/i);
    expect(proposed.yearBuilt).toBe("2017");
    expect(proposed.construction).toBe("Masonry");
    expect(proposed.dwellingType).toBe("Townhouse/Rowhouse");
    expect(proposed.families).toBe("1");
    expect(proposed.occupancy).toBe("Yes");
    expect(proposed.protectionClass).toBe("3");
    expect(proposed.bceg).toBe("4");
    expect(proposed.county).toBe("OSCEOLA");
    expect(proposed.dwellingReplacementCost).toBe("Yes");
    expect(proposed.personalPropertyReplacementCost).toBe("No");
    expect(proposed.burglarAlarm).toBe("Yes");
    expect(proposed.fireAlarm).toBe("Yes");
    expect(proposed.sprinkler).toBe("No");
    expect(proposed.mortgageeName).toMatch(/WELLS FARGO/i);
    expect(proposed.mortgageeLoanNumber).toBe("0509210662");
    expect(proposed.formType).toBe("HO3");
    expect(proposed.coverageA).toBe("433613");
    expect(proposed.coverageB).toBe("$43,368");
    expect(proposed.coverageE).toBe("$300,000");
    expect(proposed.aopDeductible).toBe("$2,500");
    expect(proposed.policyType).toBeUndefined();
    expect(proposed.coverageALimit).toBe("$433,613");
    expect(proposed.hurricaneDeductible).toBe("2% ($8,672)");
    expect(proposed.ordinanceOrLaw).toBe("25%");
    expect(proposed.premium).toBe("6567.76");
    expect(proposed.effectiveDate).toBe("2026-06-28");
    expect(proposed.expirationDate).toBe("2027-06-28");
    expect(proposed.termMonths).toBe("12");
    expect(formatDecDeductible("2.0% of Coverage A - $8,672")).toBe("2% ($8,672)");
    expect(parseDecTermDate("Sept 29, 2026")).toBe("2026-09-29");
    expect(sheetKeysForGeminiKey("effective_date")).toContain("effective_date");
    expect(sheetKeysForGeminiKey("expiration_date")).toContain("expiration_date");
    expect(sheetKeysForGeminiKey("term_length")).toContain("term_months");
  });

  it("maps mobile-home unit, roof, and scheduled structures when printed", () => {
    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        year_built: "2006",
        unit_year: "2006",
        unit_make: "General MFG",
        unit_serial: "GMHGA40533527a/b",
        unit_length: "52",
        unit_width: "24",
        roof_material: "Composition Shingle",
        date_of_roof_installation: "2024",
        scheduled_carport: "9000",
        scheduled_screen_room: "10000",
        scheduled_shed: "2000",
        coverage_a: "130000",
      }),
    });
    expect(proposed.yearBuilt).toBe("2006");
    expect(proposed.unitYear).toBe("2006");
    expect(proposed.unitMake).toBe("General MFG");
    expect(proposed.unitSerial).toBe("GMHGA40533527a/b");
    expect(proposed.roofCovering).toBe("Composition Shingle");
    expect(proposed.roofYear).toBe("2024");
    expect(proposed.scheduledCarport).toBe("$9,000");
    expect(proposed.scheduledScreenRoom).toBe("$10,000");
    expect(proposed.scheduledShed).toBe("$2,000");
    expect(proposed.formType).toBe("MHO");
    expect(proposed.policyType).toBe("MHO");
    expect(proposed.policySubType).toBe("MHO");
  });

  it("fills an American Traditions manufactured-home dec as MHO with dollars and deductibles", () => {
    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        form: "HO3",
        insurance_type: "Home",
        current_carrier: "American Traditions",
        unit_year: "2006",
        unit_make: "General MFG",
        unit_serial: "GMHGA40533527a/b",
        coverage_a: "130000",
        coverage_c: "65000",
        coverage_d: "26000",
        coverage_e: "100000",
        coverage_f: "500",
        aop_deductible: "1000",
        hurricane_deductible: "2%",
        windstorm_deductible: "1000",
      }),
    });
    expect(proposed.formType).toBe("MHO");
    expect(proposed.policyType).toBe("MHO");
    expect(proposed.policySubType).toBe("MHO");
    expect(proposed.coverageA).toBe("130000");
    expect(proposed.coverageALimit).toBe("$130,000");
    expect(proposed.coverageB).toBeUndefined();
    expect(proposed.coverageC).toBe("$65,000");
    expect(proposed.coverageD).toBe("$26,000");
    expect(proposed.coverageE).toBe("$100,000");
    expect(proposed.coverageF).toBe("$500");
    expect(proposed.aopDeductible).toBe("$1,000");
    expect(proposed.hurricaneDeductible).toBe("2%");
    expect(proposed.windHailDeductible).toBe("$1,000");
    expect(sheetKeysForGeminiKey("all_other_perils_deductible")).toContain("aop_deductible");
    expect(sheetKeysForGeminiKey("windstorm_or_hail")).toContain("wind_hail_deductible");
    expect(sheetKeysForGeminiKey("dwelling_limit")).toContain("coverage_a");
  });

  it("fills American Traditions section I, optionals, and rating without turning the home into MHO", () => {
    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        form: "HO3",
        current_carrier: "American Traditions",
        aop_deductible: "1000",
        windstorm_or_hail_other_than_hurricane: "1000",
        hurricane_deductible: "2% of Coverage A",
        sinkhole_deductible: "Not Included",
        personal_injury: "100000",
        personal_injury_premium: "Included",
        personal_property_replacement_cost: "Included",
        personal_property_replacement_cost_premium: "172.99",
        home_computer: "1000",
        home_computer_premium: "4.94",
        ordinance_law: "33700",
        ordinance_law_premium: "-82.40",
        water_backup: "5000",
        water_backup_premium: "20.58",
        construction_type: "Masonry",
        year_of_construction: "2024",
        year_of_roof_updated: "2024",
        type_of_residence: "Owner Occupied",
        dwelling_type: "Single Family",
        months_occupied: "9 to 12 Months",
        occupancy: "Owner",
      }),
    });
    expect(proposed.formType).toBe("HO3");
    expect(proposed.policyType).toBeUndefined();
    expect(proposed.aopDeductible).toBe("$1,000");
    expect(proposed.windHailDeductible).toBe("$1,000");
    expect(proposed.hurricaneDeductible).toBe("2% of Coverage A");
    expect(proposed.hurricaneDeductible).not.toBe("$6,740");
    expect(proposed.sinkholeDeductible).toBe("Not Included");
    expect(proposed.sinkholeDeductible).not.toMatch(/\$/);
    expect(proposed.personalInjury).toBe("$100,000");
    expect(proposed.personalInjuryPremium).toBe("Included");
    expect(proposed.personalPropertyReplacementCost).toBe("Included");
    expect(proposed.personalPropertyReplacementCostPremium).toBe("$172.99");
    expect(proposed.homeComputer).toBe("$1,000");
    expect(proposed.homeComputerPremium).toBe("$4.94");
    expect(proposed.ordinanceOrLaw).toBe("$33,700");
    expect(proposed.ordinanceOrLawPremium).toBe("-$82.40");
    expect(proposed.waterBackup).toBe("$5,000");
    expect(proposed.waterBackupPremium).toBe("$20.58");
    expect(proposed.construction).toBe("Masonry");
    expect(proposed.yearBuilt).toBe("2024");
    expect(proposed.roofYear).toBe("2024");
    expect(proposed.typeOfResidence).toBe("Owner Occupied");
    expect(proposed.dwellingType).toBe("Single Family");
    expect(proposed.monthsOccupied).toBe("9 to 12 Months");
    expect(proposed.occupancy).toBe("Owner");

    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    expect(patch.term.aopDeductible).toBe("$1,000");
    expect(patch.term.hurricaneDeductible).toBe("2% of Coverage A");
    expect(patch.coverageLimits.wind_hail_deductible).toBe("$1,000");
    expect(patch.coverageLimits.sinkhole_deductible).toBe("Not Included");
    expect(patch.coverageLimits.personal_injury).toBe("$100,000");
    expect(patch.coverageLimits.personal_injury_premium).toBe("Included");
    expect(patch.coverageLimits.personal_property_replacement_cost).toBe("Included");
    expect(patch.coverageLimits.personal_property_replacement_cost_premium).toBe("$172.99");
    expect(patch.coverageLimits.home_computer).toBe("$1,000");
    expect(patch.coverageLimits.home_computer_premium).toBe("$4.94");
    expect(patch.coverageLimits.ordinance_or_law).toBe("$33,700");
    expect(patch.coverageLimits.ordinance_or_law_premium).toBe("-$82.40");
    expect(patch.coverageLimits.water_backup).toBe("$5,000");
    expect(patch.coverageLimits.water_backup_premium).toBe("$20.58");
    expect(patch.coverageLimits.type_of_residence).toBe("Owner Occupied");
    expect(patch.coverageLimits.months_occupied).toBe("9 to 12 Months");
    expect(patch.coverageLimits.dwelling_type).toBe("Single Family");
    expect(patch.risk.construction).toBe("Masonry");
    expect(patch.risk.yearBuilt).toBe(2024);
    expect(patch.risk.roofYear).toBe(2024);
    expect(patch.risk.occupancy).toBe("Owner");

    const html = renderToString(
      createElement(PolicyCoverageTab, {
        policy: {
          id: "p-at",
          coverageA: 337000,
          coverageLimits: patch.coverageLimits,
          faceAmount: null,
          lineOfBusiness: "HO",
          formType: "HO3",
          policyType: "HO3",
        },
        terms: [],
        currentTerm: {
          id: "t-at",
          role: "current",
          premium: null,
          aopDeductible: patch.term.aopDeductible ?? null,
          hurricaneDeductible: patch.term.hurricaneDeductible ?? null,
          comprehensiveDeductible: null,
          collisionDeductible: null,
          coverages: null,
          termEffective: new Date("2026-09-25T12:00:00.000Z"),
          termExpiration: new Date("2027-09-25T12:00:00.000Z"),
        },
      }),
    );
    expect(html).toContain("$337,000");
    expect(html).toContain("$1,000");
    expect(html).toContain("All Other Perils (AOP)");
    expect(html).toContain("Windstorm or Hail (Other Than Hurricane)");
    expect(html).toContain("Hurricane (% of Cov A)");
    expect(html).toContain("2% of Coverage A");
    expect(html).not.toContain("AOP deductible");
    expect(html).not.toContain(">Deductible<");
    expect(html).not.toContain("Wind/hail deductible");
    expect(html).toContain("Sinkhole");
    expect(html).toContain("Not Included");
    expect(html).toContain("Personal Injury");
    expect(html).toContain("$100,000");
    expect(html).toContain("Included");
    expect(html).toContain("$172.99");
    expect(html).toContain("Home Computer");
    expect(html).toContain("$4.94");
    expect(html).toContain("Ordinance or Law");
    expect(html).toContain("$33,700");
    expect(html).toContain("-$82.40");
    expect(html).toContain("Water Back Up and Sump Overflow");
    expect(html).toContain("$5,000");
    expect(html).toContain("$20.58");
  });

  it("fills the American Traditions coverage schedule with row premiums and separate deductibles", () => {
    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        form: "HO3",
        current_carrier: "American Traditions",
        coverage_a: "337000",
        coverage_a_premium: "1310.55",
        coverage_b: "6740",
        coverage_b_premium: "Included",
        coverage_c: "84250",
        coverage_c_premium: "Included",
        coverage_d: "33700",
        coverage_d_premium: "Included",
        ordinance_law: "33700",
        ordinance_law_premium: "-82.40",
        all_other_perils: "1000",
        windstorm_or_hail_other_than_hurricane: "1000",
        hurricane_deductible: "2% of Coverage A",
        sinkhole_deductible: "Not Included",
        coverage_e: "100000",
        coverage_e_premium: "12.35",
        coverage_f: "5000",
        coverage_f_premium: "8.23",
        premium: "2500.00",
        construction_type: "Masonry",
        year_of_construction: "2024",
        occupancy: "Owner",
        type_of_residence: "Owner Occupied",
      }),
    });
    expect(proposed.coverageAPremium).toBe("$1,310.55");
    expect(proposed.coverageBPremium).toBe("Included");
    expect(proposed.coverageCPremium).toBe("Included");
    expect(proposed.coverageDPremium).toBe("Included");
    expect(proposed.coverageEPremium).toBe("$12.35");
    expect(proposed.coverageFPremium).toBe("$8.23");
    expect(proposed.premium).toBe("2500.00");
    expect(proposed.aopDeductible).toBe("$1,000");
    expect(proposed.yearBuilt).toBe("2024");
    expect(proposed.construction).toBe("Masonry");
    expect(proposed.occupancy).toBe("Owner");

    const windOnly = proposeFillFromDec({
      family: "homeowners",
      rows: rows({ wind_hail_deductible: "1000", coverage_a: "337000" }),
    });
    expect(windOnly.aopDeductible).toBeUndefined();
    expect(windOnly.windHailDeductible).toBe("$1,000");

    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    expect(patch.coverageLimits.coverage_a_premium).toBe("$1,310.55");
    expect(patch.coverageLimits.coverage_b_premium).toBe("Included");
    expect(patch.coverageLimits.coverage_f_premium).toBe("$8.23");
    expect(patch.term.premium).toBe("2500.00");
    expect(patch.risk.yearBuilt).toBe(2024);

    const html = renderToString(
      createElement(PolicyCoverageTab, {
        policy: {
          id: "p-rippey",
          coverageA: 337000,
          coverageLimits: patch.coverageLimits,
          faceAmount: null,
          lineOfBusiness: "HO",
          formType: "HO3",
          policyType: "HO3",
        },
        terms: [],
        currentTerm: {
          id: "t-rippey",
          role: "current",
          premium: patch.term.premium ?? null,
          aopDeductible: patch.term.aopDeductible ?? null,
          hurricaneDeductible: patch.term.hurricaneDeductible ?? null,
          comprehensiveDeductible: null,
          collisionDeductible: null,
          coverages: null,
          termEffective: new Date("2026-09-25T12:00:00.000Z"),
          termExpiration: new Date("2027-09-25T12:00:00.000Z"),
        },
      }),
    );
    expect(html).toContain("Coverage A");
    expect(html).toContain("$337,000");
    expect(html).toContain("$1,310.55");
    expect(html).toContain("Coverage B");
    expect(html).toContain("$6,740");
    expect(html).toContain(">Included<");
    expect(html).toContain("$84,250");
    expect(html).toContain("Ordinance or Law");
    expect(html).toContain("-$82.40");
    expect(html).toContain("All Other Perils (AOP)");
    expect(html).toContain("Windstorm or Hail (Other Than Hurricane)");
    expect(html).toContain("Hurricane (% of Cov A)");
    expect(html).toContain("2% of Coverage A");
    expect(html).toContain("Sinkhole");
    expect(html).toContain("Not Included");
    expect(html).toContain("$100,000");
    expect(html).toContain("$12.35");
    expect(html).toContain("$5,000");
    expect(html).toContain("$8.23");
    expect(html).not.toContain(">Deductible<");
    expect(html).not.toContain("AOP deductible");
    expect(html).not.toContain("$2,500");
  });

  it("stores None for a blank rating value and does not invent optionals or a sinkhole dollar", () => {
    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        occupancy: "None",
        months_occupied: "None",
        type_of_residence: "n/a",
        sinkhole_deductible: "Not Included",
      }),
    });
    expect(proposed.occupancy).toBe("None");
    expect(proposed.monthsOccupied).toBe("None");
    expect(proposed.typeOfResidence).toBe("None");
    expect(proposed.sinkholeDeductible).toBe("Not Included");
    expect(proposed.personalInjury).toBeUndefined();
    expect(proposed.homeComputer).toBeUndefined();
    expect(proposed.waterBackup).toBeUndefined();
    expect(proposed.aopDeductible).toBeUndefined();
  });

  it("maps a Notary unit-owners endorsement without inventing A–F premiums or occupancy", () => {
    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        current_carrier: "Notary",
        coverage_a: "80000",
        coverage_c: "20000",
        coverage_d: "16000",
        coverage_e: "100000",
        coverage_f: "1000",
        coverage_a_premium: "1159.00",
        property_liability_package_premium: "1159.00",
        premium: "669.69",
        age_of_dwelling_credit: "-449.00",
        bceg_grade: "Incl",
        limited_fungi: "10000/10000",
        limited_fungi_premium: "Incl",
        catastrophic_ground_cover_collapse: "Incl",
        loss_assessment: "2000",
        loss_assessment_premium: "4.00",
        ordinance_or_law_coverage: "10%",
        ordinance_or_law_coverage_premium: "20.00",
        sinkhole_loss_coverage: "Incl",
        unit_owners_coverage_a_special_coverage: "Incl",
        aop_deductible: "1000",
        hurricane_deductible: "1000",
        year_built: "2023",
        construction_type: "Masonry",
      }),
    });
    expect(proposed.coverageA).toBe("80000");
    expect(proposed.coverageAPremium).toBeUndefined();
    expect(proposed.premium).toBe("669.69");
    expect(proposed.occupancy).toBeUndefined();
    expect(proposed.mortgageeName).toBeUndefined();
    expect(proposed.bceg).toBeUndefined();
    expect(proposed.formType).toBeUndefined();
    expect(proposed.yearBuilt).toBe("2023");
    expect(proposed.construction).toBe("Masonry");
    expect(proposed.aopDeductible).toBe("$1,000");
    expect(proposed.hurricaneDeductible).toBe("$1,000");
    expect(proposed.limitedFungi).toBe("$10,000/$10,000");
    expect(proposed.limitedFungiPremium).toBe("Included");
    expect(proposed.catastrophicGroundCoverCollapse).toBeUndefined();
    expect(proposed.catastrophicGroundCoverCollapsePremium).toBe("Included");
    expect(proposed.lossAssessment).toBe("$2,000");
    expect(proposed.lossAssessmentPremium).toBe("$4");
    expect(proposed.ordinanceOrLaw).toBe("10%");
    expect(proposed.ordinanceOrLawPremium).toBe("$20");
    expect(proposed.sinkholeDeductible).toBe("Included");
    expect(proposed.unitOwnersCoverageA).toBeUndefined();
    expect(proposed.unitOwnersCoverageAPremium).toBe("Included");
    expect(JSON.stringify(proposed)).not.toContain("449");

    const endorsed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({ occupancy: "Unit-Owners" }),
    });
    expect(endorsed.occupancy).toBeUndefined();

    const collapseOnly = proposeFillFromDec({
      family: "homeowners",
      rows: rows({ catastrophic_ground_cover_collapse_coverage: "Incl" }),
    });
    expect(collapseOnly.catastrophicGroundCoverCollapse).toBeUndefined();
    expect(collapseOnly.catastrophicGroundCoverCollapsePremium).toBe("Included");
    expect(collapseOnly.sinkholeDeductible).toBeUndefined();

    const perLine = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        coverage_a_premium: "88.50",
        coverage_b_premium: "Incl",
        coverage_c_premium: "-12.40",
        property_liability_package_premium: "1159.00",
        premium: "669.69",
      }),
    });
    expect(perLine.coverageAPremium).toBe("$88.50");
    expect(perLine.coverageBPremium).toBe("Included");
    expect(perLine.coverageCPremium).toBe("-$12.40");
    expect(perLine.premium).toBe("669.69");

    const copiedTotal = proposeFillFromDec({
      family: "homeowners",
      rows: rows({ coverage_a_premium: "669.69", premium: "669.69" }),
    });
    expect(copiedTotal.coverageAPremium).toBeUndefined();
    expect(copiedTotal.premium).toBe("669.69");

    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    expect(patch.coverageLimits.coverage_a_premium).toBeUndefined();
    expect(patch.coverageLimits.limited_fungi).toBe("$10,000/$10,000");
    expect(patch.coverageLimits.limited_fungi_premium).toBe("Included");
    expect(patch.coverageLimits.catastrophic_ground_cover_collapse_premium).toBe("Included");
    expect(patch.coverageLimits.sinkhole_deductible).toBe("Included");
    expect(patch.coverageLimits.loss_assessment).toBe("$2,000");
    expect(patch.coverageLimits.loss_assessment_premium).toBe("$4");
    expect(patch.coverageLimits.ordinance_or_law).toBe("10%");
    expect(patch.coverageLimits.ordinance_or_law_premium).toBe("$20");
    expect(patch.coverageLimits.sinkhole_deductible).toBe("Included");
    expect(patch.coverageLimits.unit_owners_coverage_a_premium).toBe("Included");
    expect(patch.policy.premium).toBe("669.69");
    expect(patch.risk.yearBuilt).toBe(2023);
    expect(patch.risk.construction).toBe("Masonry");
    expect(patch.risk.occupancy).toBeUndefined();
    expect(patch.term.aopDeductible).toBe("$1,000");
    expect(patch.term.hurricaneDeductible).toBe("$1,000");

    const html = renderToString(
      createElement(PolicyCoverageTab, {
        policy: {
          id: "p-notary",
          coverageA: 80000,
          coverageLimits: patch.coverageLimits,
          faceAmount: null,
          lineOfBusiness: "HO",
          formType: "HO6",
          policyType: "HO6",
        },
        terms: [],
        currentTerm: {
          id: "t-notary",
          role: "current",
          premium: "669.69",
          aopDeductible: patch.term.aopDeductible ?? null,
          hurricaneDeductible: patch.term.hurricaneDeductible ?? null,
          comprehensiveDeductible: null,
          collisionDeductible: null,
          coverages: null,
          termEffective: new Date("2026-09-25T12:00:00.000Z"),
          termExpiration: new Date("2027-09-25T12:00:00.000Z"),
        },
      }),
    );
    expect(html).toContain("$80,000");
    expect(html).not.toContain("669.69");
    expect(html).not.toContain("1,159");
    expect(html).not.toContain("449");
    expect(html).toContain("Loss Assessment");
    expect(html).toContain("$2,000");
    expect(html).toContain("Ordinance or Law");
    expect(html).toContain("10%");
    expect(html).toContain("$20");
    expect(html).toContain("Catastrophic Ground Cover Collapse");
    expect(html).toContain("Limited Fungi, Wet or Dry Rot, or Bacteria");
    expect(html).toContain("$10,000/$10,000");
    expect(html).toContain("Included");
    expect(html).toContain("Unit-Owners Coverage A - Special Coverage");
    expect(html).toContain("All Other Perils (AOP)");
    expect(html).toContain("Hurricane (% of Cov A)");
    expect(html).toContain("Sinkhole");
    const at = (label: string) => html.indexOf(label);
    expect(at("Coverage A")).toBeLessThan(at("Ordinance or Law"));
    expect(at("Ordinance or Law")).toBeLessThan(at("Catastrophic Ground Cover Collapse"));
    expect(at("Catastrophic Ground Cover Collapse")).toBeLessThan(at("Limited Fungi"));
    expect(at("Limited Fungi")).toBeLessThan(at("Loss Assessment"));
    expect(at("Loss Assessment")).toBeLessThan(at("Unit-Owners Coverage A"));
    expect(at("Unit-Owners Coverage A")).toBeLessThan(at("All Other Perils (AOP)"));
    expect(at("All Other Perils (AOP)")).toBeLessThan(at("Hurricane (% of Cov A)"));
    expect(at("Hurricane (% of Cov A)")).toBeLessThan(at("Sinkhole"));

    const perLinePatch = groupAppliedFill(perLine, Object.keys(perLine));
    const perLineHtml = renderToString(
      createElement(PolicyCoverageTab, {
        policy: {
          id: "p-lines",
          coverageA: 80000,
          coverageLimits: {
            ...perLinePatch.coverageLimits,
            coverage_b: "$2,000",
            coverage_c: "$20,000",
          },
          faceAmount: null,
          lineOfBusiness: "HO",
          formType: "HO6",
          policyType: "HO6",
        },
        terms: [],
        currentTerm: null,
      }),
    );
    expect(perLineHtml).toContain("$88.50");
    expect(perLineHtml).toContain("Included");
    expect(perLineHtml).toContain("-$12.40");
    expect(perLineHtml).not.toContain("1,159");
  });

  it("maps the rating block through Gemini onto occupancy, year built, and construction", () => {
    const mapped = mapGeminiJsonToFields(
      {
        construction_type: { value: "Masonry", confidence: 0.96 },
        year_of_construction: { value: "2024", confidence: 0.96 },
        year_of_roof_updated: { value: "2024", confidence: 0.96 },
        type_of_residence: { value: "Owner Occupied", confidence: 0.96 },
        dwelling_type: { value: "Single Family", confidence: 0.96 },
        number_of_months_occupied: { value: "9 to 12 Months", confidence: 0.96 },
        occupancy: { value: "Owner", confidence: 0.96 },
      },
      "dec",
    );
    expect(sheetKeysForGeminiKey("year_of_construction")).toEqual(["year_built"]);
    expect(sheetKeysForGeminiKey("construction_type")).toEqual(["construction"]);
    expect(sheetKeysForGeminiKey("year_of_roof_updated")).toEqual(["roof_year"]);
    expect(sheetKeysForGeminiKey("number_of_months_occupied")).toEqual(["months_occupied"]);
    expect(sheetKeysForGeminiKey("occupancy")).toEqual(["occupancy"]);
    expect(sheetKeysForGeminiKey("type_of_residence")).toEqual(["type_of_residence"]);
    expect(sheetKeysForGeminiKey("dwelling_type")).toEqual(["dwelling_type"]);

    const byKey = Object.fromEntries(mapped.fields.map((field) => [field.fieldKey, field.normalizedValue]));
    expect(byKey.construction).toBe("Masonry");
    expect(byKey.year_built).toBe("2024");
    expect(byKey.roof_year).toBe("2024");
    expect(byKey.occupancy).toBe("Owner");
    expect(byKey.type_of_residence).toBe("Owner Occupied");
    expect(byKey.dwelling_type).toBe("Single Family");
    expect(byKey.months_occupied).toBe("9 to 12 Months");

    const proposed = proposeFillFromDec({ family: "homeowners", rows: mapped.fields });
    expect(proposed.occupancy).toBe("Owner");
    expect(proposed.yearBuilt).toBe("2024");
    expect(proposed.construction).toBe("Masonry");
    expect(proposed.dwellingType).toBe("Single Family");
    expect(proposed.roofYear).toBe("2024");
    expect(proposed.monthsOccupied).toBe("9 to 12 Months");
    expect(proposed.typeOfResidence).toBe("Owner Occupied");
    expect(proposed.formType).toBeUndefined();

    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    expect(patch.risk.occupancy).toBe("Owner");
    expect(patch.risk.yearBuilt).toBe(2024);
    expect(patch.risk.construction).toBe("Masonry");
    expect(patch.risk.roofYear).toBe(2024);
    expect(patch.coverageLimits.dwelling_type).toBe("Single Family");
    expect(patch.coverageLimits.months_occupied).toBe("9 to 12 Months");
    expect(patch.coverageLimits.type_of_residence).toBe("Owner Occupied");
  });

  it("writes a two-digit Year of Construction and Construction onto HO3, DP, and MHO", () => {
    const mapped = mapGeminiJsonToFields(
      {
        Construction: { value: "Masonry", confidence: 0.96 },
        "Year of Construction": { value: "24", confidence: 0.96 },
      },
      "dec",
      "home",
    );
    const byKey = Object.fromEntries(mapped.fields.map((field) => [field.fieldKey, field.normalizedValue]));
    expect(byKey.construction).toBe("Masonry");
    expect(byKey.year_built).toBe("2024");

    for (const lineOfBusiness of ["HO3", "DP3", "MHO"]) {
      expect(fillFamilyForPolicy({ lineOfBusiness })).toBe("homeowners");
      const proposed = proposeFillFromDec({
        family: "homeowners",
        rows: rows({
          form: lineOfBusiness,
          construction: "Masonry",
          year_of_construction: "'24",
        }),
      });
      expect(proposed.yearBuilt).toBe("2024");
      expect(proposed.construction).toBe("Masonry");
      const patch = groupAppliedFill(proposed, Object.keys(proposed));
      expect(patch.risk.yearBuilt).toBe(2024);
      expect(patch.risk.construction).toBe("Masonry");
    }
  });

  it("fills occupancy from type of residence when the occupancy line is omitted", () => {
    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        form: "HO3",
        construction_type: "Masonry",
        year_of_construction: "2024",
        type_of_residence: "Owner Occupied",
        dwelling_type: "Single Family",
      }),
    });
    expect(proposed.occupancy).toBe("Owner");
    expect(proposed.typeOfResidence).toBe("Owner Occupied");
    expect(proposed.construction).toBe("Masonry");
    expect(proposed.yearBuilt).toBe("2024");
    expect(proposed.formType).toBe("HO3");
  });

  it("fills Southern Oak DP3 rating labels onto desk fields and leaves territory and exclude-wind unmapped", () => {
    const printed = {
      construction: "Masonry",
      occupied_by: "Tenant",
      bceg_grade: "Ungraded",
      protection_class: "02",
      number_of_families: "1",
      automatic_sprinklers: "None",
      roof_shape: "Gable",
      roof_material: "Shingles-Asphalt",
      roof_age: "5 years",
      year_built: "1980",
      usage_type: "Rental",
      territory: "034-13",
      exclude_wind_coverage: "No",
      fire_alarm: "None",
      opening_protection: "Class A",
      roof_year: "2021",
    };
    const mapped = mapGeminiJsonToFields(printed, "dec", "home");
    const unmapped = mapped.unmappedLabels.map((label) => label.sourceLabel).sort();
    expect(unmapped).toEqual(["exclude_wind_coverage", "territory"]);

    const byKey = Object.fromEntries(mapped.fields.map((field) => [field.fieldKey, field.normalizedValue]));
    expect(byKey.construction).toBe("Masonry");
    expect(byKey.occupancy).toBe("Tenant");
    expect(byKey.usage).toBe("Rental");
    expect(byKey.year_built).toBe("1980");
    expect(byKey.roof_year).toBe("2021");
    expect(byKey.number_of_families).toBe("1");
    expect(byKey.bceg_grade).toBe("Ungraded");
    expect(byKey.sprinkler).toBe("None");
    expect(byKey.fire_alarm).toBe("None");
    expect(byKey.opening_protection).toBe("A");
    expect(byKey.roof_shape).toBe("C");
    expect(byKey.roof_covering).toBe("Shingles-Asphalt");

    for (const product of ["landlord", "homeowners"] as const) {
      const applied = applyExtractedToSheet(
        "home",
        emptySheetValues("home", product),
        fillableGeminiFields(mapped.fields),
        { docType: "dec" },
      );
      expect(applied.values.occupancy?.value).toBe("Tenant");
      expect(applied.values.usage?.value).toBe("Rental");
      expect(applied.values.year_built?.value).toBe("1980");
      expect(applied.values.construction?.value).toBe("Masonry");
      expect(applied.values.number_of_families?.value).toBe("1");
      expect(applied.values.protection_class?.value).toBe("2");
      expect(applied.values.bceg_grade?.value).toBe("Ungraded");
      expect(applied.values.sprinkler?.value).toBe("no");
      expect(applied.values.fire_alarm?.value).toBe("no");
      expect(applied.values.roof_year?.value).toBe("2021");
      expect(applied.values.roof_covering?.value).toBe("Shingles-Asphalt");
      expect(applied.values.roof_shape?.value).toBe("other");
      expect(applied.values.opening_protection?.value).toBe("Hurricane Protection");
      expect(applied.filledKeys).not.toContain("territory");
      expect(applied.values.territory).toBeUndefined();
    }

    for (const lineOfBusiness of ["DP3", "DP1", "HO3"]) {
      const proposed = proposeFillFromDec({
        family: "homeowners",
        rows: rows({ ...printed, form: lineOfBusiness }),
      });
      expect(proposed.occupancy).toBe("Tenant");
      expect(proposed.usage).toBe("Rental");
      expect(proposed.yearBuilt).toBe("1980");
      expect(proposed.construction).toBe("Masonry");
      expect(proposed.families).toBe("1");
      expect(proposed.protectionClass).toBe("2");
      expect(proposed.bceg).toBe("Ungraded");
      expect(proposed.sprinkler).toBe("No");
      expect(proposed.fireAlarm).toBe("No");
      expect(proposed.roofYear).toBe("2021");
      expect(proposed.roofCovering).toBe("Shingles-Asphalt");
      expect(proposed.roofShape).toBe("other");
      expect(proposed.openingProtection).toBe("Hurricane Protection");
      expect(proposed.formType).toBe(lineOfBusiness);
      expect(proposed).not.toHaveProperty("territory");
      expect(proposed).not.toHaveProperty("excludeWind");

      const patch = groupAppliedFill(proposed, Object.keys(proposed));
      expect(patch.risk.occupancy).toBe("Tenant");
      expect(patch.risk.yearBuilt).toBe(1980);
      expect(patch.risk.construction).toBe("Masonry");
      expect(patch.risk.protectionClass).toBe("2");
      expect(patch.risk.roofYear).toBe(2021);
      expect(patch.risk.roofCovering).toBe("Shingles-Asphalt");
      expect(patch.risk.openingProtection).toBe("Hurricane Protection");
      expect(patch.protection.bceg_grade).toBe("Ungraded");
      expect(patch.protection.sprinkler).toBe("No");
      expect(patch.protection.fire_alarm).toBe("No");
      expect(patch.protection.roof_shape).toBe("other");
      expect(patch.protection.opening_protection).toBe("Hurricane Protection");
      expect(patch.coverageLimits.usage).toBe("Rental");
      expect(patch.coverageLimits.number_of_families).toBe("1");
    }
  });

  it("maps Tower Hill DP-3 coverages and writes property protection when rating is on the dec", () => {
    const mapped = mapGeminiJsonToFields(
      {
        "Coverage L - Liability": { value: "100000", confidence: 0.97 },
        "Coverage M - Medical Payments to Others": { value: "1000", confidence: 0.97 },
        "Limited Fungi, Wet or Dry Rot, or Bacteria Coverage Liability": { value: "50000", confidence: 0.97 },
        "Limited Fungi, Wet or Dry Rot, or Bacteria Coverage Property": { value: "10000/10000", confidence: 0.97 },
        "Rental to Others (Short Term Exclusions) - Property": { value: "Included", confidence: 0.97 },
        "Replacement Cost Buy Back": { value: "Included", confidence: 0.97 },
        "Sinkhole Exclusion": { value: "Included", confidence: 0.97 },
        "Water Damage Exclusion": { value: "Included", confidence: 0.97 },
      },
      "dec",
      "home",
    );
    const byKey = Object.fromEntries(mapped.fields.map((field) => [field.fieldKey, field.normalizedValue]));
    expect(byKey.coverage_l).toBe("$100,000");
    expect(byKey.coverage_m).toBe("$1,000");
    expect(byKey.limited_fungi_liability).toBe("$50,000");
    expect(byKey.limited_fungi).toBe("$10,000/$10,000");
    expect(byKey.rental_to_others_short_term).toBe("Included");
    expect(byKey.replacement_cost_buy_back).toBe("Included");
    expect(byKey.sinkhole_exclusion).toBe("Included");
    expect(byKey.water_damage_exclusion).toBe("Included");
    expect(byKey.coverage_e).toBeUndefined();
    expect(sheetKeysForGeminiKey("landlord_liability")).toEqual(["landlord_liability", "coverage_l"]);

    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        ...INES_CAMPS_TOWER_HILL_DP3_EXTRACT,
        age_of_dwelling_surcharge: "289.00",
        empat_fee: "2.00",
        figa_emergency_assessment_fee_2023: "20.36",
        mga_fee: "25.00",
        surplus_contribution: "203.60",
        advance_quote_discount: "-115.00",
        age_of_roof_credit: "-163.00",
        decreased_coverage_b_limit: "Included",
        deductible_options: "-773.00",
      }),
    });
    expect(proposed.formType).toBe("DP3");
    expect(proposed.policyType).toBeUndefined();
    expect(proposed.coverageA).toBe("292037");
    expect(proposed.coverageALimit).toBe("$292,037");
    expect(proposed.coverageAPremium).toBe("$2,738");
    expect(proposed.premium).toBe("2286.96");
    expect(proposed.coverageB).toBe("$0");
    expect(proposed.coverageBPremium).toBe("Included");
    expect(proposed.coverageC).toBe("$0");
    expect(proposed.coverageCPremium).toBe("$0");
    expect(proposed.coverageD).toBe("$29,204");
    expect(proposed.coverageE).toBe("$0");
    expect(proposed.coverageEPremium).toBe("Included");
    expect(proposed.coverageF).toBeUndefined();
    expect(proposed.coverageL).toBe("$100,000");
    expect(proposed.coverageLPremium).toBe("$60");
    expect(proposed.coverageM).toBe("$1,000");
    expect(proposed.coverageMPremium).toBe("Included");
    expect(proposed.limitedFungi).toBe("$10,000/$10,000");
    expect(proposed.limitedFungiPremium).toBe("Included");
    expect(proposed.limitedFungiLiability).toBe("$50,000");
    expect(proposed.limitedFungiLiabilityPremium).toBe("Included");
    expect(proposed.rentalToOthersShortTermPremium).toBe("Included");
    expect(proposed.replacementCostBuyBackPremium).toBe("Included");
    expect(proposed.sinkholeDeductible).toBe("Not Included");
    expect(proposed.waterDamage).toBe("Not Covered");
    expect(JSON.stringify(proposed)).not.toMatch(/289|EMPAT|FIGA|surplus|773/i);

    const copiedTotal = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        coverage_a_premium: "2286.96",
        coverage_a_fire_premium: "402",
        coverage_a_extended_premium: "487",
        coverage_a_hurricane_premium: "1849",
        premium: "2286.96",
      }),
    });
    expect(copiedTotal.coverageAPremium).toBe("$2,738");
    expect(copiedTotal.premium).toBe("2286.96");

    const coveragesOnly = groupAppliedFill(proposed, Object.keys(proposed));
    expect(coveragesOnly.coverageLimits.coverage_a_premium).toBe("$2,738");
    expect(coveragesOnly.coverageLimits.coverage_l).toBe("$100,000");
    expect(coveragesOnly.coverageLimits.coverage_l_premium).toBe("$60");
    expect(coveragesOnly.coverageLimits.coverage_m).toBe("$1,000");
    expect(coveragesOnly.coverageLimits.limited_fungi).toBe("$10,000/$10,000");
    expect(coveragesOnly.coverageLimits.limited_fungi_liability).toBe("$50,000");
    expect(coveragesOnly.coverageLimits.rental_to_others_short_term_premium).toBe("Included");
    expect(coveragesOnly.coverageLimits.replacement_cost_buy_back_premium).toBe("Included");
    expect(coveragesOnly.coverageLimits.sinkhole_deductible).toBe("Not Included");
    expect(coveragesOnly.coverageLimits.water_damage).toBe("Not Covered");
    expect(coveragesOnly.policy.formType).toBe("DP3");
    expect(propertyProtectionWithDwelling(null, {
      protection: coveragesOnly.protection,
      yearBuilt: coveragesOnly.risk.yearBuilt,
      construction: coveragesOnly.risk.construction,
      occupancy: coveragesOnly.risk.occupancy,
    })).toBeNull();

    const withRating = proposeFillFromDec({
      family: "homeowners",
      rows: rows({ ...INES_CAMPS_TOWER_HILL_DP3_EXTRACT, ...INES_CAMPS_TOWER_HILL_DP3_RATING }),
    });
    const rated = groupAppliedFill(withRating, Object.keys(withRating));
    expect(rated.risk.yearBuilt).toBe(1978);
    expect(rated.risk.construction).toBe("Masonry");
    expect(rated.risk.occupancy).toBe("Tenant");
    expect(rated.risk.protectionClass).toBe("4");
    expect(rated.coverageLimits.usage).toBe("Rental");
    expect(rated.coverageLimits.number_of_families).toBe("1");
    expect(rated.protection.bceg_grade).toBe("Ungraded");
    expect(rated.protection.sprinkler).toBe("No");
    expect(rated.protection.fire_alarm).toBe("No");
    expect(rated.protection.roof_year).toBe("2016");
    expect(rated.protection.roof_covering).toBe("Shingle");
    expect(rated.protection.roof_shape).toBe("other");
    expect(rated.protection.opening_protection).toBe("Unknown or None");
    const snapshot = propertyProtectionWithDwelling(null, {
      protection: rated.protection,
      yearBuilt: rated.risk.yearBuilt,
      construction: rated.risk.construction,
      occupancy: rated.risk.occupancy,
      source: "gemini",
    });
    expect(snapshot?.dwelling).toMatchObject({
      year_built: "1978",
      construction: "Masonry",
      occupancy: "Tenant",
    });
    expect(snapshot?.values.protection_class).toBe("4");
    expect(snapshot?.values.roof_year).toBe("2016");

    const sections = buildLobOverviewSections({
      policyId: "ines",
      lineOfBusiness: "DP3",
      formType: "DP3",
      coverageA: 292037,
      yearBuilt: rated.risk.yearBuilt,
      construction: rated.risk.construction,
      occupancy: rated.risk.occupancy,
      usage: rated.coverageLimits.usage,
      families: rated.coverageLimits.number_of_families,
      protectionClass: rated.protection.protection_class,
      bceg: rated.protection.bceg_grade,
      fireAlarm: rated.protection.fire_alarm,
      sprinkler: rated.protection.sprinkler,
      roofYear: rated.risk.roofYear,
      roofCovering: rated.protection.roof_covering,
      roofShape: rated.protection.roof_shape,
      openingProtection: rated.protection.opening_protection,
    });
    const dwelling = sections.find((section) => section.id === "dwelling")?.fields ?? [];
    expect(dwelling.find((field) => field.key === "occupancy")?.value).toBe("Tenant");
    expect(dwelling.find((field) => field.key === "usage")?.value).toBe("Rental");
    expect(dwelling.find((field) => field.key === "yearBuilt")?.value).toBe("1978");
    expect(dwelling.find((field) => field.key === "construction")?.value).toBe("Masonry");
    expect(dwelling.find((field) => field.key === "protectionClass")?.value).toBe("4");
    expect(dwelling.find((field) => field.key === "roofShape")?.value).toBe("other");
    expect(dwelling.find((field) => field.key === "openingProtection")?.value).toBe("Unknown or None");

    const html = renderToString(
      createElement(PolicyCoverageTab, {
        policy: {
          id: "ines",
          coverageA: 292037,
          coverageLimits: coveragesOnly.coverageLimits,
          faceAmount: null,
          lineOfBusiness: "DP",
          formType: "DP3",
          policyType: "DP3",
        },
        terms: [],
        currentTerm: null,
      }),
    );
    const at = (label: string) => html.indexOf(label);
    expect(at("Coverage A")).toBeGreaterThan(-1);
    expect(at("Coverage E")).toBeLessThan(at("Coverage L - Liability"));
    expect(at("Coverage L - Liability")).toBeLessThan(at("Coverage M - Medical Payments"));
    expect(at("Coverage M - Medical Payments")).toBeLessThan(
      at("Limited Fungi, Wet or Dry Rot, or Bacteria - Liability"),
    );
    expect(at("Limited Fungi, Wet or Dry Rot, or Bacteria - Liability")).toBeLessThan(
      at("Rental to Others (Short Term Exclusions) - Property"),
    );
    expect(at("Replacement Cost Buy Back")).toBeLessThan(at("Catastrophic Ground Cover Collapse"));
    expect(at("$10,000/$10,000")).toBeGreaterThan(at("Limited Fungi, Wet or Dry Rot, or Bacteria - Liability"));
    expect(at("Water Damage")).toBeLessThan(at("Sinkhole"));
    expect(html).toContain("$2,738");
    expect(html).toContain("$100,000");
    expect(html).toContain("$60");
    expect(html).toContain("$50,000");
    expect(html).toContain("$10,000/$10,000");
    expect(html).toContain("Not Covered");
    expect(html).toContain("Not Included");
    expect(html).not.toContain("2,286.96");
    expect(html).not.toContain("EMPAT");
    expect(html).not.toContain("FIGA");
    expect(html).not.toContain("Advance Quote");
    expect(GEMINI_EXTRACT_JSON_KEYS).toEqual(
      expect.arrayContaining([
        "coverage_l",
        "coverage_m",
        "limited_fungi_liability",
        "rental_to_others_short_term",
        "replacement_cost_buy_back",
        "water_damage_exclusion",
        "sinkhole_exclusion",
      ]),
    );
    const prompt = buildGeminiUserPrompt("dec", "home");
    expect(prompt).toMatch(/Coverage L Liability/);
    expect(prompt).toMatch(/Coverage M Medical Payments/);
    expect(prompt).toMatch(/never the Total Policy Premium/);
    expect(prompt).toMatch(/read every page/i);
    expect(prompt).toMatch(/Age of Dwelling Surcharge/);
  });

  it("prefers a printed Roof Year over Roof Age and still turns an age into a year", () => {
    const both = mapGeminiJsonToFields(
      { roof_age: { value: "10 years", confidence: 0.95 }, roof_year: { value: "2021", confidence: 0.95 } },
      "dec",
      "home",
    );
    expect(both.fields.find((field) => field.fieldKey === "roof_year")?.normalizedValue).toBe("2021");
    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({ roof_age: "10 years", roof_year: "2021" }),
    });
    expect(proposed.roofYear).toBe("2021");
    const ageOnly = proposeFillFromDec({
      family: "homeowners",
      rows: rows({ roof_age: "5 years" }),
    });
    expect(ageOnly.roofYear).toBe(String(new Date().getUTCFullYear() - 5));
  });

  it("does not invent occupancy from Usage Type when Occupied by is absent", () => {
    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        form: "DP3",
        usage_type: "Rental",
        construction: "Masonry",
      }),
    });
    expect(proposed.usage).toBe("Rental");
    expect(proposed.occupancy).toBeUndefined();
    expect(proposed.construction).toBe("Masonry");
  });

  it("keeps an explicit occupancy ahead of type of residence", () => {
    const tenant = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        occupancy: "Tenant",
        type_of_residence: "Owner Occupied",
        construction_type: "Masonry",
      }),
    });
    expect(tenant.occupancy).toBe("Tenant");
    expect(tenant.construction).toBe("Masonry");

    const occupied = proposeFillFromDec({
      family: "homeowners",
      rows: rows({ occupancy: "Owner Occupied" }),
    });
    expect(occupied.occupancy).toBe("Owner");

    const blank = proposeFillFromDec({
      family: "homeowners",
      rows: rows({ occupancy: "None", type_of_residence: "Owner Occupied" }),
    });
    expect(blank.occupancy).toBe("None");
    expect(blank.typeOfResidence).toBe("Owner Occupied");
  });

  it("keeps a stick-built HO5 when only a carrier name is present", () => {
    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        form: "HO5",
        current_carrier: "American Traditions",
        coverage_a: "200000",
      }),
    });
    expect(proposed.formType).toBe("HO5");
    expect(proposed.policyType).toBeUndefined();
  });

  it("maps an auto dec onto vehicles, drivers, and coverage", () => {
    const proposed = proposeFillFromDec({
      family: "auto",
      rows: rows({
        vin: "4T1BF1FK5FU485898",
        vehicle_year: "2015",
        vehicle_make: "Toyota",
        vehicle_model: "Camry",
        liability_bi: "10000/20000",
        liability_pd: "10000",
        um_uim: "Insured Rejects",
        pip: "$1,000 Ded/Insd&Rel",
        comp_deductible: "$500 Ded",
        collision_deductible: "500",
        ers: "ERS FULL",
        rental: "$50 Per Day",
        driver_1_name: "Andres Felipe Laguna Gaviria",
        driver_1_license: "D123-456-78-9012",
        driver_2_name: "Claudia Patricia Gaviria",
        premium: "2074",
        effective_date: "09/21/2026",
        expiration_date: "03/21/2027",
        term_length: "6 month",
      }),
    });
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.vin"]).toBe("4T1BF1FK5FU485898");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.year"]).toBe("2015");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.make"]).toBe("Toyota");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.model"]).toBe("Camry");
    expect(proposed.liabilityBi).toBe("$10,000/$20,000");
    expect(proposed.liabilityPd).toBe("$10,000");
    expect(proposed.umUim).toBe("Insured Rejects");
    expect(proposed.comprehensiveDeductible).toBe("$500");
    expect(proposed.collisionDeductible).toBe("$500");
    expect(proposed.compLimit).toBe("✓");
    expect(proposed.collisionLimit).toBe("✓");
    expect(proposed.towing).toBe("ERS FULL");
    expect(proposed["driver:andres felipe laguna gaviria.name"]).toMatch(/Andres Felipe/);
    expect(proposed["driver:claudia patricia gaviria.name"]).toMatch(/Claudia/);
    expect(proposed.coverageA).toBeUndefined();
    expect(proposed.effectiveDate).toBe("2026-09-21");
    expect(proposed.expirationDate).toBe("2027-03-21");
    expect(proposed.termMonths).toBe("6");
    expect(proposed.pipDeductible).toBe("$1,000");
  });

  it("maps PAP deductibles, line premiums, vehicle use, and per-car facts", () => {
    const proposed = proposeFillFromDec({
      family: "auto",
      rows: rows({
        vin: "4T1BF1FK5FU485898",
        vehicle_year: "2015",
        vehicle_make: "Toyota",
        vehicle_model: "Camry",
        vehicle_usage: "Pleasure",
        annual_miles: "12000",
        vehicle_lienholder_other: "Toyota Financial",
        vehicle_1_premium: "900.00",
        vehicle_2_vin: "2HKRM4H75GH123456",
        vehicle_2_year: "2016",
        vehicle_2_make: "Honda",
        vehicle_2_model: "CR-V",
        vehicle_2_usage: "Commute",
        fill_gap_vehicle_2_comp_deductible: "1000",
        fill_gap_vehicle_2_premium: "700",
        liability_bi: "100/300",
        liability_bi_premium: "412",
        liability_pd: "100000",
        liability_pd_premium: "188",
        pip: "10000",
        pip_deductible: "1000",
        pip_premium: "220",
        um_uim: "100/300 Non-stacked",
        med_pay: "5000",
        fill_gap_rental: "30/day",
        comp_deductible: "500",
        comp_premium: "140",
        collision_deductible: "500",
        collision_premium: "310",
        discounts: "Multi-car; Paperless",
        driver_1_name: "Veronica Boyle",
        driver_1_license_state: "FL",
      }),
    });
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.usage"]).toBe("Pleasure");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.annualMiles"]).toBe("12000");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.lienholder"]).toBe("Toyota Financial");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.premium"]).toBe("$900");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.comprehensiveDeductible"]).toBe("$500");
    expect(proposed["vehicle:vin:2HKRM4H75GH123456.usage"]).toBe("Commute");
    expect(proposed["vehicle:vin:2HKRM4H75GH123456.comprehensiveDeductible"]).toBe("$1,000");
    expect(proposed["vehicle:vin:2HKRM4H75GH123456.premium"]).toBe("$700");
    expect(proposed.liabilityBiPremium).toBe("$412");
    expect(proposed.liabilityPdPremium).toBe("$188");
    expect(proposed.pipDeductible).toBe("$1,000");
    expect(proposed.pipPremium).toBe("$220");
    expect(proposed.umStacked).toBe("Non-stacked");
    expect(proposed.medPay).toBe("$5,000");
    expect(proposed.rental).toBe("30/day");
    expect(proposed.compPremium).toBe("$140");
    expect(proposed.collisionPremium).toBe("$310");
    expect(proposed.discounts).toBe("Multi-car; Paperless");
    expect(proposed["driver:veronica boyle.licenseState"]).toBe("FL");
    // Absent coverages are explicit None, and every coverage column is filled.
    expect(proposed.liabilityBiDeductible).toBe("None");
    expect(proposed.umPd).toBe("None");
    expect(proposed.umPdPremium).toBe("None");
    expect(proposed.medPayPremium).toBe("None");
    expect(proposed.towing).toBe("None");
    expect(proposed.towingDeductible).toBe("None");
    expect(proposed.towingPremium).toBe("None");
    expect(proposed.glass).toBe("None");
    expect(proposed.glassLimit).toBe("None");
    expect(proposed.glassPremium).toBe("None");
    expect(proposed.compLimit).toBe("✓");
    expect(proposed.collisionLimit).toBe("✓");
    expect(proposed.rentalDeductible).toBe("None");
    expect(proposed.rentalPremium).toBe("None");
    // Per-vehicle overview fields are filled, with None when the dec omits them.
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.garagingZip"]).toBe("None");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.garagingAddress"]).toBe("None");
    expect(proposed["vehicle:vin:2HKRM4H75GH123456.annualMiles"]).toBe("None");
    expect(proposed["vehicle:vin:2HKRM4H75GH123456.lienholder"]).toBe("None");
    expect(proposed["vehicle:vin:2HKRM4H75GH123456.collisionDeductible"]).toBe("None");
    expect(proposed["vehicle:vin:2HKRM4H75GH123456.garagingAddress"]).toBe("None");
    const coverageColumns = [
      "liabilityBi",
      "liabilityBiDeductible",
      "liabilityBiPremium",
      "liabilityPd",
      "liabilityPdDeductible",
      "liabilityPdPremium",
      "pip",
      "pipDeductible",
      "pipPremium",
      "medPay",
      "medPayDeductible",
      "medPayPremium",
      "umUim",
      "umUimDeductible",
      "umUimPremium",
      "umPd",
      "umPdDeductible",
      "umPdPremium",
      "compLimit",
      "comprehensiveDeductible",
      "compPremium",
      "collisionLimit",
      "collisionDeductible",
      "collisionPremium",
      "rental",
      "rentalDeductible",
      "rentalPremium",
      "towing",
      "towingDeductible",
      "towingPremium",
      "glassLimit",
      "glass",
      "glassPremium",
      "umStacked",
      "discounts",
    ];
    const blanks = coverageColumns.filter((key) => !proposed[key]?.trim());
    expect(blanks).toEqual([]);

    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    expect(patch.coverageLimits.liability_bi_premium).toBe("$412");
    expect(patch.coverageLimits.pip_deductible).toBe("$1,000");
    expect(patch.coverageLimits.comp_limit).toBe("✓");
    expect(patch.coverageLimits.collision_limit).toBe("✓");
    expect(patch.coverageLimits.comp_premium).toBe("$140");
    expect(patch.coverageLimits.discounts).toBe("Multi-car; Paperless");
    expect(patch.coverageLimits.um_stacked).toBe("Non-stacked");
    expect(patch.term.comprehensiveDeductible).toBe("$500");
    expect(patch.term.collisionDeductible).toBe("$500");
    const camry = patch.vehicles.find((row) => row.vin === "4T1BF1FK5FU485898");
    expect(camry?.usage).toBe("Pleasure");
    expect(camry?.annualMiles).toBe("12000");
    expect(camry?.lienholder).toBe("Toyota Financial");
    expect(camry?.write).toEqual(expect.arrayContaining(["usage", "annualMiles", "lienholder", "premium"]));
    expect(patch.drivers[0]?.licenseState).toBe("FL");
  });

  it("writes every PAP coverage cell that the dec printed and leaves the rest empty", () => {
    const proposed = proposeFillFromDec({
      family: "auto",
      rows: rows({
        liability_bi: "100/300",
        liability_bi_premium: "412",
        liability_pd: "100000",
        liability_pd_premium: "188",
        pip: "10000",
        pip_deductible: "1000",
        pip_premium: "220",
        med_pay: "5000",
        med_pay_premium: "18",
        um_uim: "100/300",
        um_uim_premium: "64",
        um_pd: "100000",
        um_pd_premium: "22",
        um_stacked: "No",
        comp_deductible: "500",
        comp_premium: "90",
        collision_deductible: "500",
        collision_premium: "310",
        rental: "30/900",
        rental_premium: "12",
        towing: "100",
        towing_premium: "6",
        glass: "50",
        glass_premium: "4",
        discounts: "Multi-car",
      }),
    });
    expect(proposed.umStacked).toBe("Non-stacked");
    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    const schedule = autoCoverageSchedule({
      coverageLimits: patch.coverageLimits,
      comprehensiveDeductible: patch.term.comprehensiveDeductible,
      collisionDeductible: patch.term.collisionDeductible,
    });
    const vehicleRows = autoVehicleCoverageBlocks({
      coverageLimits: patch.coverageLimits,
      comprehensiveDeductible: patch.term.comprehensiveDeductible,
      collisionDeductible: patch.term.collisionDeductible,
    }).flatMap((block) => block.rows);
    const byKey = Object.fromEntries([...schedule, ...vehicleRows].map((row) => [row.key, row]));
    expect(byKey.liability_bi).toMatchObject({ limit: "$100/$300", premium: "$412" });
    expect(byKey.liability_pd).toMatchObject({ limit: "$100,000", premium: "$188" });
    expect(byKey.pip).toMatchObject({ limit: "$10,000", deductible: "$1,000", premium: "$220" });
    expect(byKey.med_pay).toMatchObject({ limit: "$5,000", premium: "$18" });
    expect(byKey.um_uim).toMatchObject({ limit: "$100/$300", premium: "$64" });
    expect(byKey.um_pd).toMatchObject({ limit: "$100,000", premium: "$22" });
    expect(byKey["1:comprehensive"]).toMatchObject({ limit: "✓", deductible: "$500", premium: "$90" });
    expect(byKey["1:collision"]).toMatchObject({ limit: "✓", deductible: "$500", premium: "$310" });
    expect(byKey["1:rental"]).toMatchObject({ limit: "$30/$900", premium: "$12" });
    expect(byKey["1:towing"]).toMatchObject({ limit: "$100", premium: "$6" });
    expect(byKey["1:glass"]?.deductible).toMatch(/50/);
    expect(byKey["1:glass"]?.premium).toMatch(/4/);
    expect(autoCoverageExtras({ coverageLimits: patch.coverageLimits })).toEqual([
      { key: "um_stacked", label: "UM stacked", value: "Non-stacked" },
      { key: "discounts", label: "Discounts", value: "Multi-car" },
    ]);

    const stackedPhrase = proposeFillFromDec({
      family: "auto",
      rows: rows({ um_stacked: "Stacked: No", um_uim: "100/300" }),
    });
    expect(stackedPhrase.umStacked).toBe("Non-stacked");
    const embedded = proposeFillFromDec({
      family: "auto",
      rows: rows({ um_uim: "100/300 Non-stacked" }),
    });
    expect(embedded.umStacked).toBe("Non-stacked");
    const limitOnly = proposeFillFromDec({
      family: "auto",
      rows: rows({ liability_bi: "100/300", um_uim: "100/300" }),
    });
    expect(limitOnly.liabilityBiPremium).toBe("None");
    expect(limitOnly.umPd).toBe("None");
    expect(limitOnly.umStacked).toBe("None");
    expect(limitOnly.glass).toBe("None");
    expect(limitOnly.discounts).toBe("None");
    expect(limitOnly.pipDeductible).toBe("None");
    expect(limitOnly.compLimit).toBe("None");
    expect(limitOnly.collisionLimit).toBe("None");
    const printedAcv = proposeFillFromDec({
      family: "auto",
      rows: rows({ comp_limit: "ACV", comp_deductible: "1000", collision_deductible: "500", collision_limit: "None" }),
    });
    expect(printedAcv.comprehensiveDeductible).toBe("$1,000");
    expect(printedAcv.compLimit).toBe("ACV");
    expect(printedAcv.collisionDeductible).toBe("$500");
    expect(printedAcv.collisionLimit).toBe("✓");
    const laguna = proposeFillFromDec({
      family: "auto",
      rows: rows({ comp_limit: "None", comp_deductible: "1000", collision_limit: "None", collision_deductible: "1000" }),
    });
    expect(laguna.comprehensiveDeductible).toBe("$1,000");
    expect(laguna.collisionDeductible).toBe("$1,000");
    expect(laguna.compLimit).toBe("✓");
    expect(laguna.collisionLimit).toBe("✓");
    const vehicleOnly = proposeFillFromDec({
      family: "auto",
      rows: rows({
        comp_limit: "None",
        comp_deductible: "None",
        vehicle_1_comp_deductible: "1000",
        collision_limit: "None",
        vehicle_1_collision_deductible: "500",
      }),
    });
    expect(vehicleOnly.comprehensiveDeductible).toBe("$1,000");
    expect(vehicleOnly.collisionDeductible).toBe("$500");
    expect(vehicleOnly.compLimit).toBe("✓");
    expect(vehicleOnly.collisionLimit).toBe("✓");
  });
});

describe("fill overwrite count", () => {
  const proposed = proposeFillFromDec({ family: "homeowners", rows: gloria });

  it("counts non-blank fields the DEC would replace", () => {
    const existing = snapshotFillTargets({
      policy: { coverageA: 100000, formType: "HO3" },
      risk: { construction: "Frame", yearBuilt: 2017 },
    });
    const classified = classifyFillFields(existing, proposed);
    expect(classified.overwritten.sort()).toEqual(["construction", "coverageA"]);
    expect(classified.skipped).toEqual(expect.arrayContaining(["formType", "yearBuilt"]));
    expect(classified.filled).toEqual(expect.arrayContaining(["coverageB", "mortgageeName", "county"]));
    expect(countFillOverwrites(classified)).toBe(2);
    expect(fillOverwriteWarning(countFillOverwrites(classified))).toBe("replaces 2 fields");
    expect(fillOverwriteWarning(1)).toBe("replaces 1 field");
  });

  it("replaces bare manufactured-home limits and deductibles with dollar amounts", () => {
    const proposedMh = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        form: "HO3",
        unit_make: "General MFG",
        coverage_a: "130000",
        coverage_c: "65000",
        aop_deductible: "1000",
        hurricane_deductible: "2%",
        wind_hail_deductible: "1000",
      }),
    });
    const existing = snapshotFillTargets({
      policy: {
        coverageA: 130000,
        formType: "HO3",
        policyType: "Home",
        policySubType: "HO3",
        coverageLimits: { coverage_a: "130000", coverage_c: "65000" },
      },
      term: { aopDeductible: "1000", hurricaneDeductible: "2%" },
    });
    const classified = classifyFillFields(existing, proposedMh);
    expect(classified.overwritten).toEqual(
      expect.arrayContaining([
        "formType",
        "policyType",
        "policySubType",
        "coverageALimit",
        "coverageC",
        "aopDeductible",
      ]),
    );
    expect(classified.skipped).toEqual(expect.arrayContaining(["coverageA", "hurricaneDeductible"]));
    expect(classified.filled).toContain("windHailDeductible");
    const patch = groupAppliedFill(proposedMh, [
      "formType",
      "policyType",
      "policySubType",
      "coverageALimit",
      "coverageC",
      "aopDeductible",
      "hurricaneDeductible",
      "windHailDeductible",
    ]);
    expect(patch.policy).toMatchObject({ formType: "MHO", policyType: "MHO", policySubType: "MHO" });
    expect(patch.coverageLimits.coverage_a).toBe("$130,000");
    expect(patch.coverageLimits.coverage_c).toBe("$65,000");
    expect(patch.coverageLimits.wind_hail_deductible).toBe("$1,000");
    expect(patch.term.aopDeductible).toBe("$1,000");
    expect(patch.term.hurricaneDeductible).toBe("2%");
  });

  it("counts a non-blank policy term the DEC would replace", () => {
    const existing = snapshotFillTargets({
      policy: {
        effectiveDate: new Date("2025-06-28T12:00:00.000Z"),
        expirationDate: new Date("2026-06-28T12:00:00.000Z"),
        termMonths: 6,
        formType: "HO3",
      },
    });
    const classified = classifyFillFields(existing, proposed);
    expect(classified.overwritten).toEqual(
      expect.arrayContaining(["effectiveDate", "expirationDate", "termMonths"]),
    );
    expect(classified.skipped).toContain("formType");
    const same = snapshotFillTargets({
      policy: {
        effectiveDate: "2026-06-28",
        expirationDate: "2027-06-28T12:00:00.000Z",
        termMonths: 12,
      },
    });
    const unchanged = classifyFillFields(same, proposed);
    expect(unchanged.skipped).toEqual(
      expect.arrayContaining(["effectiveDate", "expirationDate", "termMonths"]),
    );
    expect(unchanged.overwritten).not.toContain("effectiveDate");
    expect(unchanged.overwritten).not.toContain("expirationDate");
    expect(unchanged.overwritten).not.toContain("termMonths");
  });

  it("does not count an identical value as an overwrite", () => {
    const existing = snapshotFillTargets({
      policy: { coverageA: 433613 },
      risk: { construction: "Masonry" },
    });
    const classified = classifyFillFields(existing, proposed);
    expect(classified.overwritten).not.toContain("coverageA");
    expect(classified.overwritten).not.toContain("construction");
    expect(classified.skipped).toEqual(expect.arrayContaining(["coverageA", "construction"]));
  });

  it("treats a matching license last4 as unchanged", () => {
    const auto = proposeFillFromDec({
      family: "auto",
      rows: rows({
        vin: "4T1BF1FK5FU485898",
        vehicle_year: "2015",
        vehicle_make: "Toyota",
        vehicle_model: "Camry",
        driver_1_name: "Andres Felipe Laguna Gaviria",
        driver_1_license: "D123-456-78-9012",
      }),
    });
    const existing = snapshotFillTargets({
      vehicles: [{ vin: "4T1BF1FK5FU485898", year: 2014, make: "Toyota", model: "Camry" }],
      drivers: [
        {
          firstName: "Andres",
          lastName: "Felipe Laguna Gaviria",
          licenseLast4: "9012",
        },
      ],
    });
    const classified = classifyFillFields(existing, auto);
    expect(classified.overwritten).toContain("vehicle:vin:4T1BF1FK5FU485898.year");
    expect(classified.skipped).toContain("driver:andres felipe laguna gaviria.license");
    expect(countFillOverwrites(classified)).toBe(1);
  });
});

describe("in-force Fill-from-DEC term dates", () => {
  const now = new Date("2026-09-26T15:00:00.000Z");

  function oldFloodDec() {
    return proposeFillFromDec({
      family: "flood",
      rows: rows({
        effective_date: "09/17/2025",
        expiration_date: "09/17/2026",
        term_months: "12",
        building_limit: "250000",
        building_deductible: "2000",
        flood_zone: "AE",
      }),
    });
  }

  it("does not regress an in-force expiration onto a prior DEC that already ended", () => {
    const proposed = oldFloodDec();
    const existing = snapshotFillTargets({
      policy: {
        effectiveDate: "2026-09-17",
        expirationDate: "2027-09-17",
        termMonths: 12,
        coverageLimits: { flood_building: "$200,000", flood_zone: "X" },
      },
    });
    const guard = guardInForceFillTermDates({ status: "active", proposed, existing, now });
    expect(guard.hold).toEqual(expect.arrayContaining(["effectiveDate", "expirationDate"]));
    expect(guard.hold).not.toContain("floodBuilding");
    expect(guard.note).toMatch(/Skipped term dates/);
    expect(guard.note).toMatch(/2026-09-17 is before today 2026-09-26 \(America\/New_York\)/);
    expect(guard.note).toMatch(/in-force/);

    const classified = applyInForceFillTermDateGuard(classifyFillFields(existing, proposed), guard.hold);
    expect(classified.overwritten).not.toContain("effectiveDate");
    expect(classified.overwritten).not.toContain("expirationDate");
    expect(classified.filled).not.toContain("effectiveDate");
    expect(classified.skipped).toEqual(expect.arrayContaining(["effectiveDate", "expirationDate"]));
    expect(classified.overwritten).toEqual(expect.arrayContaining(["floodBuilding", "floodZone"]));

    const patch = groupAppliedFill(proposed, [...classified.filled, ...classified.overwritten]);
    expect(patch.policy.effectiveDate).toBeUndefined();
    expect(patch.policy.expirationDate).toBeUndefined();
    expect(patch.term.termEffective).toBeUndefined();
    expect(patch.term.termExpiration).toBeUndefined();
    expect(patch.coverageLimits.flood_building).toBe("$250,000");
    expect(patch.coverageLimits.flood_zone).toBe("AE");
  });

  it("keeps an AOR renewal when an older flood DEC would put expiration in the past", () => {
    const proposed = proposeFillFromDec({
      family: "flood",
      rows: rows({
        effective_date: "07/31/2025",
        expiration_date: "07/30/2026",
        building_limit: "250000",
      }),
    });
    const existing = snapshotFillTargets({
      policy: {
        effectiveDate: "2026-07-30",
        expirationDate: "2027-07-30",
        termMonths: 12,
        coverageLimits: { flood_building: "$100,000" },
      },
    });
    for (const status of ["active", "bound", "pending"] as const) {
      const guard = guardInForceFillTermDates({ status, proposed, existing, now });
      const classified = applyInForceFillTermDateGuard(classifyFillFields(existing, proposed), guard.hold);
      expect(classified.overwritten, status).not.toContain("expirationDate");
      expect(classified.overwritten, status).not.toContain("effectiveDate");
      expect(classified.overwritten, status).toContain("floodBuilding");
      const patch = groupAppliedFill(proposed, [...classified.filled, ...classified.overwritten]);
      expect(patch.policy.expirationDate, status).toBeUndefined();
      expect(patch.coverageLimits.flood_building, status).toBe("$250,000");
    }
  });

  it("does not demote an in-force policy onto a prior term that has not reached today yet", () => {
    const early = new Date("2026-06-01T16:00:00.000Z");
    const proposed = proposeFillFromDec({
      family: "flood",
      rows: rows({
        effective_date: "07/31/2025",
        expiration_date: "07/30/2026",
        contents_limit: "100000",
      }),
    });
    const existing = snapshotFillTargets({
      policy: {
        effectiveDate: "2026-07-30",
        expirationDate: "2027-07-30",
        coverageLimits: { flood_contents: "$50,000" },
      },
    });
    const guard = guardInForceFillTermDates({ status: "active", proposed, existing, now: early });
    expect(guard.note).toMatch(/ended on or before the in-force effective date 2026-07-30/);
    const classified = applyInForceFillTermDateGuard(classifyFillFields(existing, proposed), guard.hold);
    expect(classified.skipped).toEqual(expect.arrayContaining(["effectiveDate", "expirationDate"]));
    expect(classified.overwritten).toContain("floodContents");
    const patch = groupAppliedFill(proposed, [...classified.filled, ...classified.overwritten]);
    expect(patch.policy.expirationDate).toBeUndefined();
    expect(patch.coverageLimits.flood_contents).toBe("$100,000");
  });

  it("still writes a current-term DEC onto an in-force policy", () => {
    const proposed = proposeFillFromDec({
      family: "flood",
      rows: rows({
        effective_date: "09/17/2026",
        expiration_date: "09/17/2027",
        building_limit: "250000",
      }),
    });
    const existing = snapshotFillTargets({
      policy: {
        effectiveDate: "2025-09-17",
        expirationDate: "2026-09-17",
        coverageLimits: { flood_building: "$200,000" },
      },
    });
    const guard = guardInForceFillTermDates({ status: "active", proposed, existing, now });
    expect(guard).toEqual({ hold: [], note: null });
    const classified = applyInForceFillTermDateGuard(classifyFillFields(existing, proposed), guard.hold);
    expect(classified.overwritten).toEqual(expect.arrayContaining(["effectiveDate", "expirationDate"]));
    const patch = groupAppliedFill(proposed, [...classified.filled, ...classified.overwritten]);
    expect(patch.policy.expirationDate?.toISOString()).toBe("2027-09-17T12:00:00.000Z");
    expect(patch.term.termExpiration?.toISOString()).toBe("2027-09-17T12:00:00.000Z");
    expect(patch.coverageLimits.flood_building).toBe("$250,000");
  });

  it("still accepts historical term dates on ended policies", () => {
    const proposed = oldFloodDec();
    const existing = snapshotFillTargets({
      policy: {
        effectiveDate: "2024-09-17",
        expirationDate: "2025-09-17",
        termMonths: 12,
        coverageLimits: { flood_building: "$200,000" },
      },
    });
    for (const status of ["lapsed", "cancelled", "expired", "non_renewed"] as const) {
      const guard = guardInForceFillTermDates({ status, proposed, existing, now });
      expect(guard, status).toEqual({ hold: [], note: null });
      const classified = applyInForceFillTermDateGuard(classifyFillFields(existing, proposed), guard.hold);
      expect(classified.overwritten, status).toEqual(
        expect.arrayContaining(["effectiveDate", "expirationDate"]),
      );
      const patch = groupAppliedFill(proposed, [...classified.filled, ...classified.overwritten]);
      expect(patch.policy.effectiveDate?.toISOString(), status).toBe("2025-09-17T12:00:00.000Z");
      expect(patch.policy.expirationDate?.toISOString(), status).toBe("2026-09-17T12:00:00.000Z");
    }
  });

  it("refuses to fill a blank in-force expiration from a DEC that already ended", () => {
    const proposed = oldFloodDec();
    const existing = snapshotFillTargets({
      policy: { coverageLimits: { flood_zone: "X" } },
    });
    const guard = guardInForceFillTermDates({ status: "active", proposed, existing, now });
    expect(guard.hold).toEqual(expect.arrayContaining(["effectiveDate", "expirationDate"]));
    const classified = applyInForceFillTermDateGuard(classifyFillFields(existing, proposed), guard.hold);
    expect(classified.filled).not.toContain("expirationDate");
    expect(classified.skipped).toContain("expirationDate");
    expect(classified.overwritten).toContain("floodZone");
  });
});

describe("policy fill audit insert", () => {
  it("builds an immutable audit row with agent, reason, policy, dec, and field lists", () => {
    const row = buildPolicyFillAuditInsert({
      tenantId: "tenant",
      policyId: "policy",
      policyNumber: "1501-1703-2475",
      source: "manual",
      agentId: "agent-1",
      agentName: "Ada Agent",
      reason: "  mid-term DEC reissue  ",
      documentId: "doc-1",
      documentFilename: "gloria-dec.pdf",
      fieldsWritten: ["yearBuilt", "county"],
      fieldsOverwritten: ["construction"],
    });
    expect(row).toEqual({
      tenantId: "tenant",
      policyId: "policy",
      policyNumber: "1501-1703-2475",
      source: "manual",
      agentId: "agent-1",
      agentName: "Ada Agent",
      reason: "mid-term DEC reissue",
      documentId: "doc-1",
      documentFilename: "gloria-dec.pdf",
      fieldsWritten: ["yearBuilt", "county"],
      fieldsOverwritten: ["construction"],
    });
    expect(row).not.toHaveProperty("updatedAt");
  });

  it("records issue runs without a reason and names a missing agent System", () => {
    const row = buildPolicyFillAuditInsert({
      tenantId: "tenant",
      policyId: "policy",
      policyNumber: "ATM205086",
      source: "issue",
      agentId: null,
      agentName: " ",
      reason: "should not stick",
      documentId: "doc-2",
      documentFilename: "george.pdf",
      fieldsWritten: ["coverageA"],
      fieldsOverwritten: [],
    });
    expect(row.source).toBe("issue");
    expect(row.reason).toBeNull();
    expect(row.agentName).toBe("System");
    expect(row.fieldsWritten).toEqual(["coverageA"]);
  });

  it("records a term-date skip on the audit and keeps the agent reason", () => {
    const note =
      "Skipped term dates (effectiveDate, expirationDate): extracted expiration 2026-09-17 is before today 2026-09-26 (America/New_York) on an in-force policy.";
    const manual = buildPolicyFillAuditInsert({
      tenantId: "tenant",
      policyId: "policy",
      policyNumber: "1150129045",
      source: "manual",
      agentId: "agent-1",
      agentName: "Book Fill",
      reason: "Book Fill-from-DEC.",
      auditNote: note,
      documentId: "doc-1",
      documentFilename: "Flood  Insurance 2025-2026.pdf",
      fieldsWritten: ["floodZone"],
      fieldsOverwritten: ["floodBuilding"],
    });
    expect(manual.reason).toBe(`Book Fill-from-DEC. ${note}`);
    expect(manual.fieldsOverwritten).toEqual(["floodBuilding"]);
    expect(manual.fieldsOverwritten).not.toContain("expirationDate");
    expect(manual).not.toHaveProperty("auditNote");

    const issue = buildPolicyFillAuditInsert({
      tenantId: "tenant",
      policyId: "policy",
      policyNumber: "1150129045",
      source: "issue",
      agentId: null,
      agentName: "System",
      reason: "should not stick",
      auditNote: note,
      documentId: "doc-1",
      documentFilename: "Flood  Insurance 2025-2026.pdf",
      fieldsWritten: [],
      fieldsOverwritten: [],
    });
    expect(issue.reason).toBe(note);
  });

  it("requires a non-blank reason only on the manual path", () => {
    expect(manualFillReasonError("manual", "  ")).toBe("Reason is required.");
    expect(manualFillReasonError("manual", "lender corrected the DEC")).toBeNull();
    expect(manualFillReasonError("issue", "")).toBeNull();
  });

  it("groups allowed keys into coverage, mortgagee, and vehicle writes", () => {
    const proposed = proposeFillFromDec({ family: "homeowners", rows: gloria });
    const patch = groupAppliedFill(proposed, ["coverageB", "mortgageeName", "mortgageeLoanNumber", "burglarAlarm"]);
    expect(patch.coverageLimits.coverage_b).toBe("$43,368");
    expect(patch.mortgagee).toEqual({
      name: "WELLS FARGO BANK, NA",
      loanNumber: "0509210662",
    });
    expect(patch.protection.burglar_alarm).toBe("Yes");
    expect(patch.policy.coverageA).toBeUndefined();
    const dates = groupAppliedFill(proposed, ["effectiveDate", "expirationDate", "termMonths"]);
    expect(dates.policy.effectiveDate?.toISOString()).toBe("2026-06-28T12:00:00.000Z");
    expect(dates.policy.expirationDate?.toISOString()).toBe("2027-06-28T12:00:00.000Z");
    expect(dates.policy.termMonths).toBe(12);
    expect(dates.term.termEffective?.toISOString()).toBe("2026-06-28T12:00:00.000Z");
    expect(dates.term.termExpiration?.toISOString()).toBe("2027-06-28T12:00:00.000Z");
  });
});

describe("fillPolicyFromDec wiring", () => {
  it("inserts the audit table and does not write quote sheets", () => {
    const action = source("src/app/actions/policy-fill-from-dec.ts");
    expect(action).toMatch(/export async function fillPolicyFromDec/);
    expect(action).toMatch(/export async function peekFillPolicyFromDec/);
    expect(action).toMatch(/export async function previewFillPolicyFromDec/);
    expect(action).toMatch(/export async function fillPolicyFromDecOnIssue/);
    const peekStart = action.indexOf("export async function peekFillPolicyFromDec");
    const peekEnd = action.indexOf("export async function previewFillPolicyFromDec");
    const peekBody = action.slice(peekStart, peekEnd);
    expect(peekBody).toMatch(/loadFillDecDocument/);
    expect(peekBody).not.toMatch(/loadGeminiRows/);
    const snapAt = action.indexOf("const snapshotPromise = Promise.all");
    const geminiAt = action.indexOf("const gemini = await loadGeminiRows");
    const awaitSnap = action.indexOf("await snapshotPromise");
    expect(snapAt).toBeGreaterThan(-1);
    expect(snapAt).toBeLessThan(geminiAt);
    expect(geminiAt).toBeLessThan(awaitSnap);
    expect(action.indexOf("manualFillReasonError")).toBeLessThan(action.indexOf("prepareFill"));
    expect(action).toMatch(/insert\(policyFillAudit\)/);
    expect(action).toMatch(/policySet\.effectiveDate = patch\.policy\.effectiveDate/);
    expect(action).toMatch(/policySet\.expirationDate = patch\.policy\.expirationDate/);
    expect(action.indexOf("guardInForceFillTermDates")).toBeGreaterThan(-1);
    expect(action.indexOf("guardInForceFillTermDates")).toBeLessThan(action.indexOf("groupAppliedFill(proposed"));
    expect(action).toMatch(/auditNote: termDateNote/);
    expect(action).toMatch(/policySet\.termMonths = patch\.policy\.termMonths/);
    expect(action).toMatch(/source: input\.source/);
    expect(action).toMatch(/forceExtract: input\.source === "manual"/);
    expect(action).toMatch(/reuseFreshAutoExtract: input\.source === "manual"/);
    expect(action).toMatch(/extractPurpose: "fill"/);
    expect(action).toMatch(/shouldForceAutoDecReread/);
    expect(action).toMatch(/shouldForceHomeDecReread/);
    expect(action).toMatch(/shouldForceFloodDecReread/);
    expect(action).toMatch(/floodCoverageLimitsAfterFill/);
    expect(source("src/app/policies/[id]/page.tsx")).toMatch(/export const maxDuration = 300/);
    expect(action).not.toMatch(/quoteSheets|quote_sheets|fillQuoteSheet/);
    const mint = source("src/app/actions/policy-mint.ts");
    expect(mint).toMatch(/fillPolicyFromDecOnIssue/);
    const docs = source("src/components/policy/tabs/documents-tab.tsx");
    expect(docs).toMatch(/FillPolicyFromDecButton/);
    const button = source("src/components/policy/fill-policy-from-dec-button.tsx");
    expect(button).toMatch(/Fill from declaration page/);
    expect(button).toMatch(/Reason/);
    expect(button).toMatch(/"Confirm"/);
    expect(button).not.toMatch(/fillOverwriteWarning/);
    expect(button).not.toMatch(/replaces /);
    expect(button).not.toMatch(/data-ff-fill-policy-from-dec-overwrite/);
    const openFn = button.slice(button.indexOf("function openModal"), button.indexOf("function confirm"));
    const peekCall = openFn.indexOf("peekFillPolicyFromDec(policyId)");
    const previewCall = openFn.indexOf("previewFillPolicyFromDec(policyId)");
    expect(openFn.indexOf("setOpen(true)")).toBeGreaterThan(-1);
    expect(openFn.indexOf("setOpen(true)")).toBeLessThan(peekCall);
    expect(peekCall).toBeLessThan(previewCall);
    expect(previewCall).toBeLessThan(openFn.indexOf("await "));
    expect(openFn).toMatch(/fillDecCaughtError/);
    expect(openFn).not.toMatch(/startTransition/);
    expect(button).toMatch(/WaitHold/);
    expect(button).toMatch(/ProcessingLabel/);
    expect(button).toMatch(/data-ff-fill-policy-from-dec-working/);
    expect(button).toMatch(/title="Processing your document…"/);
    expect(button).toMatch(/<ProcessingLabel>Working<\/ProcessingLabel>/);
    expect(button).not.toMatch(/title="Working"/);
    expect(button).not.toMatch(/file change/i);
    expect(button).not.toMatch(/overwriteCount\} fields|replaces \$\{/);
    expect(button).toMatch(/DialogFooter/);
    const closeFn = button.slice(button.indexOf("function close"), button.indexOf("function openModal"));
    expect(closeFn).toMatch(/pending \|\| collecting/);
    expect(closeFn).not.toMatch(/requestId/);
    expect(button).toMatch(/disablePointerDismissal=\{showWorking\}/);
    expect(button).toMatch(/showCloseButton=\{!showWorking\}/);
    expect(button).toMatch(/eventDetails\.cancel\(\)/);
    expect(button).toMatch(/\{showWorking \? null : \(/);
    const cancelAt = button.indexOf("\n                  Cancel\n");
    const confirmAt = button.indexOf("data-ff-fill-policy-from-dec-confirm");
    expect(cancelAt).toBeGreaterThan(-1);
    expect(cancelAt).toBeLessThan(confirmAt);
    const working = renderToString(createElement(WaitHold, { title: "Processing your document…" }));
    expect(working).toContain("Processing your document…");
    expect(working).toContain('data-ff-wait-hold-spinner=""');
    expect(working).toContain("animate-spin");
    expect(working).toContain("ff-wait-hold-bar");
    const label = renderToString(createElement(ProcessingLabel, null, "Working"));
    expect(label).toContain('data-ff-processing=""');
    expect(label).toContain("animate-spin");
    expect(label).toContain("Working");
    const migration = source("drizzle/0160_policy_fill_audit.sql");
    expect(migration).toMatch(/policy_fill_audit/);
    expect(migration).toMatch(/fields_written/);
    expect(migration).toMatch(/fields_overwritten/);
    expect(migration).not.toMatch(/"updated_at"/);
  });

  it("picks an explicit declaration, else the newest dec", () => {
    const older = {
      id: "old",
      filename: "prior-dec.pdf",
      docType: "dec",
      mimeType: "application/pdf",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const newer = {
      id: "new",
      filename: "current-dec.pdf",
      docType: "policy_dec",
      mimeType: "application/pdf",
      createdAt: "2026-06-01T00:00:00.000Z",
    };
    expect(pickPolicyDecDocument([older, newer])?.id).toBe("new");
    expect(pickPolicyDecDocument([older, newer], { documentId: "old" })?.id).toBe("old");
    expect(pickPolicyDecDocument([older, newer], { sourceDocumentId: "old" })?.id).toBe("old");
  });

  it("prefers a Current term-role declaration only when the book pass asks", () => {
    const current = {
      id: "current",
      filename: "current-dec.pdf",
      docType: "policy_dec",
      mimeType: "application/pdf",
      createdAt: "2026-01-01T00:00:00.000Z",
      tags: ["dec", "term_role:current"],
    };
    const newer = {
      id: "newer",
      filename: "source-dec.pdf",
      docType: "policy_dec",
      mimeType: "application/pdf",
      createdAt: "2026-06-01T00:00:00.000Z",
      tags: ["dec", "term_role:prior"],
    };
    expect(pickPolicyDecDocument([current, newer])?.id).toBe("newer");
    expect(pickPolicyDecDocument([current, newer], { preferCurrentTerm: true })?.id).toBe("current");
    expect(pickPolicyDecDocument([current, newer], { preferCurrentTerm: true, sourceDocumentId: "newer" })?.id).toBe(
      "current",
    );
    expect(pickPolicyDecDocument([current, newer], { preferCurrentTerm: true, documentId: "newer" })?.id).toBe("newer");
    const untagged = {
      id: "old",
      filename: "prior-dec.pdf",
      docType: "dec",
      mimeType: "application/pdf",
      createdAt: "2025-01-01T00:00:00.000Z",
    };
    expect(pickPolicyDecDocument([untagged, newer], { preferCurrentTerm: true, sourceDocumentId: "old" })?.id).toBe(
      "old",
    );
  });
});

describe("manufactured home coverage display", () => {
  it("shows dollar coverage limits and hurricane, AOP, and wind/hail deductibles", () => {
    const html = renderToString(
      createElement(PolicyCoverageTab, {
        policy: {
          id: "p1",
          coverageA: 130000,
          coverageLimits: {
            coverage_c: "65000",
            coverage_d: "26000",
            coverage_e: "100000",
            coverage_f: "500",
            unit_year: "2006",
            wind_hail_deductible: "1000",
          },
          faceAmount: null,
          lineOfBusiness: "HO",
          formType: "MHO",
          policyType: "MHO",
          policySubType: "MHO",
        },
        terms: [],
        currentTerm: {
          id: "t1",
          role: "current",
          premium: "3678.00",
          aopDeductible: "1000",
          hurricaneDeductible: "2%",
          comprehensiveDeductible: null,
          collisionDeductible: null,
          coverages: [{ key: "coverage_c", label: "Coverage C", value: "65000" }],
          termEffective: new Date("2026-09-25T12:00:00.000Z"),
          termExpiration: new Date("2027-09-25T12:00:00.000Z"),
        },
      }),
    );
    expect(html).toContain("$130,000");
    expect(html).toContain("$65,000");
    expect(html).toContain("$26,000");
    expect(html).toContain("$100,000");
    expect(html).toContain("$500");
    expect(html).toContain("$1,000");
    expect(html).toContain("All Other Perils (AOP)");
    expect(html).toContain("Hurricane (% of Cov A)");
    expect(html).toContain("Windstorm or Hail (Other Than Hurricane)");
    expect(html).toContain(">2%<");
    expect(html).not.toContain("$3,678");
    expect(html).not.toContain(">Deductible<");
    expect(html).toContain("2006");
    expect(html).not.toContain("$2,006");

    const fields = policyInformationFields({
      policy: {
        policyNumber: "ATM205086",
        status: "active",
        lineOfBusiness: "HO",
        policyType: "MHO",
        policySubType: "MHO",
        formType: "MHO",
        effectiveDate: new Date("2026-09-25T12:00:00.000Z"),
        expirationDate: new Date("2027-09-25T12:00:00.000Z"),
        coverageA: 130000,
        coverageLimits: { coverage_c: "65000", unit_year: "2006" },
      },
    });
    expect(fields.find((field) => field.key === "line")?.value).toBe("HO · MHO");
    expect(fields.find((field) => field.key === "subType")?.value).toBe("MHO");
    expect(fields.find((field) => field.key === "coverageA")?.value).toBe("$130,000");
    const limits = fields.find((field) => field.key === "limits")?.value ?? "";
    expect(limits).toContain("Coverage C $65,000");
    expect(limits).toContain("Unit Year 2006");
    expect(limits).not.toContain("$2,006");
  });
});
