import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SourceFileRow } from "@/components/deal/source-file-row";
import {
  dealDocumentsTabHref,
  isHiddenAgencyLetterDoc,
  listWorksheetSourceDocs,
  sourceDocDisplayName,
  sourceDocExtensionLabel,
} from "./deal-docs-save";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal Documents save must not open error.tsx", () => {
  it("redirects successful deal uploads onto Documents with a toast", () => {
    const action = source("src/app/actions/documents.ts");
    const uploadStart = action.indexOf("export async function uploadDocument");
    const leadStart = action.indexOf("export async function uploadLeadLineDocument");
    const uploadBody = action.slice(uploadStart, leadStart);
    expect(uploadBody).toMatch(/dealDocumentsTabHref/);
    expect(uploadBody).toMatch(/isRedirectError/);
    expect(uploadBody).toMatch(/flashAction\(documentsHref, attempted > 0 \? "documents-save-failed" : "choose-file", "error"\)/);
    expect(uploadBody).toMatch(/flashAction\(dealDocumentsTabHref\(last\.dealId, line\), "documents-saved"\)/);
    expect(uploadBody).toMatch(/if \(documentsHref\)/);
    expect(uploadBody).toMatch(/flashAction\(documentsHref, message, "error"\)/);
    expect(source("src/lib/flash-action.ts")).toMatch(/redirect\(withFlash\(href, message, kind\)\)/);
  });

  it("submits Save files from row.file state and does not treat redirect() as failure", () => {
    const form = source("src/components/deal/source-docs-upload.tsx");
    const action = source("src/app/actions/documents.ts");
    expect(form).toMatch(/onSubmit=\{submitFromRows\}/);
    expect(form).toMatch(/buildDealDocumentRowForm\(/);
    expect(form).toMatch(/filesToSave\(rows\)/);
    expect(form).not.toMatch(/appendUploadRowFiles\(new FormData\(event\.currentTarget\)/);
    expect(form).toMatch(/await saveDealDocuments\(formData\)/);
    expect(form).toMatch(/flashAction\("choose-file", "error"\)/);
    expect(form).toMatch(/planUpload\(/);
    expect(form).toMatch(/setError\(plan\.error\)/);
    expect(form).toMatch(/flashAction\("documents-saved"\)/);
    expect(form).toMatch(/planDocSaveAdvance/);
    expect(form).toMatch(/plan\.action === "stay"/);
    const stay = form.indexOf('plan.action === "stay"');
    const push = form.indexOf("router.push");
    expect(stay).toBeGreaterThan(0);
    expect(push).toBeGreaterThan(stay);
    expect(form).toMatch(/Could not save that file\. Nothing was stored\./);
    expect(form).not.toMatch(/Try again/);
    expect(form).not.toMatch(/isRedirectError/);
    expect(form).not.toMatch(/uploadDocument/);
    expect(form).toMatch(/assignedFile=\{row\.file\}/);
    expect(form).toMatch(/multiple/);
    expect(form).toMatch(/router\.refresh\(\)/);
    expect(action).toMatch(/export async function saveDealDocuments/);
    expect(action).toMatch(/persistDealSourceUploads\(formData, \{ persistOnly: true \}\)/);
    expect(action).toMatch(/return \{ ok: true, count \}/);
    expect(source("src/components/choose-file-button.tsx")).toMatch(/Safari \/ non-gesture/);
  });

  it("soft-fails the Documents panel instead of the whole deal page", () => {
    expect(source("src/components/deal/documents-panel.tsx")).toMatch(/DealDocsErrorBoundary/);
    expect(source("src/components/deal/documents-panel.tsx")).toMatch(/listWorksheetSourceDocs\(docs\)/);
    expect(source("src/components/deal/deal-docs-error-boundary.tsx")).toMatch(/data-ff-deal-docs-soft-error/);
    expect(source("src/components/deal/deal-docs-error-boundary.tsx")).toMatch(/getDerivedStateFromError/);
    expect(source("src/app/deals/[id]/error.tsx")).toMatch(/Could not open this deal/);
  });

  it("builds the Documents tab href used after save", () => {
    expect(dealDocumentsTabHref("deal-1")).toBe("/deals/deal-1?tab=documents");
    expect(dealDocumentsTabHref("deal-1", "auto")).toBe("/deals/deal-1?tab=documents&line=auto");
  });

  it("lists newly uploaded photos and floor plans without throwing on bad rows", () => {
    const listed = listWorksheetSourceDocs([
      { id: "1", slot: "source_doc", docType: "photo", filename: "roof.jpg", tags: ["line:auto"] },
      { id: "2", slot: "source_doc", docType: "floor_plan", filename: "plan.png", tags: ["not-an-array"] as unknown as string[] },
      { id: "3", slot: "quote_file", docType: "agency_quote", filename: "q.pdf", tags: [] },
      { id: "4", slot: "filled_letter", docType: "other", filename: "letter.pdf", tags: [] },
      { id: "5", slot: "source_doc", docType: "photo", filename: "yard.jpg", tags: ["agency_letter"] },
      { id: "6", slot: "source_doc", docType: "cancellation", filename: "dec.pdf", tags: [] },
      { id: "7", slot: "source_doc", docType: "aor", filename: "letter.pdf", tags: [] },
      { id: "8", slot: "source_doc", docType: "other", filename: "Cancellation-pack-filled.pdf", tags: [] },
      { id: "9", slot: "source_doc", docType: "other", filename: "AOR-pack-filled.pdf", tags: '["agency_letter","aor"]' },
      null as unknown as { slot: string },
    ]);
    expect(listed.sourceDocs.map((row) => (row as { id: string }).id)).toEqual(["1", "2"]);
    expect(isHiddenAgencyLetterDoc({ slot: "source_doc", docType: "cancellation", filename: "x.pdf" })).toBe(true);
    expect(isHiddenAgencyLetterDoc({ slot: "source_doc", docType: "photo", filename: "roof.jpg" })).toBe(false);
    expect(listed.lineDocs).toHaveLength(1);
    expect(listed.otherSourceDocs).toHaveLength(1);
    expect(listWorksheetSourceDocs(undefined).sourceDocs).toEqual([]);
    expect(sourceDocDisplayName(undefined)).toBe("file");
    expect(sourceDocDisplayName("")).toBe("file");
    expect(sourceDocExtensionLabel("plan.heic")).toBe("heic");
    expect(sourceDocExtensionLabel(null)).toBe("file");
  });

  it("renders a source row when filename, mime, or type is an edge case", () => {
    const html = renderToStaticMarkup(
      createElement(SourceFileRow, {
        doc: {
          id: "11111111-1111-4111-8111-111111111111",
          filename: "",
          mimeType: "image/heic",
          docType: "floor_plan",
          slot: "source_doc",
          tags: null,
        } as never,
        dealId: "22222222-2222-4222-8222-222222222222",
        showType: true,
      }),
    );
    expect(html).toContain("file");
    expect(html).toContain("Floor plan");
    expect(html).not.toContain("Could not open this deal");
  });

  it("keeps listing photos when tags are the wrong shape", () => {
    const listed = listWorksheetSourceDocs([
      {
        filename: "car.jpg",
        mimeType: "image/jpeg",
        docType: "photo",
        slot: "source_doc",
        tags: { bad: true },
      },
    ]);
    expect(listed.sourceDocs).toHaveLength(1);
    expect(listed.otherSourceDocs).toHaveLength(1);
    expect(listed.lineDocs).toHaveLength(0);
  });
});
