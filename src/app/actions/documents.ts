"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CONFIDENCE_THRESHOLD, DEFAULT_TENANT_ID, type ShopLine } from "@/lib/domain";
import { coerceDealUploadDocType, matchDealLookup, slotForDocType } from "@/lib/deals/lookup";
import { db } from "@/lib/db";
import { listDealLookup } from "@/lib/db/queries";
import {
  alerts,
  deals,
  documentFolders,
  documentVersions,
  documents,
  extractedFields,
  extractionJobs,
  fillFeedbackLogs,
  fillLearningLogs,
  formFills,
  policies,
  quoteSheets,
  risks,
  signatureEnvelopes,
} from "@/lib/db/schema";
import {
  clearExtractedSheetCells,
  uploadedFileDeleteMode,
} from "@/lib/documents/delete-file";
import { inferDocType } from "@/lib/ingest/identity";
import { runFillDealSheets } from "@/app/actions/quote-sheet";
import { libraryHref } from "@/lib/documents/library";
import { recordInitialDocumentVersion } from "@/lib/documents/version-store";
import {
  coerceRiskValue,
  extractFieldsFromText,
  fieldKeyToRiskColumn,
} from "@/lib/extraction/extract";
import { inferMimeFromName } from "@/lib/files/urls";
import { classifyIngest } from "@/lib/extraction/ocr";
import { readUploadText } from "@/lib/extraction/pdf";
import {
  CLEAN_DEC_FILENAME,
  CLEAN_DEC_TEXT,
  MELBOURNE_FOUR_POINT_FILENAME,
  MELBOURNE_FOUR_POINT_TEXT,
  MESSY_WIND_MIT_FILENAME,
  MESSY_WIND_MIT_TEXT,
} from "@/lib/fixtures/sample-docs";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

function optionalId(form: FormData, key: string): string | null {
  const value = String(form.get(key) ?? "").trim();
  return value || null;
}

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function resolveFolderId(input: {
  folderId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
}): Promise<string | null> {
  if (input.folderId) return input.folderId;
  if (input.dealId) {
    const [folder] = await db
      .select()
      .from(documentFolders)
      .where(and(eq(documentFolders.tenantId, DEFAULT_TENANT_ID), eq(documentFolders.dealId, input.dealId)));
    return folder?.id ?? null;
  }
  return null;
}

export async function persistFile(input: {
  dealId?: string | null;
  riskId?: string | null;
  contactId?: string | null;
  policyId?: string | null;
  folderId?: string | null;
  library?: string | null;
  fillable?: boolean;
  formTemplateId?: string | null;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  docType: string;
  slot?: string;
  tags?: string[];
}) {
  const id = randomUUID();
  const folder = input.folderId ?? input.dealId ?? input.policyId ?? input.contactId ?? "library";
  const storagePath = path.join(DEFAULT_TENANT_ID, folder, `${id}-${input.filename}`);
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, input.buffer);

  const [doc] = await db
    .insert(documents)
    .values({
      id,
      tenantId: DEFAULT_TENANT_ID,
      riskId: input.riskId || null,
      dealId: input.dealId || null,
      contactId: input.contactId || null,
      policyId: input.policyId || null,
      filename: input.filename,
      mimeType: inferMimeFromName(input.filename, input.mimeType),
      storagePath,
      docType: input.docType,
      slot: input.slot ?? "source_doc",
      status: "uploaded",
      tags: input.tags ?? [],
      folderId: input.folderId || null,
      library: input.library === "forms" ? "forms" : "shared",
      fillable: Boolean(input.fillable),
      formTemplateId: input.formTemplateId || null,
    })
    .returning();
  if (doc) await recordInitialDocumentVersion(doc);
  return doc;
}

export async function extractDocument(documentId: string, dealId: string) {
  await runExtraction(documentId, dealId);
}

