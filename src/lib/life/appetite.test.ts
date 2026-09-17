import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIFE_UW_MATRIX_CSV,
  LIFE_UW_MATRIX_COVERAGE_NOTE,
  parseLifeUwMatrixCsv,
  predictLifeAppetite,
} from "./appetite";
import { LIFE_LEAN_MEDICAL_CONDITION_OPTIONS, LIFE_MEDICAL_CONDITION_OPTIONS } from "./conditions";
import { matchLifeMatrixCarrier } from "./carriers";

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

  it("exposes the helper on Life Markets / Quotes and a shared picklist", () => {
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/LifeAppetiteHelper/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/predictLifeAppetite/);
    expect(source("src/lib/custom-fields/starter-picklists.ts")).toMatch(/STARTER_PICKLIST_LIFE_MEDICAL/);
    expect(source("src/lib/custom-fields/starter-picklists.ts")).toMatch(/Life medical conditions/);
    expect(source("src/components/deal/master-sheet-compare.tsx")).toMatch(/searchable/);
  });

  it("matches MATRIX Life carriers by public name without inventing contacts", () => {
    expect(matchLifeMatrixCarrier("Americo Life")?.website).toBe("https://www.americo.com");
    expect(matchLifeMatrixCarrier("Mutual of Omaha")?.agentPhone).toBe("800-693-6083");
    expect(matchLifeMatrixCarrier("Foresters Financial")?.agentPortalUrl).toContain("myezbiz");
    expect(matchLifeMatrixCarrier("Legal & General America")?.name).toBe("Banner Life");
    expect(matchLifeMatrixCarrier("Moody")).toBeNull();
  });
});
