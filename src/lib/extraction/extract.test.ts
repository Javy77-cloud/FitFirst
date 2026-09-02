import { describe, expect, it } from "vitest";
import { CONFIDENCE_THRESHOLD } from "@/lib/domain";
import { CLEAN_DEC_TEXT, MESSY_WIND_MIT_TEXT } from "@/lib/fixtures/sample-docs";
import { extractFieldsFromText } from "./extract";

describe("document extraction confidence", () => {
  it("extracts a clean dec with high confidence and no glance flags", () => {
    const result = extractFieldsFromText(CLEAN_DEC_TEXT);
    expect(result.documentQuality).toBe("clean");
    expect(result.glanceRequired).toBe(false);

    const byKey = Object.fromEntries(result.fields.map((f) => [f.fieldKey, f]));
    expect(byKey.year_built.normalizedValue).toBe("1989");
    expect(byKey.coverage_a.normalizedValue).toBe("321000");
    expect(byKey.city.normalizedValue).toBe("Palm Bay");
    expect(byKey.county.normalizedValue).toBe("Brevard");
    expect(byKey.roof_covering.normalizedValue).toContain("clay tile");
    expect(byKey.opening_protection.normalizedValue).toBe("none");
    expect(byKey.miles_to_coast.normalizedValue).toBe("8");
    expect(byKey.year_built.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
    expect(result.fields.every((f) => !f.flagged)).toBe(true);
  });

  it("flags messy handwriting / OCR on a wind mit for a 30-second glance", () => {
    const result = extractFieldsFromText(MESSY_WIND_MIT_TEXT);
    expect(result.documentQuality).toBe("messy");
    expect(result.glanceRequired).toBe(true);

    const year = result.fields.find((f) => f.fieldKey === "year_built");
    expect(year).toBeTruthy();
    expect(year!.rawValue.toLowerCase()).toContain("1q89");
    expect(year!.normalizedValue).toBe("1989");
    expect(year!.confidence).toBeLessThan(CONFIDENCE_THRESHOLD);
    expect(year!.flagged).toBe(true);

    const roof = result.fields.find((f) => f.fieldKey === "roof_covering");
    expect(roof?.flagged).toBe(true);
    expect(roof?.normalizedValue).toContain("clay tile");

    const openings = result.fields.find((f) => f.fieldKey === "opening_protection");
    expect(openings?.normalizedValue).toBe("none");
    expect(openings?.flagged).toBe(true);
  });

  it("does not auto-trust a field just because a label was found", () => {
    const result = extractFieldsFromText(
      "[HANDWRITTEN] Year Built: 1q89?\nRoof covering: clay t1le",
    );
    const flagged = result.fields.filter((f) => f.flagged);
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged.every((f) => f.confidence < CONFIDENCE_THRESHOLD)).toBe(true);
  });
});
