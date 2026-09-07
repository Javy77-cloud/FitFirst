import { describe, expect, it } from "vitest";
import { looksLikeImageBuffer, looksLikePdf } from "@/lib/files/urls";
import { FRANCISCO_GARCIA_DEC_TEXT } from "@/lib/fixtures/sample-francisco-garcia-dec";
import { MELBOURNE_FOUR_POINT_TEXT, MELBOURNE_WIND_MIT_TEXT } from "@/lib/fixtures/sample-docs";
import { PHOTO_DEC_TEXT } from "@/lib/fixtures/sample-photo-dec";
import { TINY_PNG, buildImageOnlyPdf, buildTextLayerPdf } from "@/lib/fixtures/build-pdf";
import { applyExtractedToSheet } from "@/lib/quote-sheet/apply";
import { HOME_FIELDS, emptySheetValues } from "@/lib/quote-sheet/catalog";
import { extractFieldsFromText } from "./extract";
import { extractFromImage, recognizeImageText } from "./ocr";
import { isPdfUpload, pdfTextLooksEmpty, readUploadText } from "./pdf";
import { extractTextWithPdfjs, rasterizePdfPages, rasterizeWithPdfjs } from "./pdf-raster";

async function drawPhotoDecPng(): Promise<Buffer> {
  const { createCanvas } = await import("@napi-rs/canvas");
  const canvas = createCanvas(1400, 1800);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1400, 1800);
  ctx.fillStyle = "#111111";
  ctx.font = "32px sans-serif";
  let y = 64;
  for (const line of PHOTO_DEC_TEXT.split("\n")) {
    ctx.fillText(line, 48, y);
    y += 40;
  }
  return Buffer.from(canvas.toBuffer("image/png"));
}

describe("PDF ingest robustness", () => {
  it("treats page-number-only scans as empty", () => {
    expect(pdfTextLooksEmpty("")).toBe(true);
    expect(pdfTextLooksEmpty("1\n2\n3\n")).toBe(true);
    expect(pdfTextLooksEmpty("Page 1 of 2")).toBe(true);
    expect(
      pdfTextLooksEmpty("HOMEOWNERS DECLARATIONS\nCoverage A Dwelling: $321,000"),
    ).toBe(false);
  });

  it("classifies PDF by mime, extension, or %PDF magic", () => {
    expect(isPdfUpload("application/pdf", "dec.pdf")).toBe(true);
    expect(isPdfUpload("application/octet-stream", "wind-mit.PDF")).toBe(true);
    expect(isPdfUpload("image/jpeg", "photo.jpg")).toBe(false);
    expect(looksLikePdf(Buffer.from("%PDF-1.7\n"))).toBe(true);
    expect(isPdfUpload("image/jpeg", "scan.jpg", Buffer.from("%PDF-1.4\n%"))).toBe(true);
    expect(looksLikeImageBuffer(TINY_PNG)).toBe(true);
  });

  it("rejects raw PDF bytes in the image OCR helpers", async () => {
    const pdf = await buildTextLayerPdf("HO Dec", "Named Insured: Test\nYear Built: 1990");
    expect(looksLikePdf(pdf)).toBe(true);
    await expect(recognizeImageText(pdf)).rejects.toThrow(/Rasterize pages first/i);
    const blocked = await extractFromImage(pdf, "dec.pdf", "application/pdf");
    expect(blocked.status).toBe("failed");
    expect(blocked.text).toBe("");
    expect(blocked.message).toMatch(/Rasterize pages first/i);
  });

  it("extracts and rasterizes through in-process pdfjs (no poppler required)", async () => {
    const pdf = await buildTextLayerPdf(
      "HO",
      "Named Insured: Ada Lopez\nCoverage A Dwelling: $321,000\nYear Built: 1991",
    );
    const text = await extractTextWithPdfjs(pdf);
    expect(text).toMatch(/Ada Lopez/);
    expect(text).toMatch(/321,000/);
    const pages = await rasterizeWithPdfjs(pdf);
    expect(pages.length).toBe(1);
    expect(looksLikePdf(pages[0])).toBe(false);
    expect(looksLikeImageBuffer(pages[0])).toBe(true);
  });

  it("reads a text-layer PDF into Quote Sheet fields without Tesseract", async () => {
    const pdf = await buildTextLayerPdf("HO Declarations", FRANCISCO_GARCIA_DEC_TEXT);
    const uploaded = await readUploadText(pdf, "application/pdf", "former-dec.pdf");
    expect(uploaded.engine).toBe("pdf_text");
    expect(uploaded.emptyScan).toBe(false);
    expect(uploaded.text).toMatch(/Francisco Garcia/i);
    expect(uploaded.text).toMatch(/280,?000/);
    const extracted = extractFieldsFromText(uploaded.text);
    expect(extracted.fields.find((f) => f.fieldKey === "named_insured")?.normalizedValue).toMatch(
      /Francisco Garcia/i,
    );
    expect(extracted.fields.find((f) => f.fieldKey === "coverage_a")?.normalizedValue).toBe("280000");
  });

  it(
    "rasterizes an image-only PDF to PNG pages and OCRs those images, never raw PDF",
    { timeout: 90_000 },
    async () => {
      const png = await drawPhotoDecPng();
      const pdf = await buildImageOnlyPdf(png);
      expect(looksLikePdf(pdf)).toBe(true);
      const pages = await rasterizePdfPages(pdf);
      expect(pages.length).toBeGreaterThanOrEqual(1);
      for (const page of pages) {
        expect(looksLikePdf(page)).toBe(false);
        expect(looksLikeImageBuffer(page)).toBe(true);
      }

      const uploaded = await readUploadText(pdf, "application/pdf", "scanned-dec.pdf");
      expect(uploaded.emptyScan).toBe(false);
      expect(uploaded.engine).toBe("ocr");
      expect(uploaded.text).toMatch(/Luis Vega/i);
      const extracted = extractFieldsFromText(uploaded.text);
      expect(extracted.fields.find((f) => f.fieldKey === "named_insured")?.normalizedValue).toMatch(
        /Luis Vega/i,
      );
      expect(extracted.fields.find((f) => f.fieldKey === "coverage_a")?.normalizedValue).toBe(
        "245000",
      );
    },
  );

  it(
    "OCRs an image upload into mapped fields",
    { timeout: 90_000 },
    async () => {
      const png = await drawPhotoDecPng();
      const uploaded = await readUploadText(png, "image/png", "phone-dec.png");
      expect(uploaded.engine).toBe("ocr");
      const extracted = extractFieldsFromText(uploaded.text);
      expect(extracted.fields.find((f) => f.fieldKey === "named_insured")?.normalizedValue).toBe(
        "Luis Vega",
      );
      expect(extracted.fields.find((f) => f.fieldKey === "coverage_a")?.normalizedValue).toBe(
        "245000",
      );
    },
  );
});

