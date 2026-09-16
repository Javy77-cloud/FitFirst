import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CreatePolicyBusyPanel } from "@/components/deal/create-policy-busy-panel";
import {
  activeShoppingProducts,
  allProductsClosedForDealWon,
  coerceDeclarationDocType,
  CREATE_POLICY_BUSY_COPY,
  CREATE_POLICY_BUSY_TITLE,
  createPolicyPromptCopy,
  declarationRetagPatch,
  isDeclarationDocType,
  isProductIssuedDone,
  looksLikeDeclarationFromGemini,
  markProductIssuedDone,
  mintAdminNotifyDue,
  parsePendingDecPrompt,
  ROSA_DEC_DEAL_ID,
  ROSA_DEC_DOCUMENT_ID,
  shouldPromptCreatePolicy,
  tagsAfterDeclarationRetag,
} from "./dec-prompt";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("declaration create-policy prompt", () => {
  it("prompts only for a Declaration type that still looks like a dec", () => {
    expect(isDeclarationDocType("dec")).toBe(true);
    expect(isDeclarationDocType("Declaration")).toBe(true);
    expect(isDeclarationDocType("agency_quote")).toBe(false);
    expect(isDeclarationDocType("photo")).toBe(false);
    expect(coerceDeclarationDocType("declaration")).toBe("dec");

    expect(shouldPromptCreatePolicy({ docType: "dec", looksLikeDec: true })).toBe(true);
    expect(shouldPromptCreatePolicy({ docType: "dec", looksLikeDec: "unknown" })).toBe(true);
    expect(shouldPromptCreatePolicy({ docType: "dec", looksLikeDec: false })).toBe(false);
    expect(shouldPromptCreatePolicy({ docType: "photo", looksLikeDec: true })).toBe(false);
    expect(shouldPromptCreatePolicy({ docType: "agency_quote", looksLikeDec: true })).toBe(false);
  });

  it("trusts Gemini when it says the file does not look like a dec", () => {
    expect(
      looksLikeDeclarationFromGemini({
        documentKind: "not_declaration",
        ran: true,
        fields: [{ fieldKey: "policy_number", normalizedValue: "HO-1" }],
      }),
    ).toBe(false);
    expect(
      looksLikeDeclarationFromGemini({
        notes: ["doesn't look like a dec"],
        ran: true,
      }),
    ).toBe(false);
    expect(
      looksLikeDeclarationFromGemini({
        ran: true,
        fields: [
          { fieldKey: "policy_number", normalizedValue: "HO-rosa-1" },
          { fieldKey: "named_insured", normalizedValue: "Rosa Castellanos" },
        ],
      }),
    ).toBe(true);
    expect(looksLikeDeclarationFromGemini({ ran: false })).toBe("unknown");
    expect(createPolicyPromptCopy("Florida Peninsula")).toBe(
      "Declaration received from Florida Peninsula. Create the policy now?",
    );
    expect(CREATE_POLICY_BUSY_TITLE).toMatch(/we’re on it|we're on it/);
    expect(CREATE_POLICY_BUSY_COPY).toMatch(/declaration/);
    expect(parsePendingDecPrompt({ documentId: "d1", carrierName: "Citizens" })?.documentId).toBe("d1");
  });
});

describe("publish wins only the minted product line", () => {
  it("marks one line issued-done and leaves sibling products shopping", () => {
    const afterHo3 = markProductIssuedDone(
      {
        homeowners: {
          stage: "policy_issued",
          selectedQuoteIds: ["q-ho3"],
          mintStatus: "unpublished",
          noticeNote: "Mortgagee check",
        },
        auto: { stage: "bound", selectedQuoteIds: ["q-auto"] },
      },
      "homeowners",
      { policyId: "p-ho3" },
    );
    expect(afterHo3.homeowners).toMatchObject({
      stage: "closed_won",
      issuedDone: true,
      mintStatus: "published",
      policyId: "p-ho3",
      selectedQuoteIds: ["q-ho3"],
      noticeNote: "Mortgagee check",
    });
    expect(afterHo3.auto).toMatchObject({ stage: "bound", selectedQuoteIds: ["q-auto"] });
    expect(isProductIssuedDone(afterHo3.homeowners)).toBe(true);
    expect(isProductIssuedDone(afterHo3.auto)).toBe(false);
    expect(activeShoppingProducts(["homeowners", "auto"], afterHo3)).toEqual(["auto"]);
    expect(allProductsClosedForDealWon(["homeowners", "auto"], afterHo3)).toBe(false);

    const afterAuto = markProductIssuedDone(afterHo3, "auto", { policyId: "p-auto" });
    expect(allProductsClosedForDealWon(["homeowners", "auto"], afterAuto)).toBe(true);
    expect(activeShoppingProducts(["homeowners", "auto"], afterAuto)).toEqual([]);
  });

  it("does not treat an unpublished draft mint as won", () => {
    expect(
      isProductIssuedDone({
        stage: "policy_issued",
        selectedQuoteIds: ["q1"],
        mintStatus: "unpublished",
        issuedDone: false,
      }),
    ).toBe(false);
    expect(
      allProductsClosedForDealWon(["homeowners"], {
        homeowners: { stage: "policy_issued", selectedQuoteIds: ["q1"], mintStatus: "unpublished" },
      }),
    ).toBe(false);
  });
});

describe("rosa retag + 72h admin notify stub", () => {
  it("retags the Rosa quote-file dec onto the declaration slot", () => {
    expect(ROSA_DEC_DEAL_ID).toMatch(/5d4a4c04/);
    expect(ROSA_DEC_DOCUMENT_ID).toMatch(/cbd6719e/);
    expect(declarationRetagPatch().docType).toBe("dec");
    expect(declarationRetagPatch().slot).toBe("source_doc");
    expect(tagsAfterDeclarationRetag(["quote:q1", "source:agency", "label:FP"])).toEqual(
      expect.arrayContaining(["dec", "mint", "label:FP"]),
    );
    expect(tagsAfterDeclarationRetag(["quote:q1", "source:agency"])).not.toContain("quote:q1");
  });

  it("notifies admin only after 72h still unpublished", () => {
    const mintedAt = new Date("2026-09-13T12:00:00.000Z");
    expect(
      mintAdminNotifyDue({
        status: "unpublished",
        mintedAt,
        now: new Date("2026-09-16T11:59:00.000Z"),
      }),
    ).toBe(false);
    expect(
      mintAdminNotifyDue({
        status: "unpublished",
        mintedAt,
        now: new Date("2026-09-16T12:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      mintAdminNotifyDue({
        status: "published",
        mintedAt,
        now: new Date("2026-09-20T12:00:00.000Z"),
      }),
    ).toBe(false);
    expect(
      mintAdminNotifyDue({
        status: "unpublished",
        mintedAt,
        adminNotifiedAt: "2026-09-16T12:01:00.000Z",
        now: new Date("2026-09-20T12:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("wires the modal, carrier API, and Quotes backup path", () => {
    expect(source("src/components/deal/create-policy-from-dec-modal.tsx")).toMatch(
      /createPolicyPromptCopy/,
    );
    expect(source("src/components/deal/create-policy-from-dec-modal.tsx")).toMatch(/Create policy/);
    expect(source("src/components/deal/create-policy-from-dec-modal.tsx")).toMatch(/Not now/);
    expect(source("src/components/deal/create-policy-from-dec-modal.tsx")).toMatch(
      /CreatePolicyBusyPanel/,
    );
    expect(source("src/components/deal/create-policy-busy-panel.tsx")).toMatch(
      /data-ff-create-policy-busy/,
    );
    expect(source("src/components/deal/create-policy-busy-panel.tsx")).toMatch(
      /CREATE_POLICY_BUSY_TITLE/,
    );
    expect(source("src/components/deal/create-policy-busy-panel.tsx")).toMatch(/WaitHold/);
    expect(source("src/components/desk/wait-hold.tsx")).toMatch(/data-ff-wait-hold-spinner/);
    expect(source("src/components/desk/wait-hold.tsx")).toMatch(/ff-wait-hold-bar/);
    expect(source("src/components/desk/wait-hold.tsx")).toMatch(/animate-spin/);
    expect(source("src/components/deal/create-policy-from-dec-modal.tsx")).toMatch(
      /setCreating\(true\)/,
    );
    expect(source("src/components/deal/create-policy-from-dec-modal.tsx")).toMatch(
      /if \(!next && !creating\) closeWithoutMint/,
    );
    expect(source("src/components/deal/create-policy-from-dec-modal.tsx")).toMatch(
      /if \(!result\.ok\) \{\s*const toast = mintFailureToast\(result\.reason\);\s*flashAction\(toast\.key, toast\.kind\);\s*return;/,
    );
    const busy = renderToString(createElement(CreatePolicyBusyPanel));
    expect(busy).toContain('data-ff-create-policy-busy=""');
    expect(busy).toContain('data-ff-wait-hold-spinner=""');
    expect(busy).toContain('data-ff-wait-hold-bar=""');
    expect(busy).toContain(CREATE_POLICY_BUSY_TITLE);
    expect(busy).toContain(CREATE_POLICY_BUSY_COPY);
    expect(busy).toContain("role=\"progressbar\"");
    expect(busy).toMatch(/animate-spin/);
    expect(source("src/app/api/v1/deals/[id]/declaration/route.ts")).toMatch(/receiveCarrierDeclaration/);
    expect(source("src/components/deal/issue-policy-from-dec.tsx")).toMatch(
      /Issue policy from declaration/,
    );
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/markProductIssuedDone/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/ensureWorkItem/);
    expect(source("src/app/actions/declaration-prompt.ts")).toMatch(/readDecPdfBytes/);
    expect(source("src/app/actions/declaration-prompt.ts")).toMatch(/readStoredFile/);
    expect(source("src/app/actions/policy-mint.ts")).not.toMatch(/issuedDone: true[\s\S]{0,80}unpublished/);
    expect(source("src/app/actions/documents.ts")).toMatch(/lastDeclaration/);
    expect(source("src/app/actions/declaration.ts")).toMatch(/forcePrompt: true/);
    expect(source("src/app/actions/declaration.ts")).toMatch(/ensureRosaDeclarationRetag/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/ff-deal-stamp-row/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/CreatePolicyFromDecModal/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/placement="overlay"/);
  });
});
