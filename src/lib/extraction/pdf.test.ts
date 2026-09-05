import { describe, expect, it } from "vitest";
import { isPdfUpload, pdfTextLooksEmpty } from "./pdf";

describe("PDF ingest robustness", () => {
  it("treats page-number-only scans as empty", () => {
    expect(pdfTextLooksEmpty("")).toBe(true);
    expect(pdfTextLooksEmpty("1\n2\n3\n")).toBe(true);
    expect(pdfTextLooksEmpty("Page 1 of 2")).toBe(true);
    expect(
      pdfTextLooksEmpty("HOMEOWNERS DECLARATIONS\nCoverage A Dwelling: $321,000"),
    ).toBe(false);
  });

  it("classifies PDF by mime or extension", () => {
    expect(isPdfUpload("application/pdf", "dec.pdf")).toBe(true);
    expect(isPdfUpload("application/octet-stream", "wind-mit.PDF")).toBe(true);
    expect(isPdfUpload("image/jpeg", "photo.jpg")).toBe(false);
  });
});