describe("dec + 4-point + wind mit packet → HO master form", () => {
  it("fills the majority of Home Quote Sheet fields from three text-layer PDFs", async () => {
    const decPdf = await buildTextLayerPdf("Former declarations", FRANCISCO_GARCIA_DEC_TEXT);
    const fourPdf = await buildTextLayerPdf("4-point inspection", MELBOURNE_FOUR_POINT_TEXT);
    const windPdf = await buildTextLayerPdf("Wind mitigation", MELBOURNE_WIND_MIT_TEXT);

    const docs = [
      { buffer: decPdf, name: "former-dec.pdf" },
      { buffer: fourPdf, name: "4-point.pdf" },
      { buffer: windPdf, name: "wind-mit.pdf" },
    ];

    let values = emptySheetValues("home");
    const allKeys = new Set<string>();
    for (const doc of docs) {
      const uploaded = await readUploadText(doc.buffer, "application/pdf", doc.name);
      expect(uploaded.engine).toBe("pdf_text");
      expect(uploaded.emptyScan).toBe(false);
      const extracted = extractFieldsFromText(uploaded.text);
      const applied = applyExtractedToSheet("home", values, extracted.fields);
      values = applied.values;
      for (const field of extracted.fields) allKeys.add(field.fieldKey);
    }

    const extractable = HOME_FIELDS.filter((field) => field.key !== "notes" && field.extractKey);
    const filled = extractable.filter((field) => {
      const cell = values[field.key];
      return Boolean(cell?.value.trim()) && cell.status !== "missing";
    });

    expect(filled.length).toBeGreaterThan(extractable.length / 2);
    expect(filled.length).toBeGreaterThanOrEqual(24);
    expect(values.named_insured.value).toMatch(/Francisco Garcia/i);
    expect(values.coverage_a.value).toBe("280000");
    expect(values.four_point_date.value).toBe("03/12/2026");
    expect(values.four_point_result.value.toLowerCase()).toContain("pass");
    expect(values.wind_mit_form.value).toMatch(/OIR-B1-1802/i);
    expect(values.year_built.value).toBe("1998");
    expect(values.roof_year.value).toBe("2018");
    expect(allKeys.has("coverage_a")).toBe(true);
  });
});