function revalidateDocumentPaths(doc: {
  dealId: string | null;
  contactId: string | null;
  policyId: string | null;
}) {
  revalidatePath("/documents");
  revalidatePath("/esign");
  if (doc.dealId) revalidatePath(`/deals/${doc.dealId}`);
  if (doc.contactId) revalidatePath(`/contacts/${doc.contactId}`);
  if (doc.policyId) revalidatePath(`/policies/${doc.policyId}`);
}

export async function uploadDocument(formData: FormData) {
  let dealId = optionalId(formData, "dealId");
  let riskId = optionalId(formData, "riskId");
  let contactId = optionalId(formData, "contactId");
  let policyId = optionalId(formData, "policyId");
  let folderId = optionalId(formData, "folderId");
  if (folderId) {
    const [folder] = await db.select().from(documentFolders).where(eq(documentFolders.id, folderId));
    if (folder) {
      dealId = dealId ?? folder.dealId ?? null;
      contactId = contactId ?? folder.contactId ?? null;
      policyId = policyId ?? folder.policyId ?? null;
    }
  }
  if (dealId && !riskId) {
    const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
    riskId = risk?.id ?? null;
    if (!contactId) contactId = risk?.contactId ?? null;
  }
  if (policyId && (!riskId || !dealId || !contactId)) {
    const [policy] = await db.select().from(policies).where(eq(policies.id, policyId));
    if (policy) {
      riskId = riskId ?? policy.riskId ?? null;
      dealId = dealId ?? policy.dealId ?? null;
      contactId = contactId ?? policy.contactId ?? null;
    }
  }
  const library = String(formData.get("library") ?? "").trim() === "forms" ? "forms" : "shared";
  const fillable = String(formData.get("fillable") ?? "") === "on" || String(formData.get("fillable") ?? "") === "true";
  const rowCount = Number(formData.get("rowCount") ?? 0);
  const typedRows: Array<{ docType: string; files: File[] }> = [];
  if (Number.isFinite(rowCount) && rowCount > 0) {
    for (let i = 0; i < rowCount; i += 1) {
      const files = formData
        .getAll(`files_${i}`)
        .concat(formData.getAll(`file_${i}`))
        .filter((item): item is File => item instanceof File && item.size > 0);
      typedRows.push({
        docType: String(formData.get(`docType_${i}`) ?? formData.get("docType") ?? "").trim(),
        files,
      });
    }
  } else {
    typedRows.push({
      docType: String(formData.get("docType") ?? "").trim(),
      files: formData
        .getAll("files")
        .concat(formData.getAll("file"))
        .filter((item): item is File => item instanceof File && item.size > 0),
    });
  }
  const files = typedRows.flatMap((row) => row.files);
  if (files.length === 0) {
    throw new Error("Choose a file to upload.");
  }
  if (!dealId && !contactId && !policyId && !folderId && !formData.get("library")) {
    throw new Error("Choose a folder or attach the file to a contact, deal, or policy.");
  }
  const resolvedFolder = await resolveFolderId({ folderId, dealId, contactId });
  let last = null as Awaited<ReturnType<typeof persistFile>> | null;
  for (const row of typedRows) {
    for (const file of row.files) {
      const rawType = row.docType;
      const docType = rawType && rawType !== "auto"
        ? coerceDealUploadDocType(rawType)
        : coerceDealUploadDocType(
            dealId ? inferDocType(file.name, rawType) : inferFromName(file.name, library),
          );
      const slot = String(formData.get("slot") ?? "") || (resolvedFolder ? "library_file" : slotForDocType(docType));
      const doc = await persistFile({
        dealId,
        riskId,
        contactId,
        policyId,
        folderId: resolvedFolder,
        library,
        fillable: fillable || library === "forms",
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        buffer: Buffer.from(await file.arrayBuffer()),
        docType,
        slot,
        tags: parseTags(formData.get("tags")),
      });
      if (doc.riskId) {
        await runExtraction(doc.id, doc.dealId ?? "");
      }
      last = doc;
    }
  }
  if (last?.dealId && last.slot === "source_doc") {
    await fillDealSheetIfReady(last.dealId, String(formData.get("line") ?? ""));
  }
  if (last) revalidateDocumentPaths(last);
  if (last?.dealId && String(formData.get("after") ?? "") === "fill-sheet") {
    const line = String(formData.get("line") ?? "home") || "home";
    const tab = String(formData.get("returnTab") ?? "documents") || "documents";
    redirect(`/deals/${last.dealId}?tab=${tab}&notice=filled&line=${line}`);
  }
  if (formData.get("library")) {
    redirect(libraryHref({ library, folderId: resolvedFolder, notice: "uploaded" }));
  }
}

