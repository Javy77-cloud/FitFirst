import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ESSENTIAL_ADDRESS_KEYS,
  ESSENTIAL_CONTACT_KEYS,
  defaultFieldsForLine,
  defaultLayoutForLine,
} from "./defaults";
import { evaluateFormula, extractFormulaFields } from "./formula";
import { addSection, moveField, relabelSection } from "./layout";
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS } from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal field builder", () => {
  it("exposes every Javy field type on a drag palette, two columns, and a per-LOB save", () => {
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
    expect(CUSTOM_FIELD_TYPE_LABELS.image).toBe("Image upload");
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/data-ff-field-builder/);
    expect(builder).toMatch(/data-ff-builder-columns/);
    expect(builder).toMatch(/data-ff-builder-palette/);
    expect(builder).toMatch(/data-ff-palette-type/);
    expect(builder).toMatch(/kind: "type"/);
    expect(builder).toMatch(/onDragStart/);
    expect(builder).toMatch(/FormulaBuilder/);
    expect(builder).toMatch(/data-ff-save-layout/);
    expect(builder).toMatch(/>Save</);
    expect(builder).toMatch(/Add section/);
    expect(builder).toMatch(/data-ff-section-label/);
    expect(builder).toMatch(/data-ff-field-label/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/FieldBuilder/);
    expect(source("src/app/settings/field-builder/page.tsx")).toMatch(/DEAL_LAYOUT_LINES/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/saveDealFieldLayout/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/upsertFieldDef/);
  });

  it("defaults every line of business to Contact essentials + Address only", () => {
    const home = defaultLayoutForLine("HO");
    const salon = defaultLayoutForLine("GL");
    expect(home.columns).toHaveLength(2);
    expect(salon.columns).toHaveLength(2);
    const homeKeys = home.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
    const salonKeys = salon.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
    expect(homeKeys).toEqual([...ESSENTIAL_CONTACT_KEYS, ...ESSENTIAL_ADDRESS_KEYS]);
    expect(salonKeys).toEqual(homeKeys);
    expect(homeKeys).not.toContain("roof_year");
    expect(homeKeys).not.toContain("occupancy");
    expect(home.columns[0].sections.map((section) => section.label)).toEqual(["Contact"]);
    expect(home.columns[1].sections.map((section) => section.label)).toEqual(["Address"]);
  });

  it("keeps LOB field catalogs so the builder can add them later", () => {
    expect(defaultFieldsForLine("HO").map((field) => field.key)).toEqual(
      expect.arrayContaining(["roof_year", "coverage_a", "roof_photo"]),
    );
    expect(defaultFieldsForLine("GL").map((field) => field.key)).toEqual(
      expect.arrayContaining(["legal_name", "class_code", "occupancy"]),
    );
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
