import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LifeAppetiteHelper } from "@/components/deal/life-appetite-helper";
import {
  LIFE_UW_MATRIX_CSV,
  LIFE_UW_MATRIX_COVERAGE_NOTE,
  combineLifeConditionAndBuild,
  parseLifeUwMatrixCsv,
  predictLifeAppetite,
  type LifeBuildRule,
} from "./appetite";
import { LIFE_LEAN_MEDICAL_CONDITION_OPTIONS, LIFE_MEDICAL_CONDITION_OPTIONS } from "./conditions";
import { matchLifeMatrixCarrier } from "./carriers";
import { LIFE_BUILD_CSV, lifeBuildFromSheet, lifeBuildSummary, parseLifeBuildCsv } from "./build";

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
      expect.arrayContaining(["Diabetes Type 1", "AIDS / HIV", "Dementia", "Cystic fibrosis", "Walker use"]),
    );
    expect(new Set(LIFE_MEDICAL_CONDITION_OPTIONS).size).toBe(LIFE_MEDICAL_CONDITION_OPTIONS.length);
    expect(LIFE_MEDICAL_CONDITION_OPTIONS.length).toBeLessThanOrEqual(80);
  });

  it("loads MATRIX products from the CSV without inventing accept cells", () => {
    expect(matrix.products.length).toBeGreaterThanOrEqual(20);
    expect(matrix.products.map((row) => row.carrierSlug)).toEqual(
      expect.arrayContaining(["americo", "moo", "foresters", "transamerica", "sbli", "banner"]),
    );
    expect(matrix.rules.every((row) => row.outcome === "decline")).toBe(true);
    expect(matrix.rules.every((row) => row.source === "screenshot_row_uniform")).toBe(true);
    expect(readFileSync(LIFE_UW_MATRIX_CSV, "utf8")).toMatch(/full MATRIX when spreadsheet provided|incomplete/);
  });

  it("predicts Decline only for seeded uniform-row conditions", () => {
    const declined = predictLifeAppetite({
      medicalConditions: "AIDS / HIV",
      tobaccoStatus: "Never",
      matrix,
    });
    expect(declined.conditionKeys).toEqual(["aids_hiv"]);
    expect(declined.predictions.every((row) => row.outcome === "decline")).toBe(true);

    const unknown = predictLifeAppetite({
      medicalConditions: "Asthma, Sleep apnea",
      tobaccoStatus: "Current",
      matrix,
    });
    expect(unknown.predictions.every((row) => row.outcome === "unknown")).toBe(true);
    expect(unknown.coverageNote).toBe(LIFE_UW_MATRIX_COVERAGE_NOTE);

    const mixed = predictLifeAppetite({
      medicalConditions: "AIDS / HIV, Asthma",
      tobaccoStatus: "Never",
      matrix,
    });
    expect(mixed.predictions.every((row) => row.outcome === "decline")).toBe(true);
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
    expect(unknownHtml).not.toContain('data-ff-life-appetite-outcome="accept"');
  });

  it("exposes the helper on Life Markets / Quotes and a shared picklist", () => {
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/LifeAppetiteHelper/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/predictLifeAppetite/);
    expect(source("src/lib/custom-fields/starter-picklists.ts")).toMatch(/STARTER_PICKLIST_LIFE_MEDICAL/);
    expect(source("src/lib/custom-fields/starter-picklists.ts")).toMatch(/Life medical conditions/);
    expect(source("src/components/deal/master-sheet-compare.tsx")).toMatch(/searchable/);
  });

  it("computes BMI from the Risk Profile but does not invent a build band", () => {
    const liveBuild = parseLifeBuildCsv(readFileSync(LIFE_BUILD_CSV, "utf8"));
    expect(liveBuild).toEqual([]);
    expect(readFileSync(LIFE_BUILD_CSV, "utf8")).toMatch(/height_inches/);

    const build = lifeBuildFromSheet({ heightFt: "5", heightIn: "10", weightLbs: "180" });
    expect(build.bmi).toBe(25.8);
    expect(build.band).toBe("unknown");
    expect(build.tablePending).toBe(true);
    expect(build.note).toMatch(/full MATRIX when spreadsheet provided/i);
    expect(lifeBuildSummary(build)).toBe("Build: BMI 25.8 (table pending)");

    const predicted = predictLifeAppetite({
      medicalConditions: "Asthma",
      heightFt: "5",
      heightIn: "10",
      weightLbs: "180",
      matrix,
    });
    expect(predicted.build.bmi).toBe(25.8);
    expect(predicted.build.tablePending).toBe(true);
    expect(predicted.predictions.every((row) => row.outcome === "unknown")).toBe(true);
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
    expect(pendingHtml).toContain("Build: BMI 25.8 (table pending)");
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/applicant_gender/);
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
    expect(asthma.predictions.every((row) => row.conditionOutcome === "unknown")).toBe(true);
    expect(asthma.predictions.every((row) => row.buildOutcome === "graded")).toBe(true);
    expect(asthma.predictions.every((row) => row.outcome === "graded")).toBe(true);
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
    expect(acceptDoesNotFill.predictions.every((row) => row.outcome === "unknown")).toBe(true);

    const aids = predictLifeAppetite({
      medicalConditions: "AIDS / HIV",
      heightFt: "5",
      heightIn: "10",
      weightLbs: "180",
      matrix,
      buildRules: [{ ...heightWeightGraded, outcome: "accept", band: "preferred" }],
    });
    expect(aids.predictions.every((row) => row.outcome === "decline")).toBe(true);

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
    expect(femaleSkipsMaleRule.predictions.every((row) => row.outcome === "unknown")).toBe(true);

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
    expect(matchLifeMatrixCarrier("Mutual of Omaha")?.agentPhone).toBe("800-693-6083");
    expect(matchLifeMatrixCarrier("Foresters Financial")?.agentPortalUrl).toContain("myezbiz");
    expect(matchLifeMatrixCarrier("Legal & General America")?.name).toBe("Banner Life");
    expect(matchLifeMatrixCarrier("Moody")).toBeNull();
  });
});
