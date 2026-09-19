import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FORM_TEMPLATE_SEEDS } from "@/lib/forms/catalog";
import { mapGeminiFieldsToLetter, letterExtractPayload } from "./extract";
import { extrasToFieldMap, letterFieldDefs, letterTemplateSlug } from "./fields";
import { buildAgencyLetterPdf, LETTER_FILL_DISCLAIMER, letterFillFilename } from "./fill";
import { buildLetterReviewRows, collectConfirmedFields, letterNeedsAgentConfirm } from "./review";
import {
  canFillLetterJob,
  canSendLetterJob,
  letterJobCards,
  letterStatusLabel,
} from "./status";
import { DOCUMENT_PIPELINE_TYPE_LABELS, isAgencyLetterDocType } from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("document pipeline fields", () => {
  it("uses ACORD, loss run, cancellation, and AOR templates already in the catalog", () => {
    expect(letterTemplateSlug("acord")).toBe("fl-ho3");
    expect(letterTemplateSlug("loss_run")).toBe("agency-loss-run");
    expect(letterTemplateSlug("cancellation")).toBe("agency-cancellation");
    expect(letterTemplateSlug("aor")).toBe("agency-aor");
    expect(FORM_TEMPLATE_SEEDS.map((row) => row.slug)).toEqual(
      expect.arrayContaining(["fl-ho3", "agency-loss-run", "agency-cancellation", "agency-aor"]),
    );
    expect(letterFieldDefs("cancellation").map((field) => field.key)).toEqual(
      expect.arrayContaining(["named_insured", "policy_number", "cancellation_date"]),
    );
    expect(letterFieldDefs("aor").map((field) => field.key)).toEqual(
      expect.arrayContaining(["named_insured", "prior_agency", "new_agency"]),
    );
    expect(letterFieldDefs("loss_run").map((field) => field.key)).toEqual(
      expect.arrayContaining(["named_insured", "requested_years", "request_reason"]),
    );
    expect(letterFieldDefs("acord").map((field) => field.key)).toEqual(
      expect.arrayContaining(["named_insured", "address1", "coverage_a"]),
    );
  });
});

describe("document pipeline extract", () => {
  it("maps Gemini dec keys onto cancellation fields and keeps deal extras as fallback", () => {
    const fields = mapGeminiFieldsToLetter(
      "cancellation",
      [
        { fieldKey: "named_insured", normalizedValue: "Elena Ruiz", confidence: 0.94 },
        { fieldKey: "policy_number", normalizedValue: "HO3-ELENA-2026", confidence: 0.91 },
        { fieldKey: "current_carrier", rawValue: "Citizens", confidence: 0.88 },
        { fieldKey: "mailing_address", normalizedValue: "412 Harbor Isle Dr", confidence: 0.8 },
      ],
      { phone: "(321) 555-0140", newAgency: "FitFirst" },
    );
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));
    expect(byKey.named_insured.extracted).toBe("Elena Ruiz");
    expect(byKey.named_insured.source).toBe("gemini");
    expect(byKey.policy_number.extracted).toBe("HO3-ELENA-2026");
    expect(byKey.phone.extracted).toBe("(321) 555-0140");
    expect(byKey.phone.source).toBe("deal");
    expect(byKey.cancellation_date.extracted).toBe("");
    expect(byKey.cancellation_date.source).toBe("blank");
    const aor = mapGeminiFieldsToLetter("aor", [], { newAgency: "FitFirst" });
    expect(aor.find((field) => field.key === "new_agency")?.extracted).toBe("FitFirst");
  });

  it("maps selling_agency onto prior_agency for an AOR pack", () => {
    const fields = mapGeminiFieldsToLetter("aor", [
      { fieldKey: "selling_agency", normalizedValue: "Coastal Bound Agency", confidence: 0.9 },
    ]);
    expect(fields.find((field) => field.key === "prior_agency")?.extracted).toBe("Coastal Bound Agency");
  });

  it("builds an empty Gemini payload from deal extras when extract has no fields", () => {
    const payload = letterExtractPayload("aor", [], { namedInsured: "Elena Ruiz" });
    expect(payload.engine).toBe("gemini");
    expect(payload.fields.find((field) => field.key === "named_insured")?.extracted).toBe("Elena Ruiz");
  });
});

