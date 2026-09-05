import { describe, expect, it } from "vitest";
import { CONFIDENCE_THRESHOLD } from "@/lib/domain";
import { CLEAN_DEC_TEXT, MESSY_WIND_MIT_TEXT } from "@/lib/fixtures/sample-docs";
import { GARCIA_AUTO_DEC_TEXT, GARCIA_DEC_TEXT } from "@/lib/fixtures/sample-garcia-dec";
import { PHOTO_DEC_TEXT } from "@/lib/fixtures/sample-photo-dec";
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
    expect(byKey.protection_class.normalizedValue).toBe("3");
    expect(byKey.address.normalizedValue).toContain("1098 Adige");
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

  it("maps a full HO3 dec page — not a 12-field subset", () => {
    const result = extractFieldsFromText(GARCIA_DEC_TEXT);
    const keys = result.fields.map((f) => f.fieldKey);
    expect(keys.length).toBeGreaterThanOrEqual(30);
    for (const key of [
      "named_insured",
      "address",
      "year_built",
      "square_feet",
      "beds",
      "coverage_a",
      "coverage_b",
      "coverage_c",
      "coverage_d",
      "hurricane_deductible",
      "aop_deductible",
      "policy_number",
      "form",
      "current_carrier",
      "current_premium",
      "effective_date",
      "roof_shape",
      "flood_zone",
    ]) {
      expect(keys).toContain(key);
    }
    const byKey = Object.fromEntries(result.fields.map((f) => [f.fieldKey, f]));
    expect(byKey.coverage_a.normalizedValue).toBe("285000");
    expect(byKey.named_insured.normalizedValue).toMatch(/Francisco Javier Garcia/i);
    expect(keys).not.toContain("ssn");
  });

  it("maps an auto dec onto vehicle and coverage keys", () => {
    const result = extractFieldsFromText(GARCIA_AUTO_DEC_TEXT);
    const keys = result.fields.map((f) => f.fieldKey);
    expect(keys).toEqual(
      expect.arrayContaining(["vin", "vehicle_year", "vehicle_make", "vehicle_model", "liability_bi", "pip"]),
    );
  });

  it("never extracts an SSN even when the page has one", () => {
    const result = extractFieldsFromText("Named Insured: Test\nSSN: 123-45-6789\nYear Built: 1990");
    expect(result.fields.some((f) => /ssn|123-45-6789/.test(f.fieldKey + f.normalizedValue))).toBe(
      false,
    );
    expect(result.fields.find((f) => f.fieldKey === "year_built")?.normalizedValue).toBe("1990");
  });

  it("does not auto-trust a field just because a label was found", () => {
    const result = extractFieldsFromText(
      "[HANDWRITTEN] Year Built: 1q89?\nRoof covering: clay t1le",
    );
    const flagged = result.fields.filter((f) => f.flagged);
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged.every((f) => f.confidence < CONFIDENCE_THRESHOLD)).toBe(true);
  });

  it("maps dwelling-limit and spaced Cov A money after OCR cleanup", () => {
    const result = extractFieldsFromText(
      "Named Insured: Maya Chen\nBuilt in 2001\nDwelling Limit $ 275 , 000\nCity: Titusville",
    );
    const byKey = Object.fromEntries(result.fields.map((f) => [f.fieldKey, f]));
    expect(byKey.coverage_a.normalizedValue).toBe("275000");
    expect(byKey.year_built.normalizedValue).toBe("2001");
    expect(byKey.named_insured.normalizedValue).toBe("Maya Chen");
  });

  it("reads named insured, premises, deductibles from a photo-dec transcript", () => {
    const result = extractFieldsFromText(PHOTO_DEC_TEXT);
    const byKey = Object.fromEntries(result.fields.map((f) => [f.fieldKey, f]));
    expect(byKey.named_insured.normalizedValue).toBe("Luis Vega");
    expect(byKey.address.normalizedValue).toBe("88 Sandpiper Ln");
    expect(byKey.year_built.normalizedValue).toBe("2011");
    expect(byKey.coverage_a.normalizedValue).toBe("245000");
    expect(byKey.hurricane_deductible.normalizedValue).toBe("2%");
    expect(byKey.aop_deductible.normalizedValue).toBe("2500");
  });
});