function inferFromName(filename: string, library: string): string {
  const name = filename.toLowerCase();
  if (name.includes("aor")) return "aor";
  if (name.includes("cancel")) return "cancellation";
  if (name.includes("acord")) return "acord";
  if (name.includes("appetite")) return "appetite_guide";
  if (name.includes("flyer")) return "flyer";
  if (name.includes("market")) return "marketing";
  return library === "forms" ? "agency_form" : "other";
}

/** List-page upload: require an existing Deal, then attach one or more typed files. */
export async function uploadDealDocuments(formData: FormData) {
  const dealName = String(formData.get("dealName") ?? "").trim();
  const requestedId = optionalId(formData, "dealId");
  if (!dealName && !requestedId) {
    redirect("/deals?notice=need-deal");
  }
  const lookup = await listDealLookup();
  const match = matchDealLookup(lookup, dealName, requestedId);
  if (!match) {
    redirect("/deals?notice=need-deal");
  }

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, match.id));
  const folderId = await resolveFolderId({ folderId: null, dealId: match.id, contactId: null });

  const rowCount = Math.max(
    Number(formData.get("rowCount") ?? 0),
    formData.getAll("docType").length,
  );
  let stored = 0;

  for (let i = 0; i < Math.max(rowCount, 1); i += 1) {
    const docType = coerceDealUploadDocType(
      String(formData.get(`docType_${i}`) ?? formData.getAll("docType")[i] ?? "other"),
    );
    const slot = slotForDocType(docType);
    const files = formData
      .getAll(`files_${i}`)
      .concat(i === 0 ? formData.getAll("files") : [])
      .filter((item): item is File => item instanceof File && item.size > 0);
    for (const file of files) {
      const doc = await persistFile({
        dealId: match.id,
        riskId: risk?.id ?? null,
        contactId: risk?.contactId ?? null,
        policyId: null,
        folderId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        buffer: Buffer.from(await file.arrayBuffer()),
        docType,
        slot,
      });
      if (doc.riskId && slot === "source_doc") {
        await runExtraction(doc.id, match.id);
      }
      stored += 1;
    }
  }

  if (stored > 0) {
    await fillDealSheetIfReady(match.id, "");
  }

  if (stored === 0) {
    redirect("/deals?notice=no-files");
  }
  revalidatePath("/deals");
  revalidatePath(`/deals/${match.id}`);
  revalidatePath("/documents");
  redirect(`/deals/${match.id}?tab=documents&notice=filled`);
}

export async function uploadSampleDocument(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const riskId = String(formData.get("riskId") ?? "");
  const sample = String(formData.get("sample") ?? "clean");
  const pack =
    sample === "messy"
      ? { filename: MESSY_WIND_MIT_FILENAME, text: MESSY_WIND_MIT_TEXT, docType: "wind_mit" as const }
      : sample === "four_point"
        ? {
            filename: MELBOURNE_FOUR_POINT_FILENAME,
            text: MELBOURNE_FOUR_POINT_TEXT,
            docType: "four_point" as const,
          }
        : { filename: CLEAN_DEC_FILENAME, text: CLEAN_DEC_TEXT, docType: "dec" as const };
  const doc = await persistFile({
    dealId,
    riskId,
    contactId: null,
    policyId: null,
    folderId: await resolveFolderId({ folderId: null, dealId, contactId: null }),
    filename: pack.filename,
    mimeType: "text/plain",
    buffer: Buffer.from(pack.text, "utf8"),
    docType: pack.docType,
    tags: [pack.docType],
  });
  if (doc.riskId) {
    await runExtraction(doc.id, dealId);
  }
  await fillDealSheetIfReady(dealId, String(formData.get("line") ?? ""));
  revalidateDocumentPaths(doc);
  redirect(`/deals/${dealId}?tab=documents&notice=filled`);
}

