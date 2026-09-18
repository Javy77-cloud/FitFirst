import { describe, expect, it } from "vitest";
import { applyPickedFilesToRows, emptyUploadRow } from "./upload-rows";

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
});