describe("document pipeline review", () => {
  it("shows extracted vs confirmed and persists only typed values", () => {
    const fields = mapGeminiFieldsToLetter("cancellation", [
      { fieldKey: "named_insured", normalizedValue: "Elena Ruiz", confidence: 0.9 },
      { fieldKey: "policy_number", normalizedValue: "HO3-ELENA-2026", confidence: 0.9 },
    ]);
    const rows = buildLetterReviewRows(fields, { named_insured: "Elena M. Ruiz" });
    const named = rows.find((row) => row.key === "named_insured");
    const policy = rows.find((row) => row.key === "policy_number");
    expect(named?.extracted).toBe("Elena Ruiz");
    expect(named?.confirmed).toBe("Elena M. Ruiz");
    expect(named?.changed).toBe(true);
    expect(policy?.confirmed).toBe("HO3-ELENA-2026");
    expect(policy?.changed).toBe(false);
    expect(collectConfirmedFields({ named_insured: " Elena M. Ruiz ", policy_number: "" }, fields)).toEqual({
      named_insured: "Elena M. Ruiz",
    });
    expect(letterNeedsAgentConfirm({ confirmedAt: null, confirmedFields: {} })).toBe(true);
    expect(letterNeedsAgentConfirm({ confirmedAt: new Date(), confirmedFields: { named_insured: "Elena" } })).toBe(
      false,
    );
  });
});

describe("document pipeline status", () => {
  it("always shows ACORD, loss run, Cancellation, and AOR cards with status chips", () => {
    const cards = letterJobCards([
      {
        id: "job-1",
        type: "cancellation",
        status: "needs_review",
        sourceDocumentIds: ["doc-1"],
        createdAt: "2026-09-17T12:00:00.000Z",
      },
    ]);
    expect(cards.map((card) => card.type)).toEqual(["acord", "loss_run", "cancellation", "aor"]);
    expect(cards[2]).toMatchObject({
      label: DOCUMENT_PIPELINE_TYPE_LABELS.cancellation,
      status: "needs_review",
      statusLabel: "Needs review",
      jobId: "job-1",
    });
    expect(cards[3].jobId).toBeNull();
    expect(letterStatusLabel("extracting")).toBe("Extracting");
    expect(letterStatusLabel("needs_review")).toBe("Needs review");
    expect(letterStatusLabel("sent")).toBe("Sent");
    expect(letterStatusLabel("viewed")).toBe("Viewed");
    expect(letterStatusLabel("completed")).toBe("Completed");
    expect(letterStatusLabel("out_for_signature")).toBe("Sent");
    expect(letterStatusLabel("done")).toBe("Completed");
    expect(canFillLetterJob({ status: "needs_review", confirmedAt: null, confirmedFields: {} })).toBe(false);
    expect(
      canFillLetterJob({
        status: "needs_review",
        confirmedAt: new Date(),
        confirmedFields: { named_insured: "Elena Ruiz" },
      }),
    ).toBe(true);
    expect(canSendLetterJob()).toBe(false);
    expect(
      canSendLetterJob({
        status: "needs_review",
        confirmedAt: new Date(),
        confirmedFields: { named_insured: "Elena Ruiz" },
        signerEmail: "elena@example.com",
      }),
    ).toBe(true);
  });
});

describe("document pipeline fill", () => {
  it("builds a filled PDF from confirmed fields and stays honest about ACORD", async () => {
    expect(letterFillFilename("cancellation")).toBe("Cancellation-pack-filled.pdf");
    expect(letterFillFilename("aor")).toBe("AOR-pack-filled.pdf");
    expect(letterFillFilename("acord")).toBe("ACORD-HO3-filled.pdf");
    expect(letterFillFilename("loss_run")).toBe("Loss-run-request-filled.pdf");
    expect(LETTER_FILL_DISCLAIMER.toLowerCase()).toContain("not a licensed acord");
    const bytes = await buildAgencyLetterPdf({
      type: "cancellation",
      dealTitle: "Elena HO3",
      confirmed: {
        named_insured: "Elena Ruiz",
        policy_number: "HO3-ELENA-2026",
        cancellation_reason: "Rewritten to admitted market",
      },
    });
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    expect(bytes.length).toBeGreaterThan(400);
  });
});

