import { describe, expect, it } from "vitest";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { anaHomeSheetValues } from "@/lib/quote-sheet/ana-home";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { PHOTO_DEC_TEXT, loadSamplePhotoDecPng } from "@/lib/fixtures/sample-photo-dec";
import { extractFieldsFromText } from "./legacy_extraction/extract-text";
import {
  classifyIngest,
  extractFromImage,
  isHeicUpload,
  isImageUpload,
} from "./ocr";

describe("photo OCR ingest", () => {
  it("classifies photos as the implemented OCR engine and text/PDF as the parser", () => {
    expect(classifyIngest("image/jpeg", "photo-dec.jpg")).toEqual({
      engine: "ocr",
      implemented: true,
    });
    expect(classifyIngest("image/heic", "scan.heic")).toEqual({
      engine: "ocr",
      implemented: true,
    });
    expect(classifyIngest("image/webp", "scan.webp")).toEqual({
      engine: "ocr",
      implemented: true,
    });
    expect(classifyIngest("image/png", "dec.png")).toEqual({
      engine: "ocr",
      implemented: true,
    });
    expect(classifyIngest("application/pdf", "dec.pdf")).toEqual({
      engine: "pdf_text",
      implemented: true,
    });
    expect(
      classifyIngest("image/jpeg", "scan.jpg", Buffer.from("%PDF-1.7\n%\xE2\xE3\xCF\xD3")),
    ).toEqual({
      engine: "pdf_text",
      implemented: true,
    });
    expect(isImageUpload("application/octet-stream", "scan.png")).toBe(true);
    expect(isHeicUpload("image/heic", "iphone.heic")).toBe(true);
  });

  it("maps photo-dec text onto a blank Home sheet as photo-ocr CHECK fields", () => {
    const extracted = extractFieldsFromText(PHOTO_DEC_TEXT);
    const filled = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields, {
      source: "photo-ocr",
    });
    expect(filled.values.named_insured.value).toBe("Luis Vega");
    expect(extracted.fields.find((f) => f.fieldKey === "named_insured")?.normalizedValue).toBe(
      "Luis Vega",
    );
    expect(filled.values.address1.value).toBe("88 Sandpiper Ln");
    expect(filled.values.city.value).toBe("Cocoa Beach");
    expect(filled.values.year_built.value).toBe("2011");
    expect(filled.values.roof_year.value).toBe("2019");
    expect(filled.values.coverage_a.value).toBe("245000");
    expect(filled.values.coverage_a.status).toBe("check");
    expect(filled.values.coverage_a.source).toBe("photo-ocr");
    expect(filled.values.construction.value).toBe("masonry");
    expect(filled.values.square_feet.value).toBe("1840");
    expect(filled.values.hurricane_deductible.value).toBe("2%");
    expect(filled.values.aop_deductible.value).toBe("2500");
    expect(filled.values.year_built.status).toBe("check");
    expect(filled.values.notes.status).toBe("missing");
  });

  it("never overwrites Ana Javy Cov A or invents 321000 from a photo of another house", () => {
    const existing = anaHomeSheetValues(fixture.risk);
    const extracted = extractFieldsFromText(PHOTO_DEC_TEXT);
    const result = applyExtractedToSheet("home", existing, extracted.fields, {
      source: "photo-ocr",
    });
    expect(result.values.coverage_a.value).toBe("321000");
    expect(result.values.coverage_a.source).toBe("javy");
    expect(result.values.coverage_a.status).toBe("confirmed");
    expect(result.skippedKeys).toContain("coverage_a");
    expect(result.values.address1.value).toBe("1098 Adige Ct SE");
  });

  it("does not treat a Zestimate or list price as Coverage A", () => {
    const zestimateOnly = extractFieldsFromText(
      "Zestimate: $418,000\nList price: $399,000\nEstimated market value: $410000",
    );
    expect(zestimateOnly.fields.find((f) => f.fieldKey === "coverage_a")).toBeUndefined();

    const withDec = extractFieldsFromText(
      "Zestimate: $418,000\nCoverage A: $245,000\nList price: $399,000",
    );
    expect(withDec.fields.find((f) => f.fieldKey === "coverage_a")?.normalizedValue).toBe(
      "245000",
    );
  });

  it(
    "OCRs the in-repo fixture image; archived map still works on OCR text",
    { timeout: 60_000 },
    async () => {
      const ocr = await extractFromImage(
        loadSamplePhotoDecPng(),
        "sample-photo-dec.png",
        "image/png",
      );
      expect(ocr.status).toBe("done");
      expect(ocr.text).toMatch(/Luis Vega/i);
      // Fill from source uses Gemini; archived synonym map is intentional here only.
      const extracted = extractFieldsFromText(ocr.text);
      const byKey = Object.fromEntries(extracted.fields.map((f) => [f.fieldKey, f]));
      expect(byKey.named_insured.normalizedValue).toBe("Luis Vega");
      expect(byKey.year_built.normalizedValue).toBe("2011");
      expect(byKey.roof_year.normalizedValue).toBe("2019");
      expect(byKey.coverage_a.normalizedValue).toBe("245000");
      expect(byKey.construction.normalizedValue).toBe("masonry");
      expect(byKey.square_feet.normalizedValue).toBe("1840");
      expect(byKey.hurricane_deductible.normalizedValue).toBe("2%");
      expect(byKey.aop_deductible.normalizedValue).toBe("2500");

      const filled = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields, {
        source: "photo-ocr",
      });
      expect(filled.values.coverage_a.source).toBe("photo-ocr");
      expect(filled.values.coverage_a.value).toBe("245000");
    },
  );
});
