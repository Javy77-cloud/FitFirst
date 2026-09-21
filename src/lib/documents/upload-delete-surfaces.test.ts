import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SURFACES: Array<{ file: string; label: string; stored: boolean }> = [
  { file: "src/components/deal/source-file-row.tsx", label: "Deal source docs + quote PDFs", stored: true },
  { file: "src/components/deal/sheet-drop.tsx", label: "Quote Sheet drop", stored: true },
  { file: "src/components/deal/deal-files.tsx", label: "Deal source files table", stored: true },
  { file: "src/components/deal/source-vs-sheet.tsx", label: "Source vs sheet", stored: true },
  { file: "src/app/policies/[id]/page.tsx", label: "Policy issued files + filing attachments", stored: true },
  { file: "src/components/policy/policy-file-attach.tsx", label: "Policy file attach", stored: true },
  { file: "src/components/documents/file-list.tsx", label: "Documents library list", stored: true },
  { file: "src/components/ops/document-manager.tsx", label: "Ops document manager", stored: true },
  { file: "src/components/ops/entity-upload.tsx", label: "Entity document table", stored: true },
  { file: "src/components/claims/claim-record.tsx", label: "Claim files", stored: true },
  { file: "src/components/esign/in-desk-panel.tsx", label: "In-desk signature packets", stored: true },
  { file: "src/app/settings/agency/page.tsx", label: "Agency logo", stored: true },
  { file: "src/components/settings/import-export-hub.tsx", label: "Import CSV", stored: true },
  { file: "src/components/documents/fill-workspace.tsx", label: "Forms scan source", stored: true },
  { file: "src/components/documents/document-versions.tsx", label: "Document replace / versions", stored: true },
  { file: "src/components/documents/library-upload.tsx", label: "Documents upload preview", stored: false },
  { file: "src/components/leads/lead-line-documents.tsx", label: "Lead per-line documents", stored: true },
];

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("upload surfaces offer delete + one confirm", () => {
  it("every stored-file upload surface has a Delete/Hide control gated by confirmHardDelete", () => {
    for (const row of SURFACES.filter((item) => item.stored)) {
      const text = source(row.file);
      expect(text, row.label).toMatch(
        /DeleteUploadedFileButton|FileActionMenu|FileDeleteIcon|data-ff-delete-file|HardDeleteForm/,
      );
      expect(text, `${row.label} confirm gate`).toMatch(
        /DeleteUploadedFileButton|FileActionMenu|confirmHardDelete|HardDeleteForm/,
      );
    }
  });

  it("HardDeleteForm keeps the server action and confirms once on click capture", () => {
    const text = source("src/components/desk/hard-delete-form.tsx");
    expect(text).toMatch(/action=\{action\}/);
    expect(text).not.toMatch(/action=\{async/);
    expect(text).toMatch(/onClickCapture/);
    expect(text).toMatch(/if \(!confirmHardDelete\(subject\)\)/);
    expect(text).toMatch(/preventDefault/);
    expect(text).toMatch(/stopPropagation/);
    expect(text).not.toMatch(/onSubmit/);
  });

  it("FileDeleteIcon never puts name or formAction on the trash button", () => {
    const icon = source("src/components/ui/file-delete-icon.tsx");
    expect(icon).toMatch(/name: _name/);
    expect(icon).toMatch(/formAction: _formAction/);
    expect(icon).not.toMatch(/\bname=/);
    expect(icon).not.toMatch(/\bformAction=/);
  });

  it("delete action hard-deletes shopping docs and hides issued policy files", () => {
    const action = source("src/app/actions/documents.ts");
    expect(action).toMatch(/export async function deleteUploadedFile/);
    expect(action).toMatch(/uploadedFileDeleteMode/);
    expect(action).toMatch(/status: "hidden"/);
    expect(action).toMatch(/delete\(extractedFields\)/);
    expect(action).toMatch(/clearExtractedSheetCells/);
    expect(action).toMatch(/unlinkStoredPath/);
    const deleteBody = action.slice(action.indexOf("export async function deleteUploadedFile"));
    expect(deleteBody).not.toMatch(/fillDealSheetIfReady/);
    expect(action).not.toMatch(/await fillDealSheetIfReady\(doc\.dealId/);
  });

  it("Javy confirm asks Are you sure you want to delete … once", () => {
    const helper = source("src/lib/desk/confirm-hard-delete.ts");
    expect(helper).toMatch(/Are you sure you want to delete \$\{subject\}\?/);
    expect(helper).toMatch(/return ask\(`Are you sure you want to delete \$\{subject\}\?`\);/);
    expect(helper).not.toMatch(/if \(!ask\(message\)\) return false;/);
    expect(helper).not.toMatch(/return ask\(message\);/);
  });
});
