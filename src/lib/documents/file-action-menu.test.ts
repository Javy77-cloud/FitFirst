import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FILE_ACTION_MENU_ITEMS, FILE_ACTION_MENU_LABELS } from "./file-action-menu";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const MENU = "src/components/documents/file-action-menu.tsx";

const FILE_LIST_SURFACES = [
  { file: "src/components/deal/source-file-row.tsx", label: "Deal Documents rows" },
  { file: "src/components/leads/lead-line-documents.tsx", label: "Lead line files" },
  { file: "src/components/policy/policy-file-attach.tsx", label: "Policy attachments" },
  { file: "src/components/policy/tabs/documents-table.tsx", label: "Policy issued files" },
  { file: "src/components/documents/file-list.tsx", label: "Documents library" },
  { file: "src/components/ops/document-manager.tsx", label: "Ops file tiles" },
  { file: "src/components/ops/entity-upload.tsx", label: "Entity document table" },
  { file: "src/components/deal/deal-files.tsx", label: "Deal source files table" },
  { file: "src/components/deal/sheet-drop.tsx", label: "Quote Sheet drop files" },
  { file: "src/components/deal/source-vs-sheet.tsx", label: "Source vs sheet" },
  { file: "src/components/documents/fill-workspace.tsx", label: "Forms scan source" },
  { file: "src/components/esign/in-desk-panel.tsx", label: "In-desk signature packets" },
] as const;

describe("standard file action menu", () => {
  it("keeps labels in View → Download → Replace → Delete order", () => {
    expect(FILE_ACTION_MENU_LABELS).toEqual(["View", "Download", "Replace", "Delete"]);
    expect(FILE_ACTION_MENU_ITEMS.map((item) => item.id)).toEqual([
      "view",
      "download",
      "replace",
      "delete",
    ]);
  });

  it("renders those four actions once, with the same icons and order", () => {
    const text = source(MENU);
    expect(text).toMatch(/data-ff-file-action="view"/);
    expect(text).toMatch(/data-ff-file-action="download"/);
    expect(text).toMatch(/data-ff-file-action="replace"/);
    expect(text).toMatch(/data-ff-file-action="delete"/);
    expect(text.indexOf('data-ff-file-action="view"')).toBeLessThan(
      text.indexOf('data-ff-file-action="download"'),
    );
    expect(text.indexOf('data-ff-file-action="download"')).toBeLessThan(
      text.indexOf('data-ff-file-action="replace"'),
    );
    expect(text.indexOf('data-ff-file-action="replace"')).toBeLessThan(
      text.indexOf('data-ff-file-action="delete"'),
    );
    expect(text).toMatch(/<Eye \/>\s*View/);
    expect(text).toMatch(/<Download \/>\s*Download/);
    expect(text).toMatch(/<Replace \/>\s*Replace/);
    expect(text).toMatch(/<Trash2 \/>\s*Delete/);
    expect(text).toMatch(/filePreviewHref/);
    expect(text).toMatch(/target="_blank"/);
    expect(text).toMatch(/fileDownloadHref/);
    expect(text).toMatch(/replaceDocument/);
    expect(text).toMatch(/deleteUploadedFile/);
    expect(text).toMatch(/FileDeleteIcon/);
    expect(text).toMatch(/data-ff-file-action="delete-icon"/);
  });

  it("deletes through HardDeleteForm so confirmHardDelete runs once", () => {
    const text = source(MENU);
    expect(text).toMatch(/<HardDeleteForm/);
    expect(text.match(/<HardDeleteForm/g)).toHaveLength(1);
    expect(text).toMatch(/action=\{deleteUploadedFile\}/);
    expect(text).toMatch(/subject=\{subject\}/);
    expect(text).toMatch(/deleteBtnRef\.current\?\.click\(\)/);
    expect((text.match(/deleteBtnRef\.current\?\.click\(\)/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(text).not.toMatch(/confirmHardDelete\(/);
    expect(text).not.toMatch(/confirmDeleteOnce\(/);
    expect(text).not.toMatch(/window\.confirm/);
    expect(text).not.toMatch(/immediate/);

    const form = source("src/components/desk/hard-delete-form.tsx");
    expect(form).toMatch(/onClickCapture/);
    expect(form).toMatch(/confirm && !confirmHardDelete\(subject\)/);
    expect(form).toMatch(/preventDefault/);
    expect(form).toMatch(/stopPropagation/);
    expect(form).not.toMatch(/onSubmit/);
    expect(form.match(/confirm && !confirmHardDelete\(subject\)/g)).toHaveLength(1);
  });

  it("is the file menu on deal Documents rows and other stored-file lists", () => {
    for (const row of FILE_LIST_SURFACES) {
      const text = source(row.file);
      expect(text, row.label).toMatch(/FileActionMenu/);
      expect(text, `${row.label} no ad-hoc delete`).not.toMatch(/DeleteUploadedFileButton/);
    }
    const docs = source("src/components/deal/documents-panel.tsx");
    expect(docs).toMatch(/SourceFileRow/);
    const row = source("src/components/deal/source-file-row.tsx");
    expect(row).toMatch(/data-ff-file-action-menu|FileActionMenu/);
    expect(row.indexOf("<FileActionMenu")).toBeLessThan(row.indexOf("{filename}"));
    expect(row).toMatch(/onDeleted/);
  });
});
