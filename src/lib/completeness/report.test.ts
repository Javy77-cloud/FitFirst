import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { anaHomeSheetValues } from "@/lib/quote-sheet/ana-home";
import { reportFromSheet, healthierThan } from "./report";
import { ruizHomeSheetValues } from "./ruiz-home";

describe("completeness strip — blank vs filled, not a score", () => {
  it("locks Ana unbound + Cov A $321,000 and does not fake 100%", () => {
    expect(fixture.risk.coverageA).toBe(321000);
    const values = anaHomeSheetValues(fixture.risk);
    expect(values.coverage_a.value).toBe("321000");
    expect(values.coverage_a.status).toBe("confirmed");
    expect(values.coverage_a.source).toBe("javy");

    const report = reportFromSheet("home", values);
    expect(report.missing).toBeGreaterThan(0);
    expect(report.confirmed).toBeGreaterThan(0);
    expect(report.confirmed + report.check + report.missing).toBe(report.total);
    expect(report.confirmedShare).toBeLessThan(1);
    expect(report.bindReady).toBe(false);
    expect(report.shopReady).toBe(true);
    expect(report.bindBlockers.map((row) => row.key)).toEqual(
      expect.arrayContaining([
        "square_feet",
        "replacement_cost_estimate",
        "hurricane_deductible",
        "aop_deductible",
        "four_point_date",
        "wind_mit_form",
      ]),
    );
    expect(report).not.toHaveProperty("probability");
    expect(report).not.toHaveProperty("score");
    expect(JSON.stringify(report)).not.toMatch(/AI|predicted|probability/i);
  });

  it("keeps Ana shopping in seed and never rewrites her fixture from this slice", () => {
    const seed = readFileSync("src/lib/db/seed.ts", "utf8");
    expect(seed).toMatch(/pipelineStage: "shopping"/);
    expect(seed).toMatch(/coverageA: fixture\.risk\.coverageA/);

    const completenessSeed = readFileSync("src/lib/db/seed-completeness.ts", "utf8");
    expect(completenessSeed).not.toMatch(/ana-dib-ho3-2026-09-02/);
    expect(completenessSeed).not.toMatch(/[^_]DEAL_ID/);
    expect(completenessSeed).not.toMatch(/321000/);
    expect(completenessSeed).toMatch(/pipelineStage: "bound"/);
    expect(seed).toMatch(/seedWorkQueue/);
    expect(seed).toMatch(/from "@\/lib\/quote-sheet\/ana-home"/);
  });

  it("treats CHECK as blue, not confirmed, and blanks as yellow missing", () => {
    const values = emptySheetValues("home");
    values.year_built = { value: "2004", status: "check", source: "extracted" };
    values.coverage_a = { value: "275000", status: "check", source: "extracted" };
    const report = reportFromSheet("home", values);
    expect(report.check).toBe(2);
    expect(report.confirmed).toBe(0);
    expect(report.shopReady).toBe(false);
    expect(report.shopBlockers.some((row) => row.key === "year_built" && row.status === "check")).toBe(
      true,
    );
  });

  it("shows the bound Ruiz sheet healthier than Ana without inventing a 100% for Ana", () => {
    const ana = reportFromSheet("home", anaHomeSheetValues(fixture.risk));
    const ruiz = reportFromSheet("home", ruizHomeSheetValues());
    expect(ruizHomeSheetValues().coverage_a.value).toBe("402000");
    expect(ruizHomeSheetValues().coverage_a.value).not.toBe("321000");
    expect(healthierThan(ruiz, ana)).toBe(true);
    expect(ruiz.confirmed).toBeGreaterThan(ana.confirmed);
    expect(ruiz.missing).toBeLessThan(ana.missing);
    expect(ruiz.bindReady).toBe(true);
    expect(ana.bindReady).toBe(false);
    expect(ana.confirmedShare).toBeLessThan(ruiz.confirmedShare);
  });
});
