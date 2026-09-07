import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEAL_WORKSHEET_SOURCE_DOC_TYPES,
  SOURCE_DOC_ACCEPT,
  worksheetDocTypeLabel,
} from "./source-doc-types";

describe("deal worksheet source docs", () => {
  it("renames Declarations and adds Photos, Inspections, Wind mitigation, Reports", () => {
    const labels = DEAL_WORKSHEET_SOURCE_DOC_TYPES.map((row) => row.label);
    expect(labels).toContain("Declaration page");
    expect(labels).not.toContain("Declarations");
    expect(labels).toEqual(
      expect.arrayContaining(["Photos", "Inspections", "Wind mitigation", "Reports"]),
    );
    expect(worksheetDocTypeLabel("dec", true)).toBe("Dec page");
    expect(SOURCE_DOC_ACCEPT).toMatch(/image\/jpeg/);
    expect(SOURCE_DOC_ACCEPT).toMatch(/image\/png/);
    expect(SOURCE_DOC_ACCEPT).toMatch(/image\/webp/);
    expect(SOURCE_DOC_ACCEPT).toMatch(/image\/heic/);
  });

  it("keeps one compact type / file / create zone on the worksheet", () => {
    const form = readFileSync("src/components/deal/source-docs-upload.tsx", "utf8");
    expect(form).toMatch(/Create/);
    expect(form).toMatch(/name=\{`files_\$\{index\}`\}/);
    expect(form).toMatch(/name=\{`docType_\$\{index\}`\}/);
    expect(form).toMatch(/FileDeleteIcon/);
    expect(form).toMatch(/\+ Add another document/);
    expect(form).not.toMatch(/row\.fileName \|\| rows\.length > 1/);
    expect(form).not.toMatch(/Add another file/);
  });
});
