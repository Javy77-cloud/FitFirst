import { describe, expect, it } from "vitest";
import { extractFieldsFromText } from "./legacy_extraction/extract-text";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { MELBOURNE_FOUR_POINT_TEXT, MELBOURNE_WIND_MIT_TEXT } from "@/lib/fixtures/sample-docs";

describe("HO source docs map onto the master sheet", () => {
  it("fills 4-point date and result from a 4-point inspection", () => {
    const extracted = extractFieldsFromText(MELBOURNE_FOUR_POINT_TEXT);
    const keys = extracted.fields.map((field) => field.fieldKey);
    expect(keys).toEqual(expect.arrayContaining(["four_point_date", "four_point_result", "year_built"]));
    const result = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields);
    expect(result.values.four_point_date.value).toBe("03/12/2026");
    expect(result.values.four_point_result.value.toLowerCase()).toContain("pass");
    expect(result.values.year_built.value).toBe("2014");
    expect(result.values.coverage_a.value).toBe("");
  });

  it("fills wind mit form and roof fields without inventing Cov A", () => {
    const extracted = extractFieldsFromText(MELBOURNE_WIND_MIT_TEXT);
    const result = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields);
    expect(result.values.wind_mit_form.value).toMatch(/OIR-B1-1802/i);
    expect(result.values.roof_covering.value.toLowerCase()).toContain("shingle");
    expect(result.values.opening_protection.value).toBe("full");
    expect(result.values.coverage_a.value).toBe("");
    expect(result.values.coverage_a.status).toBe("missing");
    expect(result.values.form).toBeUndefined();
  });
});
