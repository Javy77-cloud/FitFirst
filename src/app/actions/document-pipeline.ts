"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { AGENCY_BRAND, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, deals, documents, formFills, formTemplates, quoteSheets, signatureEnvelopes } from "@/lib/db/schema";
import { applyDocumentPipelineEnvelopeStatus } from "@/lib/document-pipeline/apply-envelope";
import { envelopeTimestamps } from "@/lib/document-pipeline/envelope-status";
import { letterExtractPayload } from "@/lib/document-pipeline/extract";
import {
  buildAgencyLetterPdf,
  LETTER_FILL_SLOT,
  letterFillDocType,
  letterFillFilename,
} from "@/lib/document-pipeline/fill";
import { letterTemplateSlug } from "@/lib/document-pipeline/fields";
import { collectConfirmedFields } from "@/lib/document-pipeline/review";
import { canFillLetterJob } from "@/lib/document-pipeline/status";
import {
  createDocumentPipelineJob,
  getDocumentPipelineJob,
  updateDocumentPipelineJob,
} from "@/lib/document-pipeline/store";
import {
  DOCUMENT_PIPELINE_TYPE_LABELS,
  isDocumentPipelineJobType,
  type DocumentPipelineDealExtras,
  type DocumentPipelineJobType,
  type DocumentPipelineStatus,
} from "@/lib/document-pipeline/types";
import { collectUploadedFiles } from "@/lib/documents/uploaded-file";
import {
  extractWithGeminiPdf,
  loadGeminiApiKey,
  MISSING_GEMINI_KEY_MESSAGE,
} from "@/lib/extraction/gemini";
import { inferMimeFromName } from "@/lib/files/urls";
import { readStoredFile } from "@/lib/files/object-store";
import { flashAction } from "@/lib/flash-action";
import { attemptDocuSignEnvelope, pollDocuSignEnvelope } from "@/lib/integrations/docusign-envelopes";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function dealDocumentsHref(dealId: string): string {
  return `/deals/${dealId}?tab=documents`;
}

function revalidateLetterPaths(dealId: string) {
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/documents");
  revalidatePath("/esign");
}

async function loadDealExtras(dealId: string): Promise<DocumentPipelineDealExtras> {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)));
  const contact = deal?.contactId
    ? (
        await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, deal.contactId))
      )[0]
    : null;
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.tenantId, DEFAULT_TENANT_ID), eq(quoteSheets.dealId, dealId)));
  const values = sheet?.values ?? {};
  return {
    namedInsured: deal?.primaryNamedInsured ?? (contact ? `${contact.firstName} ${contact.lastName}` : null),
    phone: contact?.phone ?? values.phone?.value ?? null,
    email: contact?.email ?? values.email?.value ?? null,
    mailing: contact?.mailingAddress ?? values.mailing_address?.value ?? null,
    currentCarrier: values.current_carrier?.value ?? null,
    policyNumber: values.policy_number?.value ?? null,
    effectiveDate: values.effective_date?.value ?? null,
    newAgency: AGENCY_BRAND.name,
    address1: values.address1?.value ?? null,
    city: values.city?.value ?? null,
    county: values.county?.value ?? null,
    state: values.state?.value ?? null,
    zip: values.zip?.value ?? null,
    yearBuilt: values.year_built?.value ?? null,
    construction: values.construction?.value ?? values.construction_type?.value ?? null,
    occupancy: values.occupancy?.value ?? null,
    roofYear: values.roof_year?.value ?? null,
    roofCovering: values.roof_covering?.value ?? null,
    openingProtection: values.opening_protection?.value ?? null,
    coverageA: values.coverage_a?.value ?? null,
  };
}

