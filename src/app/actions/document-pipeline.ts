"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { AGENCY_BRAND, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, deals, documents, formFills, formTemplates, quoteSheets } from "@/lib/db/schema";
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
  isDocumentPipelineJobType,
  type DocumentPipelineDealExtras,
  type DocumentPipelineJobType,
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

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function dealDocumentsHref(dealId: string): string {
  return `/deals/${dealId}?tab=documents`;
}

function revalidateLetterPaths(dealId: string) {
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/documents");
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
      message: "Upload a source file to extract.",
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
    throw new Error("Choose Cancellation or AOR.");
  }
  const riskId = str(formData, "riskId") || null;
  const uploads = await collectUploadedFiles(formData);
  if (uploads.length === 0) {
    flashAction(dealDocumentsHref(dealId), "letter-need-file", "error");
  }
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
      tags: ["agency_letter", typeRaw],
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
  flashAction(dealDocumentsHref(dealId), "letter-extracting");
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

export async function fillAgencyLetterJob(formData: FormData): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const jobId = str(formData, "jobId");
  const job = await getDocumentPipelineJob(jobId);
  if (!job) return { ok: false, reason: "letter-need-confirm" };
  if (
    !canFillLetterJob({
      status: job.status as "needs_review",
      confirmedAt: job.confirmedAt,
      confirmedFields: job.confirmedFields,
    })
  ) {
    return { ok: false, reason: "letter-need-confirm" };
  }
  const type = job.type as DocumentPipelineJobType;
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
    tags: ["agency_letter", "filled", type],
  });
  await updateDocumentPipelineJob(job.id, {
    filledDocumentId: doc.id,
    formFillId,
    filledAt: new Date(),
    status: "done",
  });
  revalidateLetterPaths(job.dealId);
  return { ok: true };
}

export async function sendAgencyLetterForSignature(): Promise<{
  ok: false;
  reason: "letter-send-later";
  message: string;
}> {
  return {
    ok: false,
    reason: "letter-send-later",
    message:
      "DocuSign sandbox is connected for identity only. Envelope send is not wired. FitFirst never auto-sends.",
  };
}
