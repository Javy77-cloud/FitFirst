import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LifeAppetiteHelper } from "@/components/deal/life-appetite-helper";
import {
  LIFE_UW_MATRIX_CSV,
  LIFE_UW_MATRIX_COVERAGE_NOTE,
  combineLifeAppetiteInputs,
  combineLifeConditionAndBuild,
  lifeAgeBandOutcome,
  lifeAppetiteHasScoreInputs,
  parseLifeUwMatrixCsv,
  predictLifeAppetite,
  type LifeBuildRule,
} from "./appetite";
import {
  LIFE_LEAN_MEDICAL_CONDITION_OPTIONS,
  LIFE_MATRIX_COL_A_SKIP,
  LIFE_MEDICAL_CONDITION_OPTIONS,
  lifeConditionKeyFromLabel,
  lifeConditionKeysFromSheet,
} from "./conditions";
import { matchLifeMatrixCarrier } from "./carriers";
import {
  LIFE_BUILD_CSV,
  LIFE_BUILD_PARTIAL_NOTE,
  LIFE_BUILD_SAMPLE_TSV,
  flattenLifeBuildChartSample,
  lifeBuildFromSheet,
  lifeBuildSummary,
  parseLifeBuildCsv,
  parseLifeHeightInches,
} from "./build";
import { LIFE_CONTACTS_CSV, LIFE_SHEET_TABS, parseLifeContactsCsv } from "./sheet";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Life UW MATRIX appetite v1", () => {
  const matrix = parseLifeUwMatrixCsv(readFileSync(LIFE_UW_MATRIX_CSV, "utf8"));

  it("keeps lean Life conditions and adds MATRIX vocabulary", () => {
    expect(LIFE_MEDICAL_CONDITION_OPTIONS.slice(0, LIFE_LEAN_MEDICAL_CONDITION_OPTIONS.length)).toEqual(
      [...LIFE_LEAN_MEDICAL_CONDITION_OPTIONS],
    );
    expect(LIFE_MEDICAL_CONDITION_OPTIONS).toEqual(
      expect.arrayContaining([
        "Diabetes Type 1",
        "AIDS / HIV",
        "Dementia",
        "Cystic fibrosis",
        "Walker use",
        "Epilepsy",
        "Gastric bypass",
        "HIV",
        "ALS",
        "Multiple sclerosis",
      ]),
    );
    expect(lifeConditionKeysFromSheet("ALS")).toEqual(
      expect.arrayContaining(["als_lou_gehrigs_disease"]),
    );
    expect(lifeConditionKeysFromSheet("Multiple sclerosis")).toEqual(
      expect.arrayContaining(["multiple_sclerosis_ms"]),
    );
    expect(lifeConditionKeyFromLabel("ALS (Lou Gehrig's Disease)")).toBe("als_lou_gehrigs_disease");
    expect(lifeConditionKeyFromLabel("Migrane Headaches")).toBe("migraine_headaches");
    expect(lifeConditionKeyFromLabel("Carrier Websites")).toBeNull();
    expect(LIFE_MATRIX_COL_A_SKIP.has("Medical Conditions")).toBe(true);
    expect(new Set(LIFE_MEDICAL_CONDITION_OPTIONS).size).toBe(LIFE_MEDICAL_CONDITION_OPTIONS.length);
    expect(LIFE_MEDICAL_CONDITION_OPTIONS.length).toBeLessThanOrEqual(160);
  });

  it("loads MATRIX products from the live sheet without inventing mixed-cell outcomes", () => {
    expect(matrix.products.length).toBeGreaterThanOrEqual(20);
    expect(matrix.products.map((row) => row.carrierSlug)).toEqual(
      expect.arrayContaining(["americo", "moo", "foresters", "transamerica", "sbli", "banner", "corebridge"]),
    );
    expect(matrix.products.some((row) => row.carrierSlug === "corebridge" && row.productSlug === "simplynow")).toBe(
      true,
    );
    expect(matrix.products.some((row) => row.carrierSlug === "americo" && row.productSlug === "simplynow")).toBe(
      false,
    );
    expect(matrix.rules.every((row) => row.source === "live_sheet_cell")).toBe(true);
    const outcomes = new Set(matrix.rules.map((row) => row.outcome));
    expect(outcomes.has("decline")).toBe(true);
    expect(outcomes.has("accept")).toBe(true);
    expect(outcomes.has("graded")).toBe(true);
    expect(outcomes.has("preferred")).toBe(true);
    expect(readFileSync(LIFE_UW_MATRIX_CSV, "utf8")).toMatch(/full MATRIX when spreadsheet extract is complete|incomplete/);
  });

  it("predicts live-sheet cells: AIDS is not uniform, mixed Asthma stays Unknown", () => {
    const declined = predictLifeAppetite({
      medicalConditions: "AIDS / HIV",
      tobaccoStatus: "Never",
      matrix,
    });
    expect(declined.conditionKeys).toEqual(expect.arrayContaining(["aids_hiv", "aids", "hiv"]));
    const byProduct = Object.fromEntries(
      declined.predictions.map((row) => [`${row.carrierSlug}:${row.productSlug}`, row.outcome]),
    );
    expect(byProduct["amam:express_term"]).toBe("decline");
    expect(byProduct["royal_neighbors:ensured_legacy"]).toBe("graded");
    expect(byProduct["corebridge:giwl"]).toBe("accept");

    const asthmaSleep = predictLifeAppetite({
      medicalConditions: "Asthma, Sleep apnea",
      tobaccoStatus: "Current",
      matrix,
    });
    const amamAsthma = asthmaSleep.predictions.find(
      (row) => row.carrierSlug === "amam" && row.productSlug === "express_term",
    );
    expect(amamAsthma?.outcome).toBe("unknown");
    expect(asthmaSleep.coverageNote).toBe(LIFE_UW_MATRIX_COVERAGE_NOTE);

    const mixed = predictLifeAppetite({
      medicalConditions: "AIDS / HIV, Asthma",
      tobaccoStatus: "Never",
      matrix,
    });
    expect(mixed.predictions.find((row) => row.carrierSlug === "amam" && row.productSlug === "express_term")?.outcome).toBe(
      "decline",
    );
  });

  it("renders Decline cards for AIDS and Unknown for Asthma-only", () => {
    const declined = predictLifeAppetite({
      medicalConditions: "AIDS / HIV",
      tobaccoStatus: "Never",
      matrix,
    });
    const declineHtml = renderToString(
      createElement(LifeAppetiteHelper, {
        selectedLabels: declined.selectedLabels,
        tobaccoStatus: "Never",
        predictions: declined.predictions,
        coverageNote: declined.coverageNote,
      }),
    );
    expect(declineHtml).toContain("data-ff-life-appetite");
    expect(declineHtml).toContain("AIDS / HIV");
    expect(declineHtml).toContain('data-ff-life-appetite-outcome="decline"');
    expect(declineHtml).toContain("Full MATRIX when spreadsheet provided");

    const unknown = predictLifeAppetite({
      medicalConditions: "Asthma",
      tobaccoStatus: "Current",
      matrix,
    });
    const unknownHtml = renderToString(
      createElement(LifeAppetiteHelper, {
        selectedLabels: unknown.selectedLabels,
        tobaccoStatus: "Current",
        predictions: unknown.predictions,
        coverageNote: unknown.coverageNote,
      }),
    );
    expect(unknownHtml).toContain("Asthma");
    expect(unknownHtml).toContain("Tobacco: Current");
    expect(unknownHtml).toContain('data-ff-life-appetite-outcome="unknown"');
    const amamExpress = unknown.predictions.find(
      (row) => row.carrierSlug === "amam" && row.productSlug === "express_term",
    );
    expect(amamExpress?.outcome).toBe("unknown");
  });

  it("exposes the helper on Life Markets only and a shared picklist", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/LifeAppetiteHelper/);
    expect(page).toMatch(/predictLifeAppetite/);
    expect(page).toMatch(/date_of_birth/);
    const marketsStart = page.indexOf('id === "markets"');
    expect(page.indexOf("<LifeAppetiteHelper", marketsStart)).toBeGreaterThan(marketsStart);
    expect(page.indexOf("<LifeHealthQuotesPanel", marketsStart)).toBeGreaterThan(
      page.indexOf("<LifeAppetiteHelper", marketsStart),
    );
    expect(page).toMatch(/<LifeHealthQuotesPanel/);
    expect(page).not.toMatch(/noticeAction=/);
    expect(source("src/lib/custom-fields/starter-picklists.ts")).toMatch(/STARTER_PICKLIST_LIFE_MEDICAL/);
    expect(source("src/lib/custom-fields/starter-picklists.ts")).toMatch(/Life medical conditions/);
    expect(source("src/components/deal/master-sheet-compare.tsx")).toMatch(/searchable/);
  });

  it("computes BMI from the Risk Profile and keeps heights off the Americo sample Unknown", () => {
    const liveBuild = parseLifeBuildCsv(readFileSync(LIFE_BUILD_CSV, "utf8"));
    expect(liveBuild.length).toBeGreaterThan(0);
    expect(liveBuild.every((row) => row.carrierSlug === "americo")).toBe(true);
    expect(readFileSync(LIFE_BUILD_CSV, "utf8")).toMatch(/height_inches/);
    expect(flattenLifeBuildChartSample(readFileSync(LIFE_BUILD_SAMPLE_TSV, "utf8"))).toHaveLength(liveBuild.length);
    expect(parseLifeHeightInches("5'0\"")).toBe(60);

    const build = lifeBuildFromSheet({ heightFt: "5", heightIn: "10", weightLbs: "180" });
    expect(build.bmi).toBe(25.8);
    expect(build.band).toBe("unknown");
    expect(build.tablePending).toBe(true);

    const predicted = predictLifeAppetite({
      medicalConditions: "Asthma",
      heightFt: "5",
      heightIn: "10",
      weightLbs: "180",
      matrix,
    });
    expect(predicted.build.bmi).toBe(25.8);
    expect(predicted.build.tablePending).toBe(false);
    expect(predicted.build.note).toBe(LIFE_BUILD_PARTIAL_NOTE);
    expect(
      predicted.predictions.find((row) => row.carrierSlug === "amam" && row.productSlug === "express_term")?.outcome,
    ).toBe("unknown");
    expect(predicted.predictions.every((row) => row.buildOutcome === "unknown")).toBe(true);

    const pendingHtml = renderToString(
      createElement(LifeAppetiteHelper, {
        selectedLabels: predicted.selectedLabels,
        tobaccoStatus: "Never",
        predictions: predicted.predictions,
        coverageNote: predicted.coverageNote,
        build: predicted.build,
      }),
    );
    expect(pendingHtml).toContain("Build: BMI 25.8 (partial build chart)");
    expect(lifeBuildSummary(predicted.build)).toBe("Build: BMI 25.8 (partial build chart)");
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/applicant_gender/);
  });

  it("uses the Americo build sample for Accept/Decline and stays Unknown without a carrier chart", () => {
    const inRange = predictLifeAppetite({
      medicalConditions: "Asthma",
      heightFt: "5",
      heightIn: "0",
      weightLbs: "100",
      matrix,
    });
    const americoIn = inRange.predictions.filter((row) => row.carrierSlug === "americo");
    expect(americoIn.length).toBeGreaterThan(0);
    expect(americoIn.every((row) => row.buildOutcome === "accept")).toBe(true);
    expect(americoIn.every((row) => row.buildBand === "in_range")).toBe(true);
    expect(americoIn.every((row) => row.outcome === "unknown")).toBe(true);
    expect(inRange.predictions.filter((row) => row.carrierSlug !== "americo").every((row) => row.buildOutcome === "unknown")).toBe(
      true,
    );

    const heavy = predictLifeAppetite({
      medicalConditions: "Asthma",
      heightFt: "5",
      heightIn: "0",
      weightLbs: "300",
      matrix,
    });
    expect(heavy.predictions.filter((row) => row.carrierSlug === "americo").every((row) => row.outcome === "decline")).toBe(
      true,
    );
    expect(heavy.predictions.filter((row) => row.carrierSlug === "amam").every((row) => row.buildOutcome === "unknown")).toBe(
      true,
    );

    const eagleAccept = predictLifeAppetite({
      medicalConditions: "Disability",
      heightFt: "5",
      heightIn: "0",
      weightLbs: "100",
      matrix,
    });
    expect(
      eagleAccept.predictions.find((row) => row.carrierSlug === "americo" && row.productSlug === "eagle_select")?.outcome,
    ).toBe("accept");
    expect(
      eagleAccept.predictions.find((row) => row.carrierSlug === "americo" && row.productSlug === "hms_term_iul")?.outcome,
    ).toBe("decline");

    const als = predictLifeAppetite({
      medicalConditions: "ALS",
      tobaccoStatus: "Never",
      matrix,
    });
    expect(als.conditionKeys).toEqual(expect.arrayContaining(["als_lou_gehrigs_disease"]));
    expect(als.predictions.find((row) => row.carrierSlug === "amam" && row.productSlug === "express_term")?.outcome).toBe(
      "decline",
    );
    expect(als.predictions.find((row) => row.carrierSlug === "corebridge" && row.productSlug === "giwl")?.outcome).toBe(
      "accept",
    );
  });

  it("lets a loaded build table adjust Graded/Decline without minting Accept", () => {
    expect(combineLifeConditionAndBuild("unknown", "accept")).toBe("unknown");
    expect(combineLifeConditionAndBuild("unknown", "graded")).toBe("graded");
    expect(combineLifeConditionAndBuild("unknown", "decline")).toBe("decline");
    expect(combineLifeConditionAndBuild("accept", "graded")).toBe("graded");
    expect(combineLifeConditionAndBuild("decline", "accept")).toBe("decline");
    expect(combineLifeConditionAndBuild("accept", "unknown")).toBe("accept");

    const heightWeightGraded: LifeBuildRule = {
      carrierSlug: "",
      carrierName: "",
      productSlug: "",
      productName: "",
      sex: "",
      heightInches: 70,
      weightMin: 170,
      weightMax: 190,
      bmiMin: null,
      bmiMax: null,
      band: "standard",
      outcome: "graded",
      ruleText: "Test fixture: 5'10\" 170-190 graded. Not a carrier chart.",
      coverage: "seeded",
      source: "test_fixture",
    };
    const bmiDecline: LifeBuildRule = {
      ...heightWeightGraded,
      heightInches: null,
      weightMin: null,
      weightMax: null,
      bmiMin: 40,
      bmiMax: 80,
      band: "decline",
      outcome: "decline",
      ruleText: "Test fixture: BMI 40+ decline. Not a carrier chart.",
    };
    const maleOnlyDecline: LifeBuildRule = {
      ...heightWeightGraded,
      sex: "male",
      outcome: "decline",
      band: "decline",
      ruleText: "Test fixture: male 5'10\" 170-190 decline.",
    };

    const asthma = predictLifeAppetite({
      medicalConditions: "Asthma",
      heightFt: "5",
      heightIn: "10",
      weightLbs: "180",
      matrix,
      buildRules: [heightWeightGraded],
    });
    expect(asthma.build.tablePending).toBe(false);
    expect(asthma.build.band).toBe("standard");
    const amamUnknown = asthma.predictions.find(
      (row) => row.carrierSlug === "amam" && row.productSlug === "express_term",
    );
    expect(amamUnknown?.conditionOutcome).toBe("unknown");
    expect(amamUnknown?.buildOutcome).toBe("graded");
    expect(amamUnknown?.outcome).toBe("graded");
    expect(asthma.predictions.every((row) => row.buildOutcome === "graded")).toBe(true);
    expect(asthma.predictions.every((row) => row.buildBand === "standard")).toBe(true);

    const acceptDoesNotFill = predictLifeAppetite({
      medicalConditions: "Asthma",
      heightFt: "5",
      heightIn: "10",
      weightLbs: "180",
      matrix,
      buildRules: [{ ...heightWeightGraded, outcome: "accept", band: "preferred" }],
    });
    expect(acceptDoesNotFill.predictions.every((row) => row.buildOutcome === "accept")).toBe(true);
    expect(
      acceptDoesNotFill.predictions
        .filter((row) => row.conditionOutcome === "unknown")
        .every((row) => row.outcome === "unknown"),
    ).toBe(true);

    const aids = predictLifeAppetite({
      medicalConditions: "AIDS / HIV",
      heightFt: "5",
      heightIn: "10",
      weightLbs: "180",
      matrix,
      buildRules: [{ ...heightWeightGraded, outcome: "accept", band: "preferred" }],
    });
    expect(
      aids.predictions.find((row) => row.carrierSlug === "amam" && row.productSlug === "express_term")?.outcome,
    ).toBe("decline");
    expect(
      aids.predictions.find((row) => row.carrierSlug === "corebridge" && row.productSlug === "giwl")?.outcome,
    ).toBe("accept");

    const heavy = predictLifeAppetite({
      medicalConditions: "Asthma",
      heightFt: "5",
      heightIn: "10",
      weightLbs: "320",
      matrix,
      buildRules: [bmiDecline],
    });
    expect(heavy.predictions.every((row) => row.outcome === "decline")).toBe(true);

    const femaleSkipsMaleRule = predictLifeAppetite({
      medicalConditions: "Asthma",
      heightFt: "5",
      heightIn: "10",
      weightLbs: "180",
      sex: "Female",
      matrix,
      buildRules: [maleOnlyDecline],
    });
    expect(femaleSkipsMaleRule.build.sex).toBe("female");
    expect(femaleSkipsMaleRule.predictions.every((row) => row.buildOutcome === "unknown")).toBe(true);
    expect(
      femaleSkipsMaleRule.predictions.find((row) => row.carrierSlug === "amam" && row.productSlug === "express_term")
        ?.outcome,
    ).toBe("unknown");

    const maleHits = predictLifeAppetite({
      medicalConditions: "Asthma",
      heightFt: "5",
      heightIn: "10",
      weightLbs: "180",
      sex: "Male",
      matrix,
      buildRules: [maleOnlyDecline],
    });
    expect(maleHits.predictions.every((row) => row.outcome === "decline")).toBe(true);

    const acceptMatrix = {
      products: [
        {
          carrierSlug: "americo",
          carrierName: "Americo",
          productSlug: "fixture",
          productName: "Fixture",
          ageMin: "18",
          ageMax: "75",
        },
      ],
      rules: [
        {
          carrierSlug: "americo",
          productSlug: "fixture",
          conditionKey: "asthma",
          outcome: "accept" as const,
          ruleText: "Test fixture accept.",
          coverage: "seeded",
          source: "test_fixture",
        },
      ],
    };
    const worsened = predictLifeAppetite({
      medicalConditions: "Asthma",
      heightFt: "5",
      heightIn: "10",
      weightLbs: "180",
      matrix: acceptMatrix,
      buildRules: [heightWeightGraded],
    });
    expect(worsened.predictions).toHaveLength(1);
    expect(worsened.predictions[0]?.conditionOutcome).toBe("accept");
    expect(worsened.predictions[0]?.outcome).toBe("graded");
  });

  it("matches MATRIX Life carriers by public name without inventing contacts", () => {
    expect(matchLifeMatrixCarrier("Americo Life")?.website).toBe("https://www.americo.com");
    expect(matchLifeMatrixCarrier("Mutual of Omaha")?.agentPhone).toBe("800-775-7896");
    expect(matchLifeMatrixCarrier("Foresters Financial")?.agentPortalUrl).toContain("myezbiz");
    expect(matchLifeMatrixCarrier("Legal & General America")?.name).toBe("Banner Life");
    expect(matchLifeMatrixCarrier("American Amicable/Occidental")?.slug).toBe("amam");
    expect(matchLifeMatrixCarrier("American General (AIG)")?.slug).toBe("corebridge");
    expect(matchLifeMatrixCarrier("Fidelity&Guaranty")?.slug).toBe("fg");
    expect(matchLifeMatrixCarrier("Moody")).toBeNull();
    const contacts = parseLifeContactsCsv(readFileSync(LIFE_CONTACTS_CSV, "utf8"));
    expect(LIFE_SHEET_TABS).toHaveLength(18);
    expect(LIFE_SHEET_TABS.map((tab) => tab.role)).toEqual(
      expect.arrayContaining(["condition_product", "build_chart", "contacts"]),
    );
    expect(contacts.map((row) => row.carrierSlug)).toEqual(
      expect.arrayContaining([
        "amam",
        "americo",
        "moo",
        "banner",
        "transamerica",
        "uhl",
        "american_equity",
        "assurity",
        "athene",
        "columbus_life",
      ]),
    );
    expect(contacts.find((row) => row.carrierSlug === "moo")?.phone).toBe("800-775-7896");
    expect(contacts.find((row) => row.carrierSlug === "amam")?.repName).toBe("Pete Mejia");
    expect(contacts.find((row) => row.carrierSlug === "corebridge")?.repPhone).toBe("615-785-3828");
    expect(contacts.find((row) => row.carrierSlug === "americo")?.phone).toBe("800-231-0801");
  });

  it("adds 0131 Life rep marketing fields without rewriting HO or prior Life migrations", () => {
    const sql = readFileSync("drizzle/0131_life_rep_contacts_build.sql", "utf8");
    expect(sql).toMatch(/Pete Mejia/);
    expect(sql).toMatch(/Andrew Kostus/);
    expect(sql).toMatch(/Trevor Keeble/);
    expect(sql).toMatch(/Kelly Steinmetz/);
    expect(sql).toMatch(/American Equity/);
    expect(sql).toMatch(/marketing_contact_name/);
    expect(sql).toMatch(/american amicable/);
    expect(sql).toMatch(/american general/);
    expect(sql).toMatch(/fidelity & guaranty/i);
    expect(sql).not.toMatch(/phone\s*=\s*'/);
    expect(sql).not.toMatch(/agent_phone\s*=\s*'/);
    expect(sql).not.toMatch(/southern_oak|olympus|standinsurance|trident/i);
    expect(sql).not.toMatch(/0128_life_matrix|0129_life_sheet|0130_javy/);
    expect(source("data/appetite/fitfirst-life-uw-matrix.csv")).toMatch(/live_sheet_cell/);
    expect(source("drizzle/meta/_journal.json")).toMatch(/0131_life_rep_contacts_build/);
  });

  it("scores age bands and stays honestly empty when data is thin", () => {
    expect(lifeAppetiteHasScoreInputs({})).toBe(false);
    expect(lifeAppetiteHasScoreInputs({ ageYears: 42 })).toBe(true);
    expect(combineLifeAppetiteInputs("accept", "unknown", "decline")).toBe("decline");
    expect(lifeAgeBandOutcome(17, "18", "75").outcome).toBe("decline");
    expect(lifeAgeBandOutcome(40, "18", "75").outcome).toBe("unknown");

    const thin = predictLifeAppetite({
      medicalConditions: "",
      tobaccoStatus: "Never",
      matrix,
    });
    expect(thin.thin).toBe(true);
    expect(thin.predictions).toEqual([]);
    const thinHtml = renderToString(
      createElement(LifeAppetiteHelper, {
        selectedLabels: thin.selectedLabels,
        predictions: thin.predictions,
        coverageNote: thin.coverageNote,
        thin: thin.thin,
        ageYears: thin.ageYears,
      }),
    );
    expect(thinHtml).toContain("data-ff-life-appetite-empty");
    expect(thinHtml).toContain("no rate pull");
    expect(thinHtml).not.toContain("data-ff-life-appetite-cards");

    const aged = predictLifeAppetite({
      medicalConditions: "",
      tobaccoStatus: "Never",
      dateOfBirth: "1950-01-01",
      ageYears: 76,
      matrix,
    });
    expect(aged.thin).toBe(false);
    expect(aged.ageYears).toBe(76);
    const sbli = aged.predictions.find((row) => row.carrierSlug === "sbli" && row.productSlug === "easytrack");
    expect(sbli?.ageOutcome).toBe("decline");
    expect(sbli?.outcome).toBe("decline");
    expect(sbli?.ruleText).toMatch(/above product maximum/);
    const agedHtml = renderToString(
      createElement(LifeAppetiteHelper, {
        selectedLabels: aged.selectedLabels,
        predictions: aged.predictions,
        coverageNote: aged.coverageNote,
        thin: aged.thin,
        ageYears: aged.ageYears,
      }),
    );
    expect(agedHtml).toContain("Age: 76");
    expect(agedHtml).toContain('data-ff-life-appetite-outcome="decline"');
  });
});
