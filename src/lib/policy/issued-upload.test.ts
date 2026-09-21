import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isQuoteFileDoc } from "@/lib/deals/quote-docs";
import { isDeclarationPdf } from "@/lib/policy/mint-gate";
import { issuedPolicyDocType, issuedUploadFolder, issuedUploadPersist } from "./issued-upload";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("issued policy upload folder", () => {
  it("puts a manual Travelers quote in the Manual folder as a current policy", () => {
    expect(issuedUploadFolder({ why: "quoted [manual] [ff-markets]", notes: null })).toBe("manual");
    expect(issuedPolicyDocType("auto")).toBe("current_policy");
    const placed = issuedUploadPersist({
      quoteId: "q-travelers",
      shopLine: "auto",
      folder: "manual",
      filename: "Travelers policy.pdf",
    });
    expect(placed).toMatchObject({
      docType: "current_policy",
      slot: "quote_file",
    });
    expect(placed.tags).toEqual(
      expect.arrayContaining([
        "quote:q-travelers",
        "source:agency",
        "dec",
        "mint",
        "line:auto",
        "label:Travelers policy.pdf",
      ]),
    );
    expect(isQuoteFileDoc(placed)).toBe(true);
    expect(
      isDeclarationPdf({
        id: "doc",
        docType: placed.docType,
        slot: placed.slot,
        filename: "Travelers policy.pdf",
        mimeType: "application/pdf",
      }),
    ).toBe(true);
  });

  it("uses the carrier folder only when that quote already has a carrier download", () => {
    expect(issuedUploadFolder({ hasCarrierDownload: true })).toBe("carrier");
    expect(issuedUploadFolder({ why: "[manual]", hasCarrierDownload: true })).toBe("manual");
    const placed = issuedUploadPersist({
      quoteId: "q-carrier",
      shopLine: "home",
      folder: "carrier",
      filename: "dec.pdf",
    });
    expect(placed.docType).toBe("dec");
    expect(placed.slot).toBe("quote_file");
    expect(placed.tags).toContain("source:carrier");
    expect(isQuoteFileDoc(placed)).toBe(true);
  });

  it("still saves a declaration when the quote id is missing", () => {
    const placed = issuedUploadPersist({
      quoteId: "",
      shopLine: "auto",
      folder: "manual",
      filename: "policy.pdf",
    });
    expect(placed.slot).toBe("source_doc");
    expect(placed.docType).toBe("current_policy");
    expect(isQuoteFileDoc(placed)).toBe(false);
  });

  it("wires the popup upload into that folder and leaves the file if mint cannot read it", () => {
    const mint = source("src/app/actions/policy-mint.ts");
    expect(mint).toMatch(/issuedUploadPersist/);
    expect(mint).toMatch(/issuedUploadFolder/);
    const upload = mint.slice(mint.indexOf("export async function uploadDeclarationAndMint"));
    expect(upload).toMatch(/revalidatePath\(`\/deals\/\$\{dealId\}`\)/);
    expect(upload).not.toMatch(/delete\(documents\)/);
    expect(upload).not.toMatch(/delete\(deals\)/);
    expect(upload).not.toMatch(/delete\(quotes\)/);
    expect(upload).not.toMatch(/delete\(contacts\)/);
    const popup = source("src/components/deal/issue-policy-from-dec.tsx");
    expect(popup).toMatch(/router\.refresh\(\)/);
    expect(popup).toMatch(/router\.push\(`\/policies\/\$\{result\.policyId\}`\)/);
  });

  it("offers Delete on Manual and carrier folders for that file only", () => {
    const actions = source("src/components/deal/quote-file-actions.tsx");
    expect(actions).toMatch(/data-ff-quote-file-delete/);
    expect(actions).toMatch(/>\s*Delete\s*</);
    const del = source("src/app/actions/documents.ts");
    const body = del.slice(del.indexOf("export async function deleteUploadedFile"));
    expect(body).toMatch(/documentId/);
    expect(body).toMatch(/delete\(documents\)/);
    expect(body).not.toMatch(/delete\(deals\)/);
    expect(body).not.toMatch(/delete\(quotes\)/);
    expect(body).not.toMatch(/delete\(contacts\)/);
  });
});
