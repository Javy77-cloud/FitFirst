import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dealSourceSlotForUpload } from "./restore-deal-docs";
import { collectUploadedFiles, isUploadedFile } from "./uploaded-file";

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
    expect(isUploadedFile({ name: "dec.pdf", arrayBuffer: async () => new ArrayBuffer(8) } as unknown as File)).toBe(
      true,
    );
  });

  it("collects files_0 parts by reading bytes, not instanceof File", async () => {
    const form = new FormData();
    form.set("dealId", "5ed997ba-21b5-4a70-bdf8-c78810cc79b1");
    form.set("docType_0", "dec");
    form.append(
      "files_0",
      new File([Uint8Array.from([37, 80, 68, 70])], "heather-dec.pdf", { type: "application/pdf" }),
    );
    const collected = await collectUploadedFiles(form);
    expect(collected).toHaveLength(1);
    expect(collected[0]?.filename).toBe("heather-dec.pdf");
    expect(collected[0]?.index).toBe(0);
    expect(collected[0]?.bytes.length).toBe(4);
  });

  it("collects one upload per files_N slot when several files are attached", async () => {
    const form = new FormData();
    form.set("rowCount", "4");
    for (const [index, name] of ["a.pdf", "b.pdf", "c.pdf", "d.pdf"].entries()) {
      form.set(`docType_${index}`, "photo");
      form.append(
        `files_${index}`,
        new File([Uint8Array.from([37, 80, 68, 70, index])], name, { type: "application/pdf" }),
      );
    }
    const collected = await collectUploadedFiles(form);
    expect(collected).toHaveLength(4);
    expect(collected.map((row) => row.filename)).toEqual(["a.pdf", "b.pdf", "c.pdf", "d.pdf"]);
    expect(collected.map((row) => row.index)).toEqual([0, 1, 2, 3]);
  });

  it("upload + sheet save restore docs and never wipe on save", () => {
    const upload = source("src/app/actions/documents.ts");
    expect(upload).toMatch(/dealSourceSlotForUpload/);
    expect(upload).toMatch(/persistDealSourceUploads/);
    expect(upload).toMatch(/collectUploadedFiles/);
    expect(upload).toMatch(/Nothing else was changed/);
    expect(upload).not.toMatch(/resolvedFolder \? "library_file"/);
    expect(source("src/app/actions/quote-sheet.ts")).toMatch(/restoreDealSourceDocuments\(dealId\)/);
    expect(source("src/app/actions/quote-sheet.ts")).not.toMatch(/delete\(documents\)/);
    expect(source("src/lib/files/object-store.ts")).toMatch(/fitfirst-uploads/);
    expect(source("src/lib/db/queries.ts")).toMatch(/restoreDealSourceDocuments\(dealId\)/);
    expect(source("src/lib/documents/restore-deal-docs.ts")).toMatch(/status === "hidden"/);
    expect(source("src/lib/documents/restore-deal-docs.ts")).toMatch(/isNull\(documents\.dealId\)/);
    expect(source("src/components/deal/source-docs-upload.tsx")).toMatch(/name="line"/);
    expect(source("src/components/deal/documents-panel.tsx")).toMatch(/line=\{sheetLine\}/);
  });
});
