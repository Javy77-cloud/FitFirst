import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dealDocumentsTabHref } from "@/lib/documents/deal-docs-save";
import { documentDeleteReturnHref } from "@/lib/documents/delete-file";
import { shopLineFromSourceDoc } from "@/lib/deals/quote-docs";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Flood DEC Change type stays on Flood product", () => {
  it("deal Documents href keeps flood line + product chip", () => {
    expect(dealDocumentsTabHref("deal-rosa", "flood")).toBe(
      "/deals/deal-rosa?tab=documents&line=flood&product=flood",
    );
  });

  it("delete/type return href falls back with flood line (not bare tab=documents)", () => {
    expect(
      documentDeleteReturnHref({
        dealId: "deal-rosa",
        returnTo: "",
        line: "flood",
      }),
    ).toBe("/deals/deal-rosa?tab=documents&line=flood&product=flood");
    // Bare fallback (no line) is what used to swap Flood → Home quoting_line.
    expect(
      documentDeleteReturnHref({
        dealId: "deal-rosa",
        returnTo: "",
      }),
    ).toBe("/deals/deal-rosa?tab=documents");
  });

  it("Flood-tagged DEC resolves shop line flood (not home)", () => {
    expect(
      shopLineFromSourceDoc({
        slot: "source_doc",
        docType: "policy_dec",
        tags: ["line:flood", "form:FLOOD"],
      }),
    ).toBe("flood");
  });

  it("updateDocumentLabel scopes declaration extract to doc tags line", () => {
    const action = source("src/app/actions/documents.ts");
    const start = action.indexOf("export async function updateDocumentLabel");
    const end = action.indexOf("export async function setDocumentTermRole", start);
    const body = action.slice(start, end);
    expect(body).toMatch(/shopLineFromSourceDoc/);
    expect(body).toMatch(/isDeclarationDocType/);
    expect(body).toMatch(/docLine/);
    expect(body).toMatch(/fillDealSheetIfReady\(doc\.dealId, docLine\)/);
    expect(body).toMatch(/line: shopLine \|\| formLine/);
    // Must not fill using deal.quotingLine for this path.
    expect(body).not.toMatch(/quotingLine/);
  });

  it("FileActionMenu + SourceFileRow pass line/returnTo on Change type", () => {
    const menu = source("src/components/documents/file-action-menu.tsx");
    expect(menu).toMatch(/effectiveReturnTo/);
    expect(menu).toMatch(/dealDocumentsTabHref\(dealId, line\)/);
    expect(menu).toMatch(/action=\{updateDocumentLabel\}/);
    expect(menu).toMatch(/name="line"/);

    const row = source("src/components/deal/source-file-row.tsx");
    expect(row).toMatch(/returnTo=\{line \? dealDocumentsTabHref\(dealId, line\)/);
    expect(row).toMatch(/extractExisting/);
    expect(row).toMatch(/name="line"/);
  });
});
