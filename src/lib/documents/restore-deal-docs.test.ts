import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dealSourceSlotForUpload } from "./restore-deal-docs";
import { isUploadedFile } from "./uploaded-file";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal source document persist", () => {
  it("keeps deal worksheet uploads on source_doc even when a folder exists", () => {
    expect(
      dealSourceSlotForUpload({
        dealId: "deal-1",
        requestedSlot: "",
        docType: "dec",
        hasFolder: true,
      }),
    ).toBe("source_doc");
    expect(
      dealSourceSlotForUpload({
        dealId: "deal-1",
        requestedSlot: "library_file",
        docType: "four_point",
        hasFolder: true,
      }),
    ).toBe("source_doc");
    expect(
      dealSourceSlotForUpload({
        dealId: null,
        requestedSlot: "",
        docType: "dec",
        hasFolder: true,
      }),
    ).toBe("library_file");
  });

  it("accepts File-like FormData parts without instanceof File", () => {
    const like = {
      name: "dec.pdf",
      size: 12,
      arrayBuffer: async () => new ArrayBuffer(12),
    };
    expect(isUploadedFile(like as unknown as File)).toBe(true);
    expect(isUploadedFile("dec.pdf")).toBe(false);
  });

  it("upload + sheet save restore docs and never wipe on save", () => {
    const upload = source("src/app/actions/documents.ts");
    expect(upload).toMatch(/dealSourceSlotForUpload/);
    expect(upload).toMatch(/isUploadedFile/);
    expect(upload).not.toMatch(/resolvedFolder \? "library_file"/);
    expect(source("src/app/actions/quote-sheet.ts")).toMatch(/restoreDealSourceDocuments\(dealId\)/);
    expect(source("src/app/actions/quote-sheet.ts")).not.toMatch(/delete\(documents\)/);
    expect(source("src/lib/db/queries.ts")).toMatch(/restoreDealSourceDocuments\(dealId\)/);
    expect(source("src/lib/documents/restore-deal-docs.ts")).toMatch(/status === "hidden"/);
    expect(source("src/lib/documents/restore-deal-docs.ts")).toMatch(/isNull\(documents\.dealId\)/);
    expect(source("src/components/deal/source-docs-upload.tsx")).toMatch(/name="line"/);
    expect(source("src/components/deal/documents-panel.tsx")).toMatch(/line=\{sheetLine\}/);
  });
});
