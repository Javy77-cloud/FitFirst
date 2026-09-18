import { describe, expect, it } from "vitest";
import {
  appendUploadRowFiles,
  applyPickedFilesToRows,
  buildDealDocumentRowForm,
  emptyUploadRow,
  filesToSave,
  uploadRowsHaveFiles,
  uploadRowsTotalBytes,
} from "./upload-rows";

function file(name: string): File {
  return new File([name], name, { type: "application/pdf" });
}

describe("applyPickedFilesToRows", () => {
  it("is a no-op when the picker is cancelled or empty", () => {
    const rows = [emptyUploadRow(0)];
    expect(applyPickedFilesToRows(rows, 0, [])).toBe(rows);
    expect(applyPickedFilesToRows(rows, 0, [])).toEqual([emptyUploadRow(0)]);
  });

  it("keeps a single file on the same row", () => {
    const rows = [emptyUploadRow(0)];
    const dec = file("dec.pdf");
    expect(applyPickedFilesToRows(rows, 0, [dec])).toEqual([
      { id: 0, docType: "dec", fileName: "dec.pdf", pick: 0, file: dec },
    ]);
  });

  it("creates one row per file when several are picked at once", () => {
    const rows = [emptyUploadRow(0, "photo")];
    const files = [file("a.jpg"), file("b.jpg"), file("c.jpg"), file("d.jpg")];
    const next = applyPickedFilesToRows(rows, 0, files);
    expect(next).toHaveLength(4);
    expect(next.map((row) => row.fileName)).toEqual(["a.jpg", "b.jpg", "c.jpg", "d.jpg"]);
    expect(next.map((row) => row.docType)).toEqual(["photo", "photo", "photo", "photo"]);
    expect(next.map((row) => row.file)).toEqual(files);
    expect(next.map((row) => row.id)).toEqual([0, 1, 2, 3]);
  });

  it("appends extra files after existing rows instead of collapsing them", () => {
    const first = file("kept.pdf");
    const rows = [
      { id: 0, docType: "dec", fileName: "kept.pdf", pick: 0, file: first },
      emptyUploadRow(1, "report"),
    ];
    const extra = [file("one.pdf"), file("two.pdf")];
    const next = applyPickedFilesToRows(rows, 1, extra);
    expect(next).toHaveLength(3);
    expect(next[0]?.fileName).toBe("kept.pdf");
    expect(next[1]?.fileName).toBe("one.pdf");
    expect(next[2]?.fileName).toBe("two.pdf");
    expect(next[2]?.id).toBe(2);
    expect(next[2]?.docType).toBe("report");
  });

  it("leaves rows unchanged when the target row is missing", () => {
    const rows = [emptyUploadRow(0)];
    expect(applyPickedFilesToRows(rows, 9, [file("x.pdf")])).toBe(rows);
  });

  it("stamps every row file onto files_N so Create does not wait on DataTransfer", () => {
    const a = file("a.jpg");
    const b = file("b.jpg");
    const form = new FormData();
    form.set("dealId", "deal-1");
    form.set("files_0", new File([], ""));
    const next = appendUploadRowFiles(form, [
      { file: a },
      { file: b },
      { file: null },
    ]);
    expect(next.get("rowCount")).toBe("3");
    expect((next.get("files_0") as File).name).toBe("a.jpg");
    expect((next.get("files_1") as File).name).toBe("b.jpg");
    expect(next.get("files_2")).toBeNull();
    expect(uploadRowsHaveFiles([{ file: a }, { file: null }])).toBe(true);
    expect(uploadRowsHaveFiles([{ file: null }])).toBe(false);
    expect(uploadRowsTotalBytes([{ file: a }, { file: b }])).toBe(a.size + b.size);
  });

  it("builds one clean FormData per photo so Save files does not pack files_N together", () => {
    const photos = [file("roof.jpg"), file("siding.jpg"), file("garage.jpg")];
    const rows = applyPickedFilesToRows([emptyUploadRow(0, "photo")], 0, photos);
    const pending = filesToSave(rows);
    expect(pending).toHaveLength(3);
    expect(pending.map((row) => row.file.name)).toEqual(["roof.jpg", "siding.jpg", "garage.jpg"]);
    const forms = pending.map((row) =>
      buildDealDocumentRowForm({
        dealId: "deal-1",
        riskId: "risk-1",
        line: "auto",
        docType: row.docType,
        file: row.file,
      }),
    );
    expect(forms).toHaveLength(3);
    for (const [index, form] of forms.entries()) {
      expect(form.get("dealId")).toBe("deal-1");
      expect(form.get("riskId")).toBe("risk-1");
      expect(form.get("line")).toBe("auto");
      expect(form.get("rowCount")).toBe("1");
      expect(form.get("docType_0")).toBe("photo");
      expect((form.get("files_0") as File).name).toBe(photos[index]!.name);
      expect(form.get("files_1")).toBeNull();
    }
  });
});
