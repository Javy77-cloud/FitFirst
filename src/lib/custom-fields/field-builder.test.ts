import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultFieldsForLine, defaultLayoutForLine } from "./defaults";
import { evaluateFormula, extractFormulaFields } from "./formula";
import { addSection, moveField, relabelSection } from "./layout";
import { CUSTOM_FIELD_TYPES } from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal field builder", () => {
  it("exposes every Javy field type including formula and image", () => {
    expect(CUSTOM_FIELD_TYPES).toEqual([
      "single_line",
      "multi_line",
      "email",
      "phone",
      "picklist",
      "multi_select",
      "date",
      "date_time",
      "number",
      "currency",
      "percentage",
      "checkbox",
      "lookup",
      "formula",
      "image",
    ]);
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/data-ff-field-builder/);
    expect(builder).toMatch(/data-ff-builder-columns/);
    expect(builder).toMatch(/onDragStart/);
    expect(builder).toMatch(/FormulaBuilder/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/FieldBuilder/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/DEAL_LAYOUT_LINES/);
  });

  it("builds different default layouts per line of business", () => {
    const home = defaultLayoutForLine("HO");
    const salon = defaultLayoutForLine("GL");
    expect(home.columns).toHaveLength(2);
    expect(salon.columns).toHaveLength(2);
    const homeKeys = home.columns[1].sections.flatMap((section) => section.fieldKeys);
    const salonKeys = salon.columns[1].sections.flatMap((section) => section.fieldKeys);
    expect(homeKeys).toEqual(expect.arrayContaining(["roof_year", "coverage_a"]));
    expect(salonKeys).toEqual(expect.arrayContaining(["legal_name", "class_code", "occupancy"]));
    expect(homeKeys).not.toContain("occupancy");
    expect(defaultFieldsForLine("HO").some((field) => field.type === "formula")).toBe(true);
    expect(defaultFieldsForLine("HO").some((field) => field.type === "image")).toBe(true);
  });

  it("evaluates simple math and field references", () => {
    expect(evaluateFormula("coverage_a * 0.1", { coverage_a: "321000" })).toEqual({
      ok: true,
      value: 32100,
    });
    expect(evaluateFormula("{roof_year} + 1", { roof_year: 2018 })).toEqual({ ok: true, value: 2019 });
    expect(evaluateFormula("(10 + 2) / 4", {})).toEqual({ ok: true, value: 3 });
    expect(evaluateFormula("10 / 0", {}).ok).toBe(false);
    expect(extractFormulaFields("coverage_a * 0.1 + stories")).toEqual(
      expect.arrayContaining(["coverage_a", "stories"]),
    );
  });

  it("adds and relabels sections and moves fields between columns", () => {
    const start = defaultLayoutForLine("HO");
    const withSection = addSection(start, "left", "Extra");
    expect(withSection.columns[0].sections.some((section) => section.label === "Extra")).toBe(true);
    const renamed = relabelSection(withSection, withSection.columns[0].sections.at(-1)!.id, "More");
    expect(renamed.columns[0].sections.some((section) => section.label === "More")).toBe(true);
    const moved = moveField(start, "email", { columnId: "right" });
    expect(moved.columns[1].sections.some((section) => section.fieldKeys.includes("email"))).toBe(true);
    expect(moved.columns[0].sections.every((section) => !section.fieldKeys.includes("email"))).toBe(true);
  });
});
