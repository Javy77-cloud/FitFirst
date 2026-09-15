import { describe, expect, it } from "vitest";
import {
  DEC_COVERAGE_MISS_KEYS,
  DEC_COVERAGE_TARGET_KEYS,
  FRANCISCO_GARCIA_DEC_TEXT,
} from "@/lib/fixtures/sample-francisco-garcia-dec";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { anaHomeSheetValues } from "@/lib/quote-sheet/ana-home";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { extractFieldsFromText } from "./legacy_extraction/extract-text";

describe("dec extraction coverage vs the 12-field miss", () => {
  it("maps a full Francisco Garcia dec onto 24+ Home Quote Sheet fields", () => {
    const extracted = extractFieldsFromText(FRANCISCO_GARCIA_DEC_TEXT);
    const filled = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields, {
      source: "photo-ocr",
    });
    const landed = DEC_COVERAGE_TARGET_KEYS.filter(
      (key) => filled.values[key]?.status === "check" && filled.values[key].value.trim() !== "",
    );

    expect(landed.length).toBeGreaterThanOrEqual(24);
    expect(landed.length).toBeGreaterThan(12);
    for (const key of DEC_COVERAGE_MISS_KEYS) {
      expect(landed, `missed ${key} that the 12-field pass dropped`).toContain(key);
    }

    expect(filled.values.named_insured.value).toBe("Francisco Garcia");
    expect(filled.values.secondary_named_insured.value).toBe("Javier Garcia");
    expect(filled.values.mailing_address.value).toMatch(/2140 Tropic Breeze/);
    expect(filled.values.ordinance_or_law.value).toBe("25%");
    expect(filled.values.water_backup.value).toBe("$5,000");
    expect(filled.values.address1.value).toBe("2140 Tropic Breeze Ave");
    expect(filled.values.city.value).toBe("Melbourne");
    expect(filled.values.current_carrier.value).toMatch(/Citizens/i);
    expect(filled.values.policy_number.value).toBe("FG-HO3-2026-4411");
    expect(filled.values.form).toBeUndefined();
    expect(filled.values.effective_date.value).toBe("03/01/2026");
    expect(filled.values.expiration_date.value).toBe("03/01/2027");
    expect(filled.values.coverage_a.value).toBe("280000");
    expect(filled.values.coverage_b.value).toBe("28000");
    expect(filled.values.coverage_c.value).toBe("140000");
    expect(filled.values.coverage_d.value).toBe("56000");
    expect(filled.values.coverage_e.value).toBe("300000");
    expect(filled.values.coverage_f.value).toBe("2000");
    expect(filled.values.year_built.value).toBe("1998");
    expect(filled.values.roof_year.value).toBe("2018");
    expect(filled.values.roof_covering.value).toBe("Asphalt/Fiberglass Shingle");
    expect(filled.values.roof_shape.value).toBe("hip");
    expect(filled.values.occupancy.value).toBe("Owner");
    expect(filled.values.construction.value).toBe("masonry");
    expect(filled.values.current_premium.value).toBe("4200");
    expect(filled.values.coverage_a.source).toBe("photo-ocr");
  });

  it("never invents SSN or claims and never uses a Zestimate as Cov A", () => {
    const extracted = extractFieldsFromText(FRANCISCO_GARCIA_DEC_TEXT);
    const blob = extracted.fields.map((f) => `${f.fieldKey}:${f.normalizedValue}`).join(" | ");
    expect(blob).not.toMatch(/123-45-6789/);
    expect(blob).not.toMatch(/CLM-999/);
    expect(extracted.fields.some((f) => /ssn|social|claim/i.test(f.fieldKey))).toBe(false);
    expect(extracted.fields.find((f) => f.fieldKey === "coverage_a")?.normalizedValue).toBe(
      "280000",
    );
    expect(extracted.fields.find((f) => f.normalizedValue === "410000")).toBeUndefined();
  });

  it("never overwrites Ana Javy Cov A 321000 from a Garcia dec", () => {
    const existing = anaHomeSheetValues(fixture.risk);
    const extracted = extractFieldsFromText(FRANCISCO_GARCIA_DEC_TEXT);
    const result = applyExtractedToSheet("home", existing, extracted.fields, {
      source: "photo-ocr",
    });
    expect(result.values.coverage_a.value).toBe("321000");
    expect(result.values.coverage_a.source).toBe("javy");
    expect(result.skippedKeys).toContain("coverage_a");
  });

  it("prefers a dec/photo value over a public-records gap-fill", () => {
    const existing = emptySheetValues("home");
    existing.year_built = { value: "1970", status: "check", source: "public-records" };
    existing.coverage_a = { value: "321000", status: "confirmed", source: "javy" };
    const extracted = extractFieldsFromText(FRANCISCO_GARCIA_DEC_TEXT);
    const result = applyExtractedToSheet("home", existing, extracted.fields, {
      source: "photo-ocr",
    });
    expect(result.values.year_built.value).toBe("1998");
    expect(result.values.year_built.source).toBe("photo-ocr");
    expect(result.values.coverage_a.value).toBe("321000");
    expect(result.values.coverage_a.source).toBe("javy");
  });
});