describe("document pipeline wiring", () => {
  it("keeps Agency letters off the deal Documents rail and surfaces send on Documents", () => {
    const panel = source("src/components/deal/documents-panel.tsx");
    const page = source("src/app/deals/[id]/page.tsx");
    const queries = source("src/lib/db/queries.ts");
    const review = source("src/components/deal/agency-letter-review-sheet.tsx");
    const docs = source("src/app/documents/page.tsx");
    const loop = source("src/components/documents/form-send-loop.tsx");
    expect(panel).not.toMatch(/AgencyLettersRail/);
    expect(panel).not.toMatch(/letterJobs/);
    expect(panel).not.toMatch(/Agency letters/);
    expect(panel).toMatch(/DealFormSends/);
    expect(page).not.toMatch(/letterJobs/);
    expect(queries).not.toMatch(/letterJobs/);
    const sourceList = source("src/lib/documents/deal-docs-save.ts");
    expect(sourceList).toMatch(/agency_letter/);
    expect(sourceList).toMatch(/filled_letter/);
    expect(sourceList).toMatch(/isAgencyLetterDocType/);
    expect(sourceList).toMatch(/isHiddenAgencyLetterDoc/);
    expect(sourceList).toMatch(/cancellation\[- _\]\?pack/);
    expect(panel).not.toMatch(/grid-cols-/);
    const types = source("src/lib/document-pipeline/types.ts");
    expect(types).toMatch(/Cancellation/);
    expect(types).toMatch(/AOR/);
    expect(types).toMatch(/No Run Loss/);
    expect(types).toMatch(/Needs review/);
    expect(types).toMatch(/Out for signature|Sent/);
    expect(review).toMatch(/data-ff-letter-diff/);
    expect(review).toMatch(/Confirm fields/);
    expect(review).toMatch(/ACORD fill/);
    expect(review).toMatch(/Send to DocuSign/);
    expect(review).toMatch(/never/);
    expect(review).not.toMatch(/disabled data-ff-letter-sign/);
    expect(docs).toMatch(/FormSendLoop/);
    expect(loop).toMatch(/Send to DocuSign/);
    expect(loop).toMatch(/data-ff-form-send/);
    expect(loop).toMatch(/acord/);
    expect(loop).toMatch(/loss_run/);
    expect(loop).toMatch(/cancellation/);
    expect(loop).toMatch(/aor/);
  });

  it("adds the job table and sends DocuSign only after the agent clicks", () => {
    const sql = source("drizzle/0137_document_pipeline_jobs.sql");
    const envelopeSql = source("drizzle/0144_document_pipeline_envelopes.sql");
    const schema = source("src/lib/db/schema.ts");
    const action = source("src/app/actions/document-pipeline.ts");
    const journal = source("drizzle/meta/_journal.json");
    const envelopes = source("src/lib/integrations/docusign-envelopes.ts");
    const webhook = source("src/app/api/integrations/docusign/webhooks/route.ts");
    expect(sql).toMatch(/document_pipeline_jobs/);
    expect(sql).toMatch(/source_document_ids/);
    expect(sql).toMatch(/extract_payload/);
    expect(envelopeSql).toMatch(/envelope_id/);
    expect(schema).toMatch(/documentPipelineJobs/);
    expect(schema).toMatch(/sourceDocumentIds/);
    expect(schema).toMatch(/extractPayload/);
    expect(schema).toMatch(/confirmedFields/);
    expect(schema).toMatch(/envelopeId/);
    expect(journal).toMatch(/0137_document_pipeline_jobs/);
    expect(journal).toMatch(/0144_document_pipeline_envelopes/);
    expect(action).toMatch(/extractWithGeminiPdf/);
    expect(action).toMatch(/confirmAgencyLetterJob/);
    expect(action).toMatch(/fillAgencyLetterJob/);
    expect(action).toMatch(/sendDocumentPipelineForSignature/);
    expect(action).toMatch(/attemptDocuSignEnvelope/);
    expect(action).toMatch(/never auto-sends/);
    expect(action).not.toMatch(/sendEnvelope\(/);
    expect(action).not.toMatch(/createEnvelope/);
    expect(action).not.toMatch(/stripe/i);
    expect(envelopes).toMatch(/signHereTabs/);
    expect(envelopes).toMatch(/initialHereTabs/);
    expect(envelopes).toMatch(/dateSignedTabs/);
    expect(webhook).toMatch(/applyDocumentPipelineEnvelopeStatus/);
    expect(source("src/lib/document-pipeline/apply-envelope.ts")).toMatch(/applyDocumentPipelineEnvelopeStatus/);
    expect(source("src/app/esign/page.tsx")).toMatch(/SignedRetrievalDesk/);
    expect(source("src/app/esign/page.tsx")).toMatch(/listSignedRetrievalRows/);
    expect(source("src/lib/esign/retrieval.ts")).toMatch(/Applications \/ other/);
    expect(source("src/lib/integrations/docusign-envelopes.ts")).toMatch(/documents\/combined/);
    expect(source("src/lib/integrations/docusign-envelopes.ts")).toMatch(/resend_envelope/);
    expect(isAgencyLetterDocType("cancellation")).toBe(true);
    expect(isAgencyLetterDocType("aor")).toBe(true);
    expect(isAgencyLetterDocType("acord")).toBe(true);
    expect(isAgencyLetterDocType("loss_run")).toBe(true);
    expect(extrasToFieldMap({ namedInsured: "Elena" }).named_insured).toBe("Elena");
  });
});
