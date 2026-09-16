import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CONFIDENCE_THRESHOLD } from "@/lib/domain";
import { isLateProductStage, lateStageNeedsQuoteSelection } from "@/lib/deals/product-stages";
import {
  buildMintFields,
  canPublishMint,
  confirmMintField,
  evaluateMintGate,
  findDealDeclaration,
  isBoundReadyForIssue,
  isDeclarationPdf,
  isPolicyIssuedStage,
  mintConfirmQueue,
  mintNeedsConfirm,
  parseMintPayload,
  policyForProduct,
  policyMintUnpublished,
  policyNeedsMintConfirm,
  quotesOnlyStageBlocked,
} from "./mint-gate";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("policy issued mint gate", () => {
  it("requires Bound + a live selected quote + a declaration PDF", () => {
    expect(isPolicyIssuedStage("Policy issued")).toBe(true);
    expect(isLateProductStage("policy_issued")).toBe(true);
    expect(isBoundReadyForIssue("bound")).toBe(true);
    expect(isBoundReadyForIssue("quotes")).toBe(false);
    expect(
      lateStageNeedsQuoteSelection({
        stage: "policy_issued",
        selectedQuoteIds: [],
        liveQuoteIds: ["q1"],
      }),
    ).toBe(true);

    expect(
      evaluateMintGate({
        currentStage: "bound",
        selectedQuoteIds: ["q1"],
        liveQuoteIds: ["q1"],
        surface: "quotes",
        docs: [],
      }).ok,
    ).toBe(false);
    expect(
      evaluateMintGate({
        currentStage: "bound",
        selectedQuoteIds: ["q1"],
        liveQuoteIds: ["q1"],
        surface: "quotes",
        docs: [],
      }),
    ).toEqual({ ok: false, reason: "need_dec" });

    expect(
      evaluateMintGate({
        currentStage: "quote_sent",
        selectedQuoteIds: ["q1"],
        liveQuoteIds: ["q1"],
        surface: "quotes",
        docs: [{ id: "d1", docType: "dec", filename: "dec.pdf", mimeType: "application/pdf" }],
      }),
    ).toEqual({ ok: false, reason: "need_bound" });

    const ok = evaluateMintGate({
      currentStage: "bound",
      selectedQuoteIds: ["q1"],
      liveQuoteIds: ["q1"],
      surface: "quotes",
      docs: [{ id: "d1", docType: "dec", filename: "rosa-dec.pdf", mimeType: "application/pdf" }],
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.dec.id).toBe("d1");
  });

  it("blocks Policy issued from header/chip — Quotes-only late move", () => {
    expect(quotesOnlyStageBlocked("policy_issued", "header")).toBe(true);
    expect(quotesOnlyStageBlocked("bound", "header")).toBe(true);
    expect(quotesOnlyStageBlocked("policy_issued", "quotes")).toBe(false);
    expect(
      evaluateMintGate({
        currentStage: "bound",
        selectedQuoteIds: ["q1"],
        liveQuoteIds: ["q1"],
        surface: "header",
        docs: [{ id: "d1", docType: "dec", filename: "dec.pdf", mimeType: "application/pdf" }],
      }),
    ).toEqual({ ok: false, reason: "quotes_only" });
  });

  it("finds a declarations PDF and ignores quote packets", () => {
    expect(
      isDeclarationPdf({ id: "q", docType: "agency_quote", filename: "quote.pdf", mimeType: "application/pdf" }),
    ).toBe(false);
    expect(
      isDeclarationPdf({
        id: "rosa",
        docType: "dec",
        slot: "source_doc",
        filename: "Rosa Castellanos Florida Peninsula HO3 Dec Page.pdf",
        mimeType: "application/pdf",
      }),
    ).toBe(true);
    expect(findDealDeclaration([{ id: "q", docType: "quote_pdf", filename: "quote.pdf" }])).toBeNull();
    expect(
      findDealDeclaration([
        { id: "photo", docType: "photo", filename: "house.jpg", mimeType: "image/jpeg" },
        { id: "named", filename: "Castellanos declaration.pdf", mimeType: "application/pdf" },
      ])?.id,
    ).toBe("named");
    expect(
      findDealDeclaration([
        { id: "named", filename: "Castellanos declaration.pdf", mimeType: "application/pdf" },
        { id: "typed", docType: "dec", filename: "scan.pdf", slot: "source_doc" },
      ])?.id,
    ).toBe("typed");
  });

  it("keeps one policy per product line", () => {
    const rows = [
      { id: "ho3", sourceProduct: "homeowners", lineOfBusiness: "HO" },
      { id: "dp3", sourceProduct: "landlord", lineOfBusiness: "HO" },
    ];
    expect(policyForProduct(rows, "homeowners", "HO")?.id).toBe("ho3");
    expect(policyForProduct(rows, "landlord", "HO")?.id).toBe("dp3");
    expect(policyForProduct(rows, "auto", "AUTO")).toBeNull();
  });
});

describe("unpublished confirm guard", () => {
  it("queues low-confidence Gemini and sold-basis mismatches — not a wall of high-confidence fields", () => {
    const fields = buildMintFields({
      threshold: CONFIDENCE_THRESHOLD,
      sold: { premium: "1840", coverageA: 310000, hurricaneDeductible: "2%" },
      sheet: {
        named_insured: { value: "Rosa Castellanos" },
        address1: { value: "12 Oak St" },
      },
      identity: { namedInsured: "Rosa Castellanos" },
      gemini: [
        { fieldKey: "policy_number", normalizedValue: "HO-rosa-1", confidence: 0.94, flagged: false },
        { fieldKey: "premium", normalizedValue: "2100", confidence: 0.91, flagged: false },
        { fieldKey: "coverage_a", normalizedValue: "310000", confidence: 0.93, flagged: false },
        { fieldKey: "named_insured", normalizedValue: "R. Castellanos", confidence: 0.62, flagged: true },
        { fieldKey: "effective_date", normalizedValue: "2026-10-01", confidence: 0.88, flagged: false },
      ],
    });
    const queue = mintConfirmQueue(fields);
    expect(fields.find((row) => row.key === "premium")?.value).toBe("1840");
    expect(fields.find((row) => row.key === "premium")?.soldValue).toBe("1840");
    expect(queue.map((row) => row.key)).toEqual(
      expect.arrayContaining(["premium", "named_insured"]),
    );
    expect(queue.map((row) => row.key)).not.toContain("coverage_a");
    expect(queue.length).toBeLessThan(fields.length);
    expect(mintNeedsConfirm({ status: "unpublished", soldBasis: { quoteId: "q1" }, fields })).toBe(
      true,
    );
  });

  it("blocks publish until the confirm queue is empty", () => {
    const draft = buildMintFields({
      sold: { premium: "1000" },
      gemini: [{ fieldKey: "premium", normalizedValue: "999", confidence: 0.5, flagged: true }],
    });
    const payload = { status: "unpublished" as const, soldBasis: { quoteId: "q" }, fields: draft };
    expect(canPublishMint(payload)).toBe(false);
    expect(policyMintUnpublished({ status: "unpublished", mintPayload: payload })).toBe(true);
    expect(policyNeedsMintConfirm({ status: "unpublished", mintPayload: payload })).toBe(true);

    let next = draft;
    for (const field of mintConfirmQueue(draft)) {
      next = confirmMintField(next, field.key, field.value || "ok");
    }
    expect(canPublishMint({ ...payload, fields: next })).toBe(true);
    expect(policyMintUnpublished({ publishedAt: new Date(), status: "active" })).toBe(false);
    expect(parseMintPayload({ status: "unpublished", soldBasis: { quoteId: "q" }, fields: [] })?.status).toBe(
      "unpublished",
    );
  });

  it("wires the mint action, Quotes CTA, and policy confirm guard", () => {
    expect(source("src/app/actions/product-stage.ts")).toMatch(/isPolicyIssuedStage/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/evaluateMintGate/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/unpublished/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/existingIsBook/);
    expect(source("src/components/deal/issue-policy-from-dec.tsx")).toMatch(
      /Issue policy from declaration/,
    );
    expect(source("src/app/policies/[id]/page.tsx")).toMatch(/policyNeedsMintConfirm/);
    expect(source("src/app/policies/[id]/page.tsx")).toMatch(/MintConfirmQueue/);
    expect(source("src/app/policies/new/page.tsx")).not.toMatch(/blank policy/i);
    expect(source("src/lib/desk/create-menu.ts")).not.toMatch(/\/policies\/new/);
  });
});