export async function markDocumentType(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  await runExtraction(documentId, dealId);
  await fillDealSheetIfReady(dealId, String(formData.get("line") ?? ""));
  revalidatePath(`/deals/${dealId}`);
}

/** Re-run extraction on an already-uploaded source doc. */
export async function extractExisting(formData: FormData) {
  return markDocumentType(formData);
}

async function fillDealSheetIfReady(dealId: string, lineHint: string) {
  if (!dealId) return;
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const line = (lineHint || deal?.quotingLine || "home") as ShopLine;
  try {
    await runFillDealSheets(dealId, line);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fill failed";
    await db.insert(extractionJobs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      engine: "pdf_text",
      status: "failed",
      message,
    });
  }
}

async function runExtraction(documentId: string, dealId: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new Error("Document not found");
  const abs = path.join(uploadRoot, doc.storagePath);
  const { readFile } = await import("node:fs/promises");
  let buffer: Buffer;
  try {
    buffer = await readFile(abs);
  } catch {
    await db
      .update(documents)
      .set({ status: "failed" })
      .where(eq(documents.id, documentId));
    if (dealId) {
      await db.insert(extractionJobs).values({
        tenantId: DEFAULT_TENANT_ID,
        dealId,
        documentId,
        engine: "pdf_text",
        status: "failed",
        message: `Could not read ${doc.filename} from storage.`,
      });
    }
    return;
  }
  let text = "";
  let engine: "pdf_text" | "ocr" = classifyIngest(doc.mimeType, doc.filename, buffer).engine;
  try {
    const uploaded = await readUploadText(buffer, doc.mimeType, doc.filename);
    text = uploaded.text;
    engine = uploaded.engine === "ocr" ? "ocr" : "pdf_text";
    if (!text.trim()) {
      throw new Error(`Could not read text from ${doc.filename}.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read document";
    await db
      .update(documents)
      .set({ status: "failed" })
      .where(eq(documents.id, documentId));
    if (dealId) {
      await db.insert(extractionJobs).values({
        tenantId: DEFAULT_TENANT_ID,
        dealId,
        documentId,
        engine,
        status: "failed",
        message,
      });
    }
    return;
  }
  const result = extractFieldsFromText(text);

  await db.delete(extractedFields).where(eq(extractedFields.documentId, documentId));

  if (!doc.riskId) {
    await db
      .update(documents)
      .set({ status: result.glanceRequired ? "needs_glance" : "extracted" })
      .where(eq(documents.id, documentId));
    return;
  }

  const [risk] = await db.select().from(risks).where(eq(risks.id, doc.riskId));
  const applyPatch: Record<string, unknown> = {};

  for (const field of result.fields) {
    await db.insert(extractedFields).values({
      tenantId: DEFAULT_TENANT_ID,
      documentId,
      riskId: doc.riskId,
      fieldKey: field.fieldKey,
      rawValue: field.rawValue,
      normalizedValue: field.normalizedValue,
      confidence: field.confidence.toFixed(3),
      flagged: field.flagged,
      appliedToRisk: !field.flagged,
    });
    if (!field.flagged) {
      const col = fieldKeyToRiskColumn(field.fieldKey);
      const value = coerceRiskValue(field.fieldKey, field.normalizedValue);
      if (col && value != null) applyPatch[col] = value;
    }
  }

  if (Object.keys(applyPatch).length > 0 && risk) {
    await db
      .update(risks)
      .set({ ...applyPatch, updatedAt: new Date() })
      .where(eq(risks.id, risk.id));
  }

  await db
    .update(documents)
    .set({ status: result.glanceRequired ? "needs_glance" : "extracted" })
    .where(eq(documents.id, documentId));

  if (result.glanceRequired) {
    await db.insert(alerts).values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "extraction_flag",
      title: "30-second glance needed",
      body: `${doc.filename}: ${result.fields.filter((f) => f.flagged).length} field(s) under ${Math.round(CONFIDENCE_THRESHOLD * 100)}% confidence. Source PDFs stay as attachments; only accepted values land on the master risk.`,
      severity: "warning",
      entityType: "deal",
      entityId: dealId,
    });
  }
}

export async function acceptExtractedField(formData: FormData) {
  const fieldId = String(formData.get("fieldId") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  const [field] = await db.select().from(extractedFields).where(eq(extractedFields.id, fieldId));
  if (!field) throw new Error("Field not found");

  const col = fieldKeyToRiskColumn(field.fieldKey);
  const value = coerceRiskValue(field.fieldKey, field.normalizedValue);
  if (col && value != null && field.riskId) {
    await db
      .update(risks)
      .set({ [col]: value, updatedAt: new Date() })
      .where(eq(risks.id, field.riskId));
  }

  await db
    .update(extractedFields)
    .set({
      appliedToRisk: true,
      flagged: false,
      reviewerNote: "Accepted after human glance",
    })
    .where(eq(extractedFields.id, fieldId));

  revalidatePath(`/deals/${dealId}`);
}

async function unlinkStoredPath(storagePath: string) {
  try {
    await unlink(path.join(uploadRoot, storagePath));
  } catch {
    // Missing file on disk is still a successful row delete.
  }
}

/** Double-confirmed in the UI. Hard-deletes shopping/library files. Hides issued policy files. */
export async function deleteUploadedFile(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!documentId) return;
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) return;

  const mode = uploadedFileDeleteMode(doc);
  if (mode === "hide") {
    await db.update(documents).set({ status: "hidden" }).where(eq(documents.id, documentId));
    revalidateDocumentPaths(doc);
    return;
  }

  const versions = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId));

  await db.delete(extractedFields).where(eq(extractedFields.documentId, documentId));
  await db
    .update(extractionJobs)
    .set({ documentId: null })
    .where(eq(extractionJobs.documentId, documentId));
  await db
    .update(fillFeedbackLogs)
    .set({ documentId: null })
    .where(eq(fillFeedbackLogs.documentId, documentId));
  await db
    .update(fillLearningLogs)
    .set({ documentId: null })
    .where(eq(fillLearningLogs.documentId, documentId));
  await db
    .update(formFills)
    .set({ sourceDocumentId: null })
    .where(eq(formFills.sourceDocumentId, documentId));
  await db.delete(signatureEnvelopes).where(eq(signatureEnvelopes.documentId, documentId));
  await db.delete(documentVersions).where(eq(documentVersions.documentId, documentId));
  await db.delete(documents).where(eq(documents.id, documentId));

  await unlinkStoredPath(doc.storagePath);
  for (const version of versions) {
    if (version.storagePath !== doc.storagePath) {
      await unlinkStoredPath(version.storagePath);
    }
  }

  if (doc.dealId) {
    const sheets = await db.select().from(quoteSheets).where(eq(quoteSheets.dealId, doc.dealId));
    for (const sheet of sheets) {
      await db
        .update(quoteSheets)
        .set({
          values: clearExtractedSheetCells(sheet.values),
          updatedAt: new Date(),
        })
        .where(eq(quoteSheets.id, sheet.id));
    }
    const remaining = await db.select().from(documents).where(eq(documents.dealId, doc.dealId));
    const hasSource = remaining.some((row) => row.slot === "source_doc" && row.status !== "hidden");
    if (hasSource) {
      await fillDealSheetIfReady(doc.dealId, String(formData.get("line") ?? ""));
    }
  }

  revalidateDocumentPaths(doc);
  if (String(formData.get("returnTo") ?? "").trim()) {
    redirect(String(formData.get("returnTo")).trim());
  }
}
