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
  mintFieldPolicyPatch,
  mintNeedsConfirm,
  mintProposedValue,
  parseMintPayload,
  policyForProduct,
  policyMintUnpublished,
  policyNeedsMintConfirm,
  quotesOnlyStageBlocked,
  mintFailureToast,
  evaluateMintExtract,
  mintGeminiValue,
  adoptMintFields,
  applyConfirmedMintFields,
  normalizeMintValue,
  MINT_FIELD_ALIASES,
  MINT_NO_MORTGAGE,
  MINT_PAYMENT_DIRECT,
  MINT_PAYMENT_MORTGAGEE,
  isHomeownersMintProduct,
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
    expect(fields.find((row) => row.key === "premium")?.value).toBe("2100");
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

  it("blocks hollow mint when Gemini is empty or missing policy number / premium", () => {
    expect(evaluateMintExtract([]).ok).toBe(false);
    expect(evaluateMintExtract([])).toMatchObject({ ok: false, reason: "need_dec_fields" });
    expect(
      evaluateMintExtract([
        {
          fieldKey: "named_insured",
          normalizedValue: "Rosa Castellanos",
          rawValue: "Rosa Castellanos",
          confidence: 0.9,
          flagged: false,
        },
      ]).ok,
    ).toBe(false);
    expect(
      evaluateMintExtract([
        {
          fieldKey: "policy_number",
          normalizedValue: "HO3 0140119 05 26",
          rawValue: null,
          confidence: 0.94,
          flagged: false,
        },
      ]).ok,
    ).toBe(false);

    const fields = buildMintFields({
      sold: { premium: "2463", coverageA: 250000 },
      gemini: [
        { fieldKey: "named_insured", normalizedValue: "Rosa Castellanos", confidence: 0.9, flagged: false },
      ],
    });
    const premium = fields.find((row) => row.key === "premium");
    expect(premium?.value).toBe("");
    expect(premium?.source).not.toBe("quote");
    expect(premium?.confirmed).toBe(false);
    expect(premium?.soldValue).toBe("2463");
    expect(premium?.geminiValue).toBeNull();
    expect(mintFieldPolicyPatch(fields).premium).toBeNull();
    expect(mintFailureToast("need_dec_fields")).toEqual({ key: "need-dec-fields", kind: "error" });
  });

  it("maps Florida Peninsula aliases onto mint policy number and premium", () => {
    const rows = [
      { fieldKey: "policy_no", normalizedValue: "HO3 0140119 05 26", rawValue: null, confidence: 0.95, flagged: false },
      { fieldKey: "total_premium", normalizedValue: "3383", rawValue: null, confidence: 0.94, flagged: false },
      { fieldKey: "eff_date", normalizedValue: "2026-09-01", rawValue: null, confidence: 0.9, flagged: false },
    ];
    expect(mintGeminiValue(rows, "policy_number")).toBe("HO3 0140119 05 26");
    expect(mintGeminiValue(rows, "premium")).toBe("3383");
    expect(evaluateMintExtract(rows)).toMatchObject({
      ok: true,
      policyNumber: "HO3 0140119 05 26",
      premium: "3383",
      effectiveDate: "2026-09-01",
    });
    const fields = buildMintFields({
      sold: { premium: "2463" },
      gemini: rows,
    });
    expect(fields.find((row) => row.key === "premium")?.value).toBe("3383");
    expect(fields.find((row) => row.key === "premium")?.source).toBe("gemini");
    expect(fields.find((row) => row.key === "policy_number")?.geminiValue).toBe("HO3 0140119 05 26");
  });

  it("uses declaration premium over a bound stub quote", () => {
    const fields = buildMintFields({
      sold: { premium: "2463", coverageA: 250000 },
      gemini: [
        { fieldKey: "current_premium", normalizedValue: "3383", confidence: 0.94, flagged: false },
        { fieldKey: "coverage_a", normalizedValue: "275000", confidence: 0.92, flagged: false },
      ],
    });
    const premium = fields.find((row) => row.key === "premium");
    const dwelling = fields.find((row) => row.key === "coverage_a");
    expect(premium?.value).toBe("3383");
    expect(premium?.source).toBe("gemini");
    expect(premium?.soldValue).toBe("2463");
    expect(premium?.flagged).toBe(true);
    expect(dwelling?.value).toBe("275000");
    expect(mintFieldPolicyPatch(fields).premium).toBe("3383");
  });

  it("Looks right confirms premium whether Gemini sent $3,383, 3383, or 3,383.00", () => {
    const premium = {
      key: "premium",
      label: "Premium",
      value: "2463",
      confidence: 0.94,
      source: "quote" as const,
      flagged: true,
      confirmed: false,
      soldValue: "2463",
      sheetValue: null,
      geminiValue: "$3,383",
    };
    for (const raw of ["$3,383", "3383", "3,383.00"] as const) {
      expect(normalizeMintValue("premium", raw)).toBe("3383");
      const accepted = confirmMintField([premium], "premium", raw);
      expect(accepted[0]?.value).toBe("3383");
      expect(accepted[0]?.confirmed).toBe(true);
      expect(accepted[0]?.flagged).toBe(false);
    }
    expect(mintProposedValue({ ...premium, geminiValue: "$3,383" })).toBe("3383");
    expect(mintProposedValue({ ...premium, geminiValue: "3,383.00" })).toBe("3383");
  });

  it("advances from server-updated fields and ignores a stale refresh", () => {
    const premium = {
      key: "premium",
      label: "Premium",
      value: "3383",
      confidence: 0.94,
      source: "gemini" as const,
      flagged: true,
      confirmed: false,
      soldValue: "2463",
      sheetValue: null,
      geminiValue: "3383",
    };
    const named = {
      key: "named_insured",
      label: "Named insured",
      value: "Rosa",
      confidence: 0.6,
      source: "gemini" as const,
      flagged: true,
      confirmed: false,
      soldValue: null,
      sheetValue: null,
      geminiValue: "Rosa",
    };
    const server = applyConfirmedMintFields([premium, named], "premium", "$3,383", [
      { ...premium, value: "3383", confirmed: true, flagged: false, source: "agent" },
      named,
    ]);
    expect(mintConfirmQueue(server).map((row) => row.key)).toEqual(["named_insured"]);
    const localOnly = applyConfirmedMintFields([premium, named], "premium", "3,383.00");
    expect(localOnly.find((row) => row.key === "premium")?.confirmed).toBe(true);
    expect(mintConfirmQueue(localOnly).map((row) => row.key)).toEqual(["named_insured"]);
    expect(adoptMintFields(localOnly, [premium, named]).find((row) => row.key === "premium")?.confirmed).toBe(
      true,
    );
    expect(mintFailureToast("missing")).toEqual({ key: "mint-policy-missing", kind: "error" });
    expect(mintFailureToast("invalid")).toEqual({ key: "mint-confirm-invalid", kind: "error" });
  });

  it("Looks right accepts the Gemini/deal proposed value, not a blank or stub overwrite", () => {
    const stale = {
      key: "premium",
      label: "Premium",
      value: "2463",
      confidence: 0.94,
      source: "quote" as const,
      flagged: true,
      confirmed: false,
      soldValue: "2463",
      sheetValue: null,
      geminiValue: "3383",
    };
    expect(mintProposedValue(stale)).toBe("3383");
    const accepted = confirmMintField([stale], "premium", mintProposedValue(stale));
    expect(accepted[0]?.value).toBe("3383");
    expect(accepted[0]?.confirmed).toBe(true);
    expect(accepted[0]?.flagged).toBe(false);

    const emptyExtract = {
      ...stale,
      value: "",
      geminiValue: null,
      sheetValue: null,
      soldValue: null,
    };
    expect(mintProposedValue(emptyExtract)).toBe("");
  });

  it("copies deal/sheet extras when the dec omitted them", () => {
    const fields = buildMintFields({
      sheet: {
        mortgagee_name: { value: "First Community Bank ISAOA" },
        roof_year: { value: "2018" },
      },
      identity: {
        propertyAddress: "412 Harbor Isle Dr, Melbourne, FL 32901",
        producer: "Javy Rivera",
        sellingAgency: "afa",
        insuranceType: "P&C",
        form: "HO3",
        billingFrequency: "annual",
        renewalDate: "2027-09-01",
      },
    });
    expect(fields.find((row) => row.key === "mailing_address")?.value).toContain("Harbor Isle");
    expect(fields.find((row) => row.key === "producer")?.value).toBe("Javy Rivera");
    expect(fields.find((row) => row.key === "selling_agency")?.value).toBe("afa");
    expect(fields.find((row) => row.key === "mortgagee")?.value).toContain("First Community");
    expect(fields.find((row) => row.key === "roof_year")?.value).toBe("2018");
    expect(fields.find((row) => row.key === "billing_frequency")?.value).toBe("annual");
    expect(fields.find((row) => row.key === "form")?.value).toBe("HO3");
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
    expect(source("src/components/policy/mint-confirm-queue.tsx")).toMatch(/Looks right/);
    expect(source("src/components/policy/mint-confirm-queue.tsx")).toMatch(/mintProposedValue/);
    expect(source("src/components/policy/mint-confirm-queue.tsx")).toMatch(/mintFailureToast/);
    expect(source("src/components/policy/mint-confirm-queue.tsx")).toMatch(/applyConfirmedMintFields/);
    expect(source("src/components/policy/mint-confirm-queue.tsx")).toMatch(/adoptMintFields/);
    expect(source("src/components/policy/mint-confirm-queue.tsx")).toMatch(/data-ff-mint-proposed/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(
      /remaining: fields\.filter\(\(row\) => !row\.confirmed\)\.length,\s*fields,/,
    );
    expect(source("src/lib/flash.ts")).toMatch(/mint-policy-missing/);
    expect(source("src/components/policy/mint-confirm-queue.tsx")).not.toMatch(
      /if \(!result\.ok\) return;/,
    );
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/mintFieldPolicyPatch/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/loadGeminiRows/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/readStoredFile/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/if \(!extracted\.ok\)/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/evaluateMintExtract/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/if \(!extractGate\.ok\)/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(
      /force: Boolean\(input\.force\) \|\| remintUnpublished/,
    );
    expect(source("src/app/actions/policy-mint.ts")).not.toMatch(/FF-MINT/);
    expect(source("src/app/actions/policy-mint.ts")).not.toMatch(/booked\.premium \|\| quote\.premium/);
    expect(source("src/lib/policy/load-gemini-rows.ts")).toMatch(/need_dec_file/);
    expect(source("src/app/actions/policy-mint.ts")).not.toMatch(/readFile\(path\.join\(uploadRoot/);
    expect(source("src/lib/extraction/gemini/prompt.ts")).toMatch(/selling_agency/);
    expect(source("src/lib/extraction/gemini/prompt.ts")).toMatch(/location_description/);
    expect(source("src/lib/extraction/gemini/prompt.ts")).toMatch(/NEVER copy Insured \/ mailing/);
    expect(source("src/lib/extraction/gemini/prompt.ts")).toMatch(/renewal_date = policy expiration/);
    expect(source("src/lib/extraction/gemini/prompt.ts")).toMatch(/No mortgage/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/buildMintFields\(\{[\s\S]*?product,/);
    expect(source("src/lib/policy/change-log.ts")).toMatch(/Policy created/);
    expect(source("src/components/deal/create-policy-from-dec-modal.tsx")).toMatch(/mintFailureToast/);
    expect(source("src/components/deal/issue-policy-from-dec.tsx")).toMatch(/mint\(undefined, true\)/);
    expect(source("src/lib/flash.ts")).toMatch(/need-dec-fields/);
    expect(mintFailureToast("need_dec_file")).toEqual({ key: "need-dec-file", kind: "error" });
    expect(mintFailureToast("need_gemini")).toEqual({ key: "gemini-needs-key", kind: "error" });
    expect(mintFailureToast("need_dec_fields")).toEqual({ key: "need-dec-fields", kind: "error" });
  });
});

describe("rosa desk training mint proposals", () => {
  it("prefers property / location-description over mailing when they differ", () => {
    expect(MINT_FIELD_ALIASES.mailing_address[0]).toBe("property_address");
    expect(MINT_FIELD_ALIASES.mailing_address.indexOf("property_address")).toBeLessThan(
      MINT_FIELD_ALIASES.mailing_address.indexOf("mailing_address"),
    );

    const rows = [
      { fieldKey: "mailing_address", normalizedValue: "8561 SW 85th St Ave", confidence: 0.94, flagged: false },
      {
        fieldKey: "location_description",
        normalizedValue: "18025 Cypress Point Rd, Fort Myers, FL 33912",
        confidence: 0.93,
        flagged: false,
      },
    ];
    expect(mintGeminiValue(rows, "mailing_address")).toMatch(/Cypress Point/);

    const fields = buildMintFields({
      product: "homeowners",
      gemini: rows,
      sheet: {
        mailing_address: { value: "8561 SW 85th St Ave" },
        address1: { value: "18025 Cypress Point Rd" },
      },
      identity: {
        mailingAddress: "8561 SW 85th St Ave",
        propertyAddress: "18025 Cypress Point Rd, Fort Myers, FL 33912",
      },
    });
    expect(fields.find((row) => row.key === "mailing_address")?.value).toMatch(/Cypress Point/);
  });

  it("prefers deal/sheet property over Gemini mailing (Rosa)", () => {
    const fields = buildMintFields({
      product: "homeowners",
      gemini: [
        {
          fieldKey: "mailing_address",
          normalizedValue: "8561 SW 85th St Ave",
          confidence: 0.95,
          flagged: false,
        },
      ],
      identity: { propertyAddress: "18025 Cypress Point Rd, Fort Myers, FL 33912" },
    });
    const location = fields.find((row) => row.key === "mailing_address");
    expect(location?.value).toMatch(/Cypress Point/);
    expect(location?.value).not.toMatch(/8561/);
    expect(location?.source).toBe("sheet");
  });

  it("sets HO renewal and next due from expiration, billing annual", () => {
    const fields = buildMintFields({
      product: "homeowners",
      gemini: [
        { fieldKey: "expiration_date", normalizedValue: "2027-09-01", confidence: 0.94, flagged: false },
        { fieldKey: "effective_date", normalizedValue: "2026-09-01", confidence: 0.94, flagged: false },
        { fieldKey: "policy_number", normalizedValue: "HO3 0140119 05 26", confidence: 0.95, flagged: false },
        { fieldKey: "premium", normalizedValue: "3383", confidence: 0.94, flagged: false },
      ],
    });
    expect(fields.find((row) => row.key === "renewal_date")?.value).toBe("2027-09-01");
    expect(fields.find((row) => row.key === "billing_frequency")?.value).toBe("annual");
    expect(fields.find((row) => row.key === "next_due")?.value).toBe("2027-09-01");
  });

  it("proposes No mortgage and client direct when HO mortgagee is blank", () => {
    const fields = buildMintFields({ product: "homeowners" });
    expect(fields.find((row) => row.key === "mortgagee")?.value).toBe(MINT_NO_MORTGAGE);
    expect(fields.find((row) => row.key === "payment_method")?.value).toBe(MINT_PAYMENT_DIRECT);
    expect(normalizeMintValue("mortgagee", "None")).toBe(MINT_NO_MORTGAGE);
  });

  it("branches payment method to escrow when a mortgagee is present", () => {
    const fields = buildMintFields({
      product: "homeowners",
      gemini: [
        {
          fieldKey: "mortgagee",
          normalizedValue: "First Community Bank ISAOA",
          confidence: 0.92,
          flagged: false,
        },
      ],
    });
    expect(fields.find((row) => row.key === "mortgagee")?.value).toContain("First Community");
    expect(fields.find((row) => row.key === "payment_method")?.value).toBe(MINT_PAYMENT_MORTGAGEE);
    expect(normalizeMintValue("payment_method", "escrow / mortgagee billed")).toBe(MINT_PAYMENT_MORTGAGEE);
  });

  it("fills roof age from the sheet and leaves it empty when the sheet lacks it", () => {
    const withRoof = buildMintFields({
      product: "homeowners",
      sheet: { roof_year: { value: "2018" } },
    });
    expect(withRoof.find((row) => row.key === "roof_year")?.value).toBe("2018");

    const withoutRoof = buildMintFields({ product: "homeowners" });
    expect(withoutRoof.find((row) => row.key === "roof_year")?.value).toBe("");
  });

  it("does not force HO annual or No mortgage onto Auto or Flood", () => {
    expect(isHomeownersMintProduct("auto")).toBe(false);
    expect(isHomeownersMintProduct("flood")).toBe(false);
    expect(isHomeownersMintProduct("homeowners")).toBe(true);

    const auto = buildMintFields({
      product: "auto",
      gemini: [
        { fieldKey: "expiration_date", normalizedValue: "2027-03-01", confidence: 0.9, flagged: false },
        { fieldKey: "billing_frequency", normalizedValue: "6 months", confidence: 0.9, flagged: false },
      ],
    });
    expect(auto.find((row) => row.key === "billing_frequency")?.value).toBe("semiannual");
    expect(auto.find((row) => row.key === "mortgagee")?.value).toBe("");
    expect(auto.find((row) => row.key === "payment_method")?.value).toBe("");
    expect(auto.find((row) => row.key === "next_due")?.value).toBe("");
    expect(auto.find((row) => row.key === "renewal_date")?.value).toBe("2027-03-01");

    const flood = buildMintFields({ product: "flood" });
    expect(flood.find((row) => row.key === "billing_frequency")?.value).toBe("");
    expect(flood.find((row) => row.key === "mortgagee")?.value).toBe("");
  });
});
