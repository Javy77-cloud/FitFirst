import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7ft Documents Save does not auto-Fill", () => {
  it("upload helpers persist without silent runFillDealSheets; Fill button stays on Documents", () => {
    const action = source("src/app/actions/documents.ts");

    // uploadDocument: Fill only when after=fill-sheet (SheetDrop Upload-and-fill).
    const uploadStart = action.indexOf("export async function uploadDocument");
    const leadStart = action.indexOf("export async function uploadLeadLineDocument");
    expect(uploadStart).toBeGreaterThan(-1);
    expect(leadStart).toBeGreaterThan(uploadStart);
    const uploadBody = action.slice(uploadStart, leadStart);
    expect(uploadBody).toMatch(/afterAction === "fill-sheet"/);
    expect(uploadBody).toMatch(/flashAction\(dealDocumentsTabHref\(last\.dealId, line\), "documents-saved"\)/);
    expect(uploadBody).not.toMatch(/notice=filled`, "document-uploaded"/);
    // Silent auto-fill on every source_doc upload is gone; only gated fill-sheet remains.
    expect(uploadBody.match(/after\(\(\) => fillDealSheetIfReady/g)?.length ?? 0).toBe(1);
    expect(uploadBody).toMatch(/if \(last\.slot === "source_doc"\)[\s\S]*after\(\(\) => fillDealSheetIfReady/);

    const leadBody = action.slice(
      leadStart,
      action.indexOf("export async function uploadDealDocuments"),
    );
    expect(leadBody).not.toMatch(/fillDealSheetIfReady/);

    const dealDocsBody = action.slice(
      action.indexOf("export async function uploadDealDocuments"),
      action.indexOf("export async function uploadSampleDocument"),
    );
    expect(dealDocsBody).not.toMatch(/fillDealSheetIfReady/);
    expect(dealDocsBody).toMatch(/"documents-saved"/);
    expect(dealDocsBody).not.toMatch(/notice=filled/);

    const sampleBody = action.slice(
      action.indexOf("export async function uploadSampleDocument"),
      action.indexOf("export async function markDocumentType"),
    );
    expect(sampleBody).not.toMatch(/fillDealSheetIfReady/);
    expect(sampleBody).toMatch(/"documents-saved"/);
    expect(sampleBody).not.toMatch(/notice=filled/);

    // Explicit extract / delete refill / fill helper stay.
    expect(action).toMatch(/export async function extractExisting/);
    expect(action).toMatch(/await fillDealSheetIfReady\(dealId/);
    const deleteBody = action.slice(action.indexOf("export async function deleteUploadedFile"));
    expect(deleteBody).toMatch(/after\(\(\) => fillDealSheetIfReady/);

    const button = source("src/components/deal/master-sheet-fill-button.tsx");
    expect(button).not.toMatch(/tab=markets/);
    expect(button).toMatch(/flashAction\(toast\)/);
    expect(button).toMatch(/router\.refresh\(\)/);
    expect(button).toMatch(/fillMasterSheetStep/);

    expect(source("src/lib/flash.ts")).toMatch(/"documents-saved": "Documents saved"/);

    const refresh = source("src/components/deal/background-fill-refresh.tsx");
    expect(refresh).not.toMatch(/flash === "document-uploaded"/);
    expect(refresh).not.toMatch(/flash === "documents-saved"/);
    expect(refresh).toMatch(/flash === "document-deleted"/);
    expect(refresh).toMatch(/notice"\) === "filled"/);
  });
});
