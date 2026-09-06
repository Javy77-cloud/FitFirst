import { describe, expect, it } from "vitest";
import {
  clearExtractedSheetCells,
  deleteUploadedFileSubject,
  uploadedFileDeleteMode,
  visibleUploadedFiles,
} from "./delete-file";

describe("uploadedFileDeleteMode", () => {
  it("hard-deletes deal source docs and quote PDFs", () => {
    expect(uploadedFileDeleteMode({ slot: "source_doc", docType: "dec" })).toBe("hard");
    expect(uploadedFileDeleteMode({ slot: "source_doc", docType: "four_point" })).toBe("hard");
    expect(uploadedFileDeleteMode({ slot: "source_doc", docType: "wind_mit" })).toBe("hard");
    expect(uploadedFileDeleteMode({ slot: "quote_pdf", docType: "quote_pdf" })).toBe("hard");
    expect(uploadedFileDeleteMode({ slot: "library_file", docType: "acord" })).toBe("hard");
  });

  it("hides issued policy files for retention", () => {
    expect(uploadedFileDeleteMode({ slot: "policy_file", docType: "policy_dec" })).toBe("hide");
    expect(uploadedFileDeleteMode({ slot: "policy_file", docType: "other" })).toBe("hide");
    expect(uploadedFileDeleteMode({ slot: "source_doc", docType: "policy_complete" })).toBe("hide");
  });
});

describe("deleteUploadedFileSubject", () => {
  it("names the file for the double confirm", () => {
    expect(deleteUploadedFileSubject("wind-mit.pdf", "hard")).toBe('the file “wind-mit.pdf”');
    expect(deleteUploadedFileSubject("issued-dec.pdf", "hide")).toMatch(/issued policy file/);
    expect(deleteUploadedFileSubject("issued-dec.pdf", "hide")).toMatch(/retention/);
  });
});

describe("visibleUploadedFiles", () => {
  it("drops hidden rows so the UI list updates", () => {
    const rows = visibleUploadedFiles([
      { id: "a", status: "uploaded" },
      { id: "b", status: "hidden" },
      { id: "c", status: "extracted" },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["a", "c"]);
  });
});

describe("clearExtractedSheetCells", () => {
  it("clears extract/photo cells and leaves typed and Javy values", () => {
    const next = clearExtractedSheetCells({
      year_built: { value: "1998", status: "confirmed", source: "extracted" },
      roof_year: { value: "2012", status: "check", source: "photo-ocr" },
      coverage_a: { value: "425000", status: "confirmed", source: "javy" },
      notes: { value: "typed", status: "confirmed", source: "agent" },
    });
    expect(next.year_built).toEqual({ value: "", status: "missing", source: "blank" });
    expect(next.roof_year).toEqual({ value: "", status: "missing", source: "blank" });
    expect(next.coverage_a).toEqual({ value: "425000", status: "confirmed", source: "javy" });
    expect(next.notes).toEqual({ value: "typed", status: "confirmed", source: "agent" });
  });
});
