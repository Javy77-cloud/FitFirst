import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isQuoteFileDoc } from "@/lib/deals/quote-docs";
import { isDeclarationPdf } from "@/lib/policy/mint-gate";
import { issuedPolicyDocType, issuedUploadFolder, issuedUploadMime, issuedUploadPersist } from "./issued-upload";

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

  it("stores a HEIC photo as an image so Gemini does not treat it as a PDF", () => {
    expect(issuedUploadMime("Travelers policy.HEIC", "")).toBe("image/heic");
    expect(issuedUploadMime("Travelers policy.HEIC", "application/octet-stream")).toBe("image/heic");
    expect(issuedUploadMime("policy.jpg", "image/jpeg")).toBe("image/jpeg");
    expect(issuedUploadMime("Travelers policy.pdf", "application/pdf")).toBe("application/pdf");
    expect(issuedUploadMime("Travelers policy.pdf", "")).toBe("application/pdf");
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
    const save = mint.slice(
      mint.indexOf("export async function saveIssuedPolicyUpload"),
      mint.indexOf("export async function uploadDeclarationAndMint"),
    );
    expect(save).toMatch(/revalidatePath\(`\/deals\/\$\{dealId\}`\)/);
    expect(save).not.toMatch(/loadMintGeminiRows/);
    expect(save).not.toMatch(/issuePolicyFromDeclaration/);
    expect(save).not.toMatch(/delete\(documents\)/);
    expect(save).not.toMatch(/delete\(deals\)/);
    expect(save).not.toMatch(/delete\(quotes\)/);
    expect(save).not.toMatch(/delete\(contacts\)/);
    const popup = source("src/components/deal/issue-policy-from-dec.tsx");
    const upload = popup.slice(popup.indexOf("async function uploadAndMint"));
    expect(upload.indexOf("saveIssuedPolicyUpload")).toBeGreaterThan(-1);
    expect(upload.indexOf("saveIssuedPolicyUpload")).toBeLessThan(upload.indexOf("router.refresh()"));
    expect(upload.indexOf("router.refresh()")).toBeLessThan(upload.indexOf("issuePolicyFromDeclaration"));
    expect(upload).toMatch(/ISSUED_POLICY_FOLDER_SAVED/);
    expect(popup).toMatch(/router\.push\(`\/policies\/\${policyId}`\)/);
    expect(popup).toMatch(/celebrateAndGo|PolicyMintSuccessPanel|CreatePolicyBusyPanel/);
    expect(popup).toMatch(/ISSUED_POLICY_ACCEPT/);
    expect(source("src/components/deal/quote-file-actions.tsx")).toMatch(/ISSUED_POLICY_FOLDER_SAVED/);
    expect(source("src/components/deal/quote-file-actions.tsx")).toMatch(/agencyCount/);
  });

  it("opens the upload popup when the quote folders have no policy, and does not Gemini first", () => {
    const gate = source("src/lib/policy/mint-gate.ts");
    const evaluate = gate.slice(gate.indexOf("export function evaluateMintGate"));
    expect(evaluate).toMatch(/findQuoteFolderPolicy/);
    expect(evaluate).not.toMatch(/findDealDeclaration/);
    const mint = source("src/app/actions/policy-mint.ts");
    const issue = mint.slice(
      mint.indexOf("export async function issuePolicyFromDeclaration"),
      mint.indexOf("export async function uploadDeclarationAndMint"),
    );
    expect(issue.indexOf("evaluateMintGate")).toBeLessThan(issue.indexOf("loadMintGeminiRows"));
    expect(issue).toMatch(/shopLine: dealProductDef\(product\)\.shopLine/);
    const header = source("src/components/deals/deal-header-stage.tsx");
    expect(header).toMatch(/OPEN_ISSUED_POLICY_UPLOAD/);
    expect(header).toMatch(/issuedFolderQuoteIds/);
    expect(header).toMatch(/isBoundReadyForIssue\(value\)/);
    expect(header).toMatch(/issue=1/);
    const popup = source("src/components/deal/issue-policy-from-dec.tsx");
    expect(popup).toMatch(/OPEN_ISSUED_POLICY_UPLOAD/);
    expect(popup).toMatch(/folderHasPolicy/);
    expect(popup).toMatch(/data-ff-mint-dec-dialog/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/quoteIdsWithFolderPolicy/);
    expect(source("src/lib/flash.ts")).toMatch(/The file stays in the folder/);
  });

  it("offers a trash delete on Manual and carrier folders for that file only", () => {
    const actions = source("src/components/deal/quote-file-actions.tsx");
    expect(actions).toMatch(/data-ff-quote-file-delete/);
    expect(actions).toMatch(/FileDeleteIcon/);
    expect(actions).toMatch(/label="Delete"/);
    expect(actions).not.toMatch(/>\s*Delete\s*</);
    const del = source("src/app/actions/documents.ts");
    const body = del.slice(del.indexOf("export async function deleteUploadedFile"));
    expect(body).toMatch(/documentId/);
    expect(body).toMatch(/delete\(documents\)/);
    expect(body).not.toMatch(/delete\(deals\)/);
    expect(body).not.toMatch(/delete\(quotes\)/);
    expect(body).not.toMatch(/delete\(contacts\)/);
  });
});
