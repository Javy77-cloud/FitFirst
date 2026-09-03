import { describe, expect, it } from "vitest";
import { classifyIngest, extractFromImage, isImageUpload, PHOTO_OCR_NEXT_SLICE } from "./ocr";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { extractFieldsFromText } from "./extract";
import { MELBOURNE_DEC_TEXT } from "@/lib/fixtures/sample-melbourne-dec";

describe("image OCR stub", () => {
  it("returns not_implemented and never invents fields", () => {
    const result = extractFromImage(Buffer.from("fake"), "wind-mit-photo.jpg");
    expect(result.status).toBe("not_implemented");
    expect(result.fields).toEqual([]);
    expect(result.message).toMatch(/not_implemented/i);
    expect(result.message).toContain(PHOTO_OCR_NEXT_SLICE);
  });

  it("classifies photos as the OCR hook and text/PDF as the real parser", () => {
    expect(classifyIngest("image/jpeg", "photo-dec.jpg")).toEqual({
      engine: "ocr",
      implemented: false,
    });
    expect(classifyIngest("application/pdf", "dec.pdf")).toEqual({
      engine: "pdf_text",
      implemented: true,
    });
    expect(isImageUpload("application/octet-stream", "scan.png")).toBe(true);
  });

  it("does not block Fill: a photo job stays stubbed while a text dec still fills blanks", () => {
    const photo = classifyIngest("image/jpeg", "photo-a-dec.jpg");
    expect(photo.implemented).toBe(false);
    const ocr = extractFromImage(Buffer.from("pixels"), "photo-a-dec.jpg");
    expect(ocr.fields).toEqual([]);

    const extracted = extractFieldsFromText(MELBOURNE_DEC_TEXT);
    const filled = applyExtractedToSheet("home", emptySheetValues("home"), extracted.fields);
    expect(filled.values.year_built.value).toBe("2004");
    expect(filled.values.coverage_a.value).toBe("275000");
    expect(filled.values.address1.value).toBe("412 Harbor Isle Dr");
  });
});
