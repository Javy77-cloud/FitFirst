import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEAL_WORKSHEET_SOURCE_DOC_TYPES,
  SOURCE_DOC_ACCEPT,
  worksheetDocTypeLabel,
} from "./source-doc-types";

describe("deal worksheet source docs", () => {
  it("orders most-used types and keeps Floor plan off the picker", () => {
    const labels = DEAL_WORKSHEET_SOURCE_DOC_TYPES.map((row) => row.label);
    const values = DEAL_WORKSHEET_SOURCE_DOC_TYPES.map((row) => row.value);
    expect(labels).toContain("Declaration page");
    expect(labels).not.toContain("Declarations");
    expect(labels).not.toContain("Floor plan");
    expect(values).not.toContain("floor_plan");
    expect(labels).toEqual([
      "Declaration page",
      "Wind mitigation",
      "4-point",
      "Photos",
      "Inspections",
      "Reports",
      "Other",
    ]);
    expect(labels.at(-1)).toBe("Other");
    expect(worksheetDocTypeLabel("dec", true)).toBe("Dec page");
    expect(worksheetDocTypeLabel("floor_plan")).toBe("Floor plan");
    expect(worksheetDocTypeLabel("floor_plan", true)).toBe("Floor plan");
    expect(SOURCE_DOC_ACCEPT).toMatch(/image\/jpeg/);
    expect(SOURCE_DOC_ACCEPT).toMatch(/image\/png/);
    expect(SOURCE_DOC_ACCEPT).toMatch(/image\/webp/);
    expect(SOURCE_DOC_ACCEPT).toMatch(/image\/heic/);
  });

  it("keeps one compact type / file / create zone on the worksheet", () => {
    const form = readFileSync("src/components/deal/source-docs-upload.tsx", "utf8");
    expect(form).toMatch(/Save files/);
    expect(form).not.toMatch(/^\s*Create\s*$/m);
    expect(form).toMatch(/action=\{uploadDocument\}/);
    expect(form).toMatch(/name=\{`files_\$\{index\}`\}/);
    expect(form).toMatch(/name=\{`docType_\$\{index\}`\}/);
    expect(form).toMatch(/FileDeleteIcon/);
    expect(form).toMatch(/\+ Add another document/);
    expect(form).not.toMatch(/row\.fileName \|\| rows\.length > 1/);
    expect(form).not.toMatch(/Add another file/);
    expect(form).toMatch(/multiple/);
    expect(form).toMatch(/applyPickedFilesToRows/);
    expect(form).toMatch(/onFiles/);
    expect(form).toMatch(/DEAL_WORKSHEET_SOURCE_DOC_TYPES/);
  });

  it("lets the file picker create N rows when several files are chosen", () => {
    const form = readFileSync("src/components/deal/source-docs-upload.tsx", "utf8");
    const attach = readFileSync("src/components/deal/deal-docs-upload.tsx", "utf8");
    const picker = readFileSync("src/components/choose-file-button.tsx", "utf8");
    expect(form).toMatch(/applyPickedFilesToRows\(current, rowId, files\)/);
    expect(attach).toMatch(/applyPickedFilesToRows\(current, rowId, files\)/);
    expect(attach).toMatch(/multiple/);
    expect(picker).toMatch(/multiple=\{multiple\}/);
    expect(picker).toMatch(/if \(picked\.length === 0\) return/);
    expect(picker).toMatch(/onDrop/);
    expect(picker).toMatch(/fileName \|\| "Choose file"/);
  });
});
