import { describe, expect, it } from "vitest";
import {
  clearExtractedSheetCells,
  clearExtractedSheetCellsFromDoc,
  deleteUploadedFileSubject,
  documentDeleteReturnHref,
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

describe("clearExtractedSheetCellsFromDoc", () => {
  it("clears only cells that cite the deleted filename", () => {
    const next = clearExtractedSheetCellsFromDoc(
      {
        coverage_a: {
          value: "425000",
          status: "check",
          source: "extracted",
          sourceLabel: "Jennifer Brooks Tower Hilll HO3 Dec Page.pdf",
        },
        roof_shape: {
          value: "Hip",
          status: "check",
          source: "extracted",
          sourceLabel: "Don Myler wind mitigation.pdf",
        },
        notes: { value: "typed", status: "confirmed", source: "agent" },
      },
      "Jennifer Brooks Tower Hilll HO3 Dec Page.pdf",
    );
    expect(next.coverage_a).toEqual({ value: "", status: "missing", source: "blank" });
    expect(next.roof_shape?.value).toBe("Hip");
    expect(next.notes?.value).toBe("typed");
  });
});


describe("documentDeleteReturnHref", () => {
  it("always prefers policy Documents over deal returnTo", () => {
    expect(
      documentDeleteReturnHref({
        policyId: "779ad733-1bc2-4729-8ed1-80208f600121",
        dealId: "bc96afba-3443-4585-ae74-40dcc274fc63",
        returnTo: "/deals/bc96afba-3443-4585-ae74-40dcc274fc63?tab=documents",
      }),
    ).toBe("/policies/779ad733-1bc2-4729-8ed1-80208f600121?tab=documents");
  });

  it("uses safe returnTo when no policyId", () => {
    expect(
      documentDeleteReturnHref({
        dealId: "bc96afba-3443-4585-ae74-40dcc274fc63",
        returnTo: "/deals/bc96afba-3443-4585-ae74-40dcc274fc63?tab=documents",
      }),
    ).toBe("/deals/bc96afba-3443-4585-ae74-40dcc274fc63?tab=documents");
  });

  it("falls back to deal Documents when returnTo empty", () => {
    expect(
      documentDeleteReturnHref({
        dealId: "bc96afba-3443-4585-ae74-40dcc274fc63",
        returnTo: "",
      }),
    ).toBe("/deals/bc96afba-3443-4585-ae74-40dcc274fc63?tab=documents");
  });

  it("rejects protocol-relative returnTo", () => {
    expect(
      documentDeleteReturnHref({
        dealId: "bc96afba-3443-4585-ae74-40dcc274fc63",
        returnTo: "//evil.example",
      }),
    ).toBe("/deals/bc96afba-3443-4585-ae74-40dcc274fc63?tab=documents");
  });
});