export async function runAgencyLetterExtract(jobId: string): Promise<void> {
  const job = await getDocumentPipelineJob(jobId);
  if (!job) return;
  const extras = await loadDealExtras(job.dealId);
  const sourceId = job.sourceDocumentIds[0];
  if (!sourceId) {
    await updateDocumentPipelineJob(jobId, {
      status: "needs_review",
      extractPayload: letterExtractPayload(job.type as DocumentPipelineJobType, [], extras),
      message: "Prefill from deal fields. Upload a declaration to extract more.",
      extractedAt: new Date(),
    });
    return;
  }
  const [doc] = await db.select().from(documents).where(eq(documents.id, sourceId));
  const bytes = doc ? await readStoredFile(doc.storagePath) : null;
  const key = ((await loadGeminiApiKey()) ?? "").trim();
  if (!key || !bytes) {
    await updateDocumentPipelineJob(jobId, {
      status: "needs_review",
      extractPayload: letterExtractPayload(job.type as DocumentPipelineJobType, [], extras),
      message: !key ? MISSING_GEMINI_KEY_MESSAGE : "Could not read the source file. Re-upload and try again.",
      extractedAt: new Date(),
    });
    return;
  }
  try {
    const gemini = await extractWithGeminiPdf(bytes, job.type, {
      apiKey: key,
      mimeType: doc?.mimeType,
      filename: doc?.filename,
    });
    if (!gemini.ok) {
      await updateDocumentPipelineJob(jobId, {
        status: "needs_review",
        extractPayload: letterExtractPayload(job.type as DocumentPipelineJobType, [], extras, gemini.rawText),
        message: gemini.message || "Gemini extract failed. Review and type values, or re-upload.",
        extractedAt: new Date(),
      });
      return;
    }
    await updateDocumentPipelineJob(jobId, {
      status: "needs_review",
      extractPayload: letterExtractPayload(
        job.type as DocumentPipelineJobType,
        gemini.result.fields,
        extras,
        gemini.rawText,
      ),
      message: null,
      extractedAt: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini extract failed.";
    await updateDocumentPipelineJob(jobId, {
      status: "needs_review",
      extractPayload: letterExtractPayload(job.type as DocumentPipelineJobType, [], extras),
      message,
      extractedAt: new Date(),
    });
  }
}

export async function startAgencyLetterJob(formData: FormData) {
  const dealId = str(formData, "dealId");
  const typeRaw = str(formData, "type");
  if (!dealId || !isDocumentPipelineJobType(typeRaw)) {
    throw new Error("Choose ACORD, No Run Loss, Cancellation, or AOR.");
  }
  const riskId = str(formData, "riskId") || null;
  const uploads = await collectUploadedFiles(formData);
  const sourceIds: string[] = [];
  for (const upload of uploads) {
    const doc = await persistFile({
      dealId,
      riskId,
      filename: upload.filename,
      mimeType: inferMimeFromName(upload.filename, upload.file.type || "application/octet-stream"),
      buffer: upload.bytes,
      docType: typeRaw,
      slot: "source_doc",
      tags: ["form_send", typeRaw],
    });
    sourceIds.push(doc.id);
  }
  const job = await createDocumentPipelineJob({
    dealId,
    type: typeRaw,
    sourceDocumentIds: sourceIds,
    status: "extracting",
  });
  after(() => runAgencyLetterExtract(job.id));
  revalidateLetterPaths(dealId);
  const stay = str(formData, "next");
  flashAction(stay.startsWith("/") ? stay : dealDocumentsHref(dealId), "letter-extracting");
}

export async function confirmAgencyLetterJob(formData: FormData): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const jobId = str(formData, "jobId");
  const job = await getDocumentPipelineJob(jobId);
  if (!job) return { ok: false, reason: "letter-need-confirm" };
  const extractFields = job.extractPayload.fields ?? [];
  const confirmed = collectConfirmedFields(
    Object.fromEntries(extractFields.map((field) => [field.key, str(formData, `value_${field.key}`)])),
    extractFields.map((field) => field.key),
  );
  if (Object.keys(confirmed).length === 0) {
    return { ok: false, reason: "letter-need-confirm" };
  }
  await updateDocumentPipelineJob(job.id, {
    confirmedFields: confirmed,
    confirmedAt: new Date(),
    status: "needs_review",
    message: null,
  });
  revalidateLetterPaths(job.dealId);
  return { ok: true };
}

async function fillConfirmedJob(jobId: string): Promise<{
  ok: boolean;
  reason?: string;
  documentId?: string;
  filename?: string;
  mimeType?: string;
  storagePath?: string;
  type?: DocumentPipelineJobType;
  dealId?: string;
}> {
  const job = await getDocumentPipelineJob(jobId);
  if (!job) return { ok: false, reason: "letter-need-confirm" };
  if (
    !canFillLetterJob({
      status: job.status as DocumentPipelineStatus,
      confirmedAt: job.confirmedAt,
      confirmedFields: job.confirmedFields,
    })
  ) {
    return { ok: false, reason: "letter-need-confirm" };
  }
  const type = job.type as DocumentPipelineJobType;
  if (job.filledDocumentId) {
    const [existing] = await db.select().from(documents).where(eq(documents.id, job.filledDocumentId));
    if (existing) {
      return {
        ok: true,
        documentId: existing.id,
        filename: existing.filename,
        mimeType: existing.mimeType,
        storagePath: existing.storagePath,
        type,
        dealId: job.dealId,
      };
    }
  }
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, job.dealId)));
  const bytes = await buildAgencyLetterPdf({
    type,
    dealTitle: deal?.title,
    confirmed: job.confirmedFields,
    agencyName: AGENCY_BRAND.name,
  });
  const [template] = await db
    .select()
    .from(formTemplates)
    .where(
      and(eq(formTemplates.tenantId, DEFAULT_TENANT_ID), eq(formTemplates.slug, letterTemplateSlug(type))),
    );
  let formFillId = job.formFillId ?? null;
  if (template) {
    if (formFillId) {
      await db
        .update(formFills)
        .set({ values: job.confirmedFields, status: "filled", updatedAt: new Date() })
        .where(and(eq(formFills.tenantId, DEFAULT_TENANT_ID), eq(formFills.id, formFillId)));
    } else {
      const [fill] = await db
        .insert(formFills)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          formTemplateId: template.id,
          sourceDocumentId: job.sourceDocumentIds[0] ?? null,
          folderId: template.folderId,
          values: job.confirmedFields,
          status: "filled",
        })
        .returning();
      formFillId = fill?.id ?? null;
    }
  }
  const doc = await persistFile({
    dealId: job.dealId,
    filename: letterFillFilename(type),
    mimeType: "application/pdf",
    buffer: bytes,
    docType: letterFillDocType(type),
    slot: LETTER_FILL_SLOT,
    fillable: true,
    formTemplateId: template?.id ?? null,
    tags: ["form_send", "filled", type],
  });
  await updateDocumentPipelineJob(job.id, {
    filledDocumentId: doc.id,
    formFillId,
    filledAt: new Date(),
    status: "needs_review",
  });
  return {
    ok: true,
    documentId: doc.id,
    filename: doc.filename,
    mimeType: doc.mimeType,
    storagePath: doc.storagePath,
    type,
    dealId: job.dealId,
  };
}

export async function fillAgencyLetterJob(formData: FormData): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const result = await fillConfirmedJob(str(formData, "jobId"));
  if (!result.ok || !result.dealId) return { ok: false, reason: result.reason };
  revalidateLetterPaths(result.dealId);
  return { ok: true };
}

export async function sendDocumentPipelineForSignature(formData: FormData): Promise<{
  ok: boolean;
  reason?: string;
  message?: string;
  envelopeId?: string;
  status?: string;
}> {
  const jobId = str(formData, "jobId");
  const job = await getDocumentPipelineJob(jobId);
  if (!job) return { ok: false, reason: "letter-need-confirm" };

  const extractFields = job.extractPayload.fields ?? [];
  if (extractFields.some((field) => formData.has(`value_${field.key}`))) {
    const confirmed = collectConfirmedFields(
      Object.fromEntries(extractFields.map((field) => [field.key, str(formData, `value_${field.key}`)])),
      extractFields.map((field) => field.key),
    );
    if (Object.keys(confirmed).length === 0) {
      return { ok: false, reason: "letter-need-confirm" };
    }
    await updateDocumentPipelineJob(job.id, {
      confirmedFields: confirmed,
      confirmedAt: new Date(),
      status: "needs_review",
      message: null,
    });
  }

  const extras = await loadDealExtras(job.dealId);
  const signerName =
    str(formData, "signerName") || extras.namedInsured || "Deal contact";
  const signerEmail = str(formData, "signerEmail") || extras.email || "";
  if (!signerEmail) {
    return { ok: false, reason: "letter-need-signer", message: "Deal contact needs an email before send." };
  }

  const filled = await fillConfirmedJob(job.id);
  if (!filled.ok || !filled.storagePath || !filled.filename || !filled.documentId) {
    return { ok: false, reason: filled.reason ?? "letter-need-confirm" };
  }

  const type = filled.type ?? (job.type as DocumentPipelineJobType);
  const send = await attemptDocuSignEnvelope({
    filename: filled.filename,
    mimeType: filled.mimeType ?? "application/pdf",
    storagePath: filled.storagePath,
    signerName,
    signerEmail,
    subject: `Please sign ${DOCUMENT_PIPELINE_TYPE_LABELS[type]}`,
  });

  if (send.status !== "sent" || !send.envelopeId) {
    await updateDocumentPipelineJob(job.id, {
      signerName,
      signerEmail,
      message: send.message,
    });
    revalidateLetterPaths(job.dealId);
    return {
      ok: false,
      reason: send.status === "needs_connect" ? "letter-need-connect" : "letter-sandbox-error",
      message: send.message,
    };
  }

  const now = new Date();
  await updateDocumentPipelineJob(job.id, {
    status: "sent",
    envelopeId: send.envelopeId,
    envelopeStatus: "sent",
    signerName,
    signerEmail,
    message: send.message,
    ...envelopeTimestamps("sent", now),
  });
  await db.insert(signatureEnvelopes).values({
    tenantId: DEFAULT_TENANT_ID,
    documentId: filled.documentId,
    dealId: job.dealId,
    provider: "docusign",
    mode: "vendor",
    status: "sent",
    signerName,
    signerEmail,
    subject: `Please sign ${DOCUMENT_PIPELINE_TYPE_LABELS[type]}`,
    lastProviderResult: `sent:${send.envelopeId}`,
    sentAt: now,
  });
  revalidateLetterPaths(job.dealId);
  return { ok: true, envelopeId: send.envelopeId, status: "sent", message: send.message };
}

/** Agent-clicked send only. FitFirst never auto-sends. */
export async function sendAgencyLetterForSignature(formData?: FormData): Promise<{
  ok: boolean;
  reason?: string;
  message?: string;
  envelopeId?: string;
  status?: string;
}> {
  if (!formData) {
    return {
      ok: false,
      reason: "letter-need-confirm",
      message: "Confirm fields, then click Send to DocuSign. FitFirst never auto-sends.",
    };
  }
  return sendDocumentPipelineForSignature(formData);
}

export async function refreshDocumentPipelineEnvelope(formData: FormData): Promise<{
  ok: boolean;
  reason?: string;
  status?: string;
  message?: string;
}> {
  const job = await getDocumentPipelineJob(str(formData, "jobId"));
  if (!job?.envelopeId) return { ok: false, reason: "letter-need-confirm" };
  const poll = await pollDocuSignEnvelope(job.envelopeId);
  if (!poll.ok) {
    return { ok: false, reason: "letter-sandbox-error", message: poll.message };
  }
  await applyDocumentPipelineEnvelopeStatus({
    envelopeId: job.envelopeId,
    status: poll.status,
    rawStatus: poll.rawStatus,
  });
  return { ok: true, status: poll.status ?? undefined };
}
