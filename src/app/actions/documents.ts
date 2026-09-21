"use server";

import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CONFIDENCE_THRESHOLD, DEFAULT_TENANT_ID, isShopLine, type ShopLine } from "@/lib/domain";
import { withFlash } from "@/lib/flash";
import { flashAction } from "@/lib/flash-action";
import { dealDocumentsTabHref, type DealDocumentsSaveResult } from "@/lib/documents/deal-docs-save";
import { isRedirectError } from "@/lib/lifecycle/shop";
import { formTag, leadDocFormById, lineTag } from "@/lib/leads/line-documents";
import { coerceQuotingFormId, quotingFormById } from "@/lib/quoting/forms";
import { coerceDealUploadDocType, matchDealLookup, slotForDocType } from "@/lib/deals/lookup";
import {
  dealAllowsCreatePolicyPrompt,
  maybeQueueCreatePolicyPrompt,
  resolveDeclarationCarrierName,
} from "@/app/actions/declaration-prompt";
import { isDeclarationDocType } from "@/lib/policy/dec-prompt";
import { parseDealProduct } from "@/lib/deals/deal-products";
import { db } from "@/lib/db";
import { listDealLookup } from "@/lib/db/queries";
import {
  alerts,
  deals,
  documentFolders,
  documentVersions,
  documents,
  extractedFields,
  extractionAttempts,
  extractionCorrections,
  extractionJobs,
  fillFeedbackLogs,
  fillLearningLogs,
  formFills,
  leads,
  policies,
  quoteSheets,
  risks,
  signatureEnvelopes,
  synonymCandidates,
} from "@/lib/db/schema";
import {
  clearExtractedSheetCells,
  clearExtractedSheetCellsFromDoc,
  uploadedFileDeleteMode,
} from "@/lib/documents/delete-file";
import { inferDocType } from "@/lib/ingest/identity";
import { runFillDealSheets } from "@/app/actions/quote-sheet";
import { libraryHref } from "@/lib/documents/library";
import { recordInitialDocumentVersion } from "@/lib/documents/version-store";
import {
  coerceRiskValue,
  fieldKeyToRiskColumn,
} from "@/lib/extraction/extract";
import {
  docTypeUsesGemini,
  extractWithGeminiPdf,
  geminiKeyReady,
  loadGeminiApiKey,
  MISSING_GEMINI_KEY_MESSAGE,
} from "@/lib/extraction/gemini";
import { inferMimeFromName } from "@/lib/files/urls";
import { isDocumentsSourceDoc, shopLineForGeminiExtract, shopLineFromSourceDoc } from "@/lib/deals/quote-docs";
import { dealSourceSlotForUpload } from "@/lib/documents/restore-deal-docs";
import { collectUploadedFiles, isUploadedFile } from "@/lib/documents/uploaded-file";
import { markShopFlowStaleAfterRiskChange } from "@/lib/deals/shop-flow-persist";
import { deleteStoredFile, readStoredFile, writeStoredFile } from "@/lib/files/object-store";
import {
  CLEAN_DEC_FILENAME,
  CLEAN_DEC_TEXT,
  MELBOURNE_FOUR_POINT_FILENAME,
  MELBOURNE_FOUR_POINT_TEXT,
  MESSY_WIND_MIT_FILENAME,
  MESSY_WIND_MIT_TEXT,
} from "@/lib/fixtures/sample-docs";

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
  leadId?: string | null;
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
  const folder =
    input.folderId ?? input.dealId ?? input.policyId ?? input.contactId ?? input.leadId ?? "library";
  const relPath = path.posix.join(DEFAULT_TENANT_ID, folder, `${id}-${input.filename}`);
  const storagePath = await writeStoredFile(
    relPath,
    input.buffer,
    inferMimeFromName(input.filename, input.mimeType),
    { durable: Boolean(input.dealId) },
  );

  const values = {
    id,
    tenantId: DEFAULT_TENANT_ID,
    riskId: input.riskId || null,
    dealId: input.dealId || null,
    leadId: input.leadId || null,
    contactId: input.contactId || null,
    policyId: input.policyId || null,
    filename: input.filename,
    mimeType: inferMimeFromName(input.filename, input.mimeType),
    storagePath,
    docType: input.docType,
    slot: input.slot ?? "source_doc",
    status: "uploaded" as const,
    tags: input.tags ?? [],
    folderId: input.folderId || null,
    library: input.library === "forms" ? "forms" : "shared",
    fillable: Boolean(input.fillable),
    formTemplateId: input.formTemplateId || null,
  };
  let doc: (typeof documents.$inferSelect) | undefined;
  try {
    [doc] = await db.insert(documents).values(values).returning();
  } catch {
    // Optional FKs (stale risk/contact) must not drop the deal row + storage_path.
    if (!values.dealId) throw new Error("Could not save the file to this deal.");
    [doc] = await db
      .insert(documents)
      .values({
        ...values,
        riskId: null,
        contactId: null,
        policyId: null,
        folderId: null,
      })
      .returning();
  }
  if (!doc) throw new Error("Could not save the file to this deal.");
  await recordInitialDocumentVersion(doc).catch(() => null);
  if (doc.dealId && isDocumentsSourceDoc(doc)) {
    await markShopFlowStaleAfterRiskChange(doc.dealId, shopLineFromSourceDoc(doc)).catch(() => null);
  }
  return doc;
}

/** Attach worksheet files to a deal. Used by Upload Save and Heather's sheet Save. */
export async function persistDealSourceUploads(
  formData: FormData,
  options?: { persistOnly?: boolean },
): Promise<{
  count: number;
  last: Awaited<ReturnType<typeof persistFile>> | null;
  attempted: number;
  createPolicyPrompt?: { documentId: string; carrierName: string; product?: string | null } | null;
}> {
  const persistOnly = Boolean(options?.persistOnly);
  let dealId = optionalId(formData, "dealId");
  let riskId = optionalId(formData, "riskId");
  let contactId = optionalId(formData, "contactId");
  let policyId = optionalId(formData, "policyId");
  const folderId = optionalId(formData, "folderId");
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
  const uploads = await collectUploadedFiles(formData);
  if (uploads.length === 0) return { count: 0, last: null, attempted: 0, createPolicyPrompt: null };
  if (!dealId && !contactId && !policyId && !folderId && !formData.get("library")) {
    return { count: 0, last: null, attempted: uploads.length, createPolicyPrompt: null };
  }
  const library = String(formData.get("library") ?? "").trim() === "forms" ? "forms" : "shared";
  const fillable = String(formData.get("fillable") ?? "") === "on" || String(formData.get("fillable") ?? "") === "true";
  const resolvedFolder = await resolveFolderId({ folderId, dealId, contactId });
  let last = null as Awaited<ReturnType<typeof persistFile>> | null;
  let lastDeclaration = null as Awaited<ReturnType<typeof persistFile>> | null;
  let count = 0;
  for (const upload of uploads) {
    const rawType = String(
      formData.get(`docType_${upload.index}`) ?? formData.get("docType") ?? "",
    ).trim();
    const docType =
      rawType && rawType !== "auto"
        ? coerceDealUploadDocType(rawType)
        : coerceDealUploadDocType(
            dealId ? inferDocType(upload.filename, rawType) : inferFromName(upload.filename, library),
          );
    const slot = dealSourceSlotForUpload({
      dealId,
      requestedSlot: String(formData.get("slot") ?? ""),
      docType,
      hasFolder: Boolean(resolvedFolder),
    });
    const lineRaw = String(formData.get("line") ?? "").trim();
    const lineTags = dealId && isShopLine(lineRaw) ? [lineTag(lineRaw)] : [];
    let doc: Awaited<ReturnType<typeof persistFile>> | null = null;
    try {
      doc = await persistFile({
        dealId,
        riskId,
        contactId,
        policyId,
        folderId: resolvedFolder,
        library,
        fillable: fillable || library === "forms",
        filename: upload.filename,
        mimeType: upload.file.type || "application/octet-stream",
        buffer: upload.bytes,
        docType,
        slot,
        tags: [...parseTags(formData.get("tags")), ...lineTags],
      });
    } catch (error) {
      console.error("[persistDealSourceUploads]", error);
      continue;
    }
    if (
      !persistOnly &&
      doc?.riskId &&
      !(doc.slot === "source_doc" && docTypeUsesGemini(doc.docType))
    ) {
      await runExtraction(doc.id, doc.dealId ?? "").catch(() => null);
    }
    if (!doc) continue;
    last = doc;
    if (isDeclarationDocType(doc.docType)) lastDeclaration = doc;
    count += 1;
  }
  let createPolicyPrompt = null as
    | { documentId: string; carrierName: string; product?: string | null }
    | null;
  if (!persistOnly && dealId && lastDeclaration && isDeclarationDocType(lastDeclaration.docType)) {
    const product =
      parseDealProduct(String(formData.get("product") ?? "")) ??
      parseDealProduct(String(formData.get("line") ?? ""));
    const binding = await dealAllowsCreatePolicyPrompt(dealId, product);
    if (binding) {
      const carrierName =
        String(formData.get("carrierName") ?? "").trim() ||
        (await resolveDeclarationCarrierName(dealId, product));
      createPolicyPrompt = await maybeQueueCreatePolicyPrompt({
        dealId,
        docType: lastDeclaration.docType,
        documentId: lastDeclaration.id,
        storagePath: lastDeclaration.storagePath,
        mimeType: lastDeclaration.mimeType,
        filename: lastDeclaration.filename,
        carrierName,
        product,
        binding: true,
      }).catch((error) => {
        console.error("[persistDealSourceUploads] create-policy prompt", error);
        return null;
      });
    }
  }
  return { count, last, attempted: uploads.length, createPolicyPrompt };
}

export async function extractDocument(documentId: string, dealId: string) {
  await runExtraction(documentId, dealId);
}

/**
 * Deal Documents "Save files". Returns a result instead of redirect() so the
 * client onSubmit path cannot mis-handle NEXT_REDIRECT as documents-save-failed.
 */
export async function saveDealDocuments(formData: FormData): Promise<DealDocumentsSaveResult> {
  const dealId = optionalId(formData, "dealId");
  if (!dealId) {
    return { ok: false, count: 0, reason: "documents-save-failed" };
  }
  try {
    const { count, last, attempted } = await persistDealSourceUploads(formData, { persistOnly: true });
    if (count === 0 || !last) {
      return {
        ok: false,
        count: 0,
        reason: attempted > 0 ? "documents-save-failed" : "choose-file",
      };
    }
    revalidateDocumentPaths(last);
    return { ok: true, count };
  } catch (error) {
    console.error("[saveDealDocuments]", error);
    return { ok: false, count: 0, reason: "documents-save-failed" };
  }
}

function revalidateDocumentPaths(doc: {
  dealId: string | null;
  leadId?: string | null;
  contactId: string | null;
  policyId: string | null;
}) {
  revalidatePath("/documents");
  revalidatePath("/esign");
  if (doc.dealId) revalidatePath(`/deals/${doc.dealId}`);
  if (doc.leadId) revalidatePath(`/leads/${doc.leadId}`);
  if (doc.contactId) revalidatePath(`/contacts/${doc.contactId}`);
  if (doc.policyId) revalidatePath(`/policies/${doc.policyId}`);
}

export async function uploadDocument(formData: FormData) {
  const dealId = optionalId(formData, "dealId");
  const lineHint = String(formData.get("line") ?? "").trim();
  const documentsHref = dealId ? dealDocumentsTabHref(dealId, lineHint) : null;
  try {
    const { count, last, attempted, createPolicyPrompt } = await persistDealSourceUploads(formData);
    if (count === 0 || !last) {
      if (documentsHref) {
        flashAction(documentsHref, attempted > 0 ? "documents-save-failed" : "choose-file", "error");
      }
      throw new Error("Choose a file to upload.");
    }
    revalidateDocumentPaths(last);
    const afterAction = String(formData.get("after") ?? "");
    // Explicit Upload-and-fill (SheetDrop) only — Documents Save must not auto-Fill.
    if (last.dealId && afterAction === "fill-sheet") {
      const savedDealId = last.dealId;
      const line = String(formData.get("line") ?? "home") || "home";
      const tab = String(formData.get("returnTab") ?? "documents") || "documents";
      if (last.slot === "source_doc") {
        after(() => fillDealSheetIfReady(savedDealId, line));
      }
      redirect(withFlash(`/deals/${last.dealId}?tab=${tab}&notice=filled&line=${line}`, "sheet-filled"));
    }
    if (formData.get("library")) {
      const library = String(formData.get("library") ?? "").trim() === "forms" ? "forms" : "shared";
      const folderId = optionalId(formData, "folderId");
      redirect(withFlash(libraryHref({ library, folderId, notice: "uploaded" }), "document-uploaded"));
    }
    if (last.dealId) {
      const line = String(formData.get("line") ?? "").trim();
      const product = String(formData.get("product") ?? "").trim();
      if (createPolicyPrompt) {
        const query = new URLSearchParams({
          tab: "quotes",
          createPolicy: "1",
          doc: createPolicyPrompt.documentId,
          carrier: createPolicyPrompt.carrierName,
        });
        if (line) query.set("line", line);
        if (product || createPolicyPrompt.product) {
          query.set("product", product || createPolicyPrompt.product || "");
        }
        flashAction(`/deals/${last.dealId}?${query.toString()}`, "declaration-received");
      }
      flashAction(dealDocumentsTabHref(last.dealId, line), "documents-saved");
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (documentsHref) {
      const message =
        error instanceof Error && error.message === "Choose a file to upload."
          ? "choose-file"
          : "documents-save-failed";
      flashAction(documentsHref, message, "error");
    }
    throw error;
  }
}

function filesFromSlots(formData: FormData): File[] {
  const rowCount = Number(formData.get("rowCount") ?? 0);
  const collected: File[] = [];
  const push = (item: FormDataEntryValue) => {
    if (isUploadedFile(item)) collected.push(item);
  };
  if (Number.isFinite(rowCount) && rowCount > 0) {
    for (let i = 0; i < rowCount; i += 1) {
      formData.getAll(`files_${i}`).forEach(push);
      formData.getAll(`file_${i}`).forEach(push);
    }
  }
  formData.getAll("files").forEach(push);
  formData.getAll("file").forEach(push);
  return collected;
}

/** Lead files belong to a policy subtype (and shop line). Never attach a file to the lead as a whole. */
export async function uploadLeadLineDocument(formData: FormData) {
  const leadId = optionalId(formData, "leadId");
  const formRaw = String(
    formData.get("quotingForm") ?? formData.get("form") ?? formData.get("line") ?? "",
  ).trim();
  const leadForm = leadDocFormById(formRaw);
  const coerced = coerceQuotingFormId(formRaw);
  const quoting = quotingFormById(leadForm?.id ?? formRaw) ?? (coerced ? quotingFormById(coerced) : null);
  const resolvedForm =
    leadForm ??
    (quoting ? { id: quoting.id, label: quoting.label, shopLine: quoting.shopLine } : null);
  const lineRaw = resolvedForm?.shopLine ?? (isShopLine(formRaw) ? formRaw : "");
  if (!leadId || !isShopLine(lineRaw)) {
    throw new Error("Choose a coverage line for this file.");
  }
  const files = filesFromSlots(formData);
  if (files.length === 0) {
    throw new Error("Choose a file to upload.");
  }

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");

  let dealId = optionalId(formData, "dealId") ?? lead.convertedDealId ?? null;
  if (!dealId) {
    const [open] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.leadId, leadId)))
      .limit(1);
    dealId = open?.id ?? null;
  }
  let riskId: string | null = null;
  if (dealId) {
    const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
    riskId = risk?.id ?? null;
  }

  const tags = resolvedForm
    ? [formTag(resolvedForm.id), lineTag(lineRaw)]
    : [lineTag(lineRaw)];

  let last = null as Awaited<ReturnType<typeof persistFile>> | null;
  for (const file of files) {
    last = await persistFile({
      leadId,
      dealId,
      riskId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer: Buffer.from(await file.arrayBuffer()),
      docType: coerceDealUploadDocType(inferDocType(file.name)),
      slot: "source_doc",
      tags,
    });
    if (
      last.riskId &&
      last.dealId &&
      !(last.slot === "source_doc" && docTypeUsesGemini(last.docType))
    ) {
      await runExtraction(last.id, last.dealId);
    }
  }
  // Lead upload persists only — do not auto-Fill a linked deal sheet.
  if (last) revalidateDocumentPaths(last);
  redirect(`/leads/${leadId}`);
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

  const uploads = await collectUploadedFiles(formData);
  let stored = 0;

  for (const upload of uploads) {
    const docType = coerceDealUploadDocType(
      String(formData.get(`docType_${upload.index}`) ?? formData.getAll("docType")[upload.index] ?? "other"),
    );
    const slot = slotForDocType(docType);
    const doc = await persistFile({
      dealId: match.id,
      riskId: risk?.id ?? null,
      contactId: risk?.contactId ?? null,
      policyId: null,
      folderId,
      filename: upload.filename,
      mimeType: upload.file.type || "application/octet-stream",
      buffer: upload.bytes,
      docType,
      slot,
    });
    if (doc.riskId && slot === "source_doc" && !docTypeUsesGemini(doc.docType)) {
      await runExtraction(doc.id, match.id).catch(() => null);
    }
    stored += 1;
  }

  if (stored === 0) {
    redirect("/deals?notice=no-files");
  }
  revalidatePath("/deals");
  revalidatePath(`/deals/${match.id}`);
  revalidatePath("/documents");
  // Persist only — Fill master sheet button owns fill; Markets only after Confirm & request quotes.
  redirect(withFlash(`/deals/${match.id}?tab=documents`, "documents-saved"));
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
  if (doc.riskId && !docTypeUsesGemini(doc.docType)) {
    await runExtraction(doc.id, dealId);
  }
  revalidateDocumentPaths(doc);
  // Sample upload persists (+ non-Gemini extract above) — no auto-Fill.
  redirect(withFlash(`/deals/${dealId}?tab=documents`, "documents-saved"));
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
    // Soft-refresh deal Documents + sheet so CHECK cells appear without a hard reload.
    revalidatePath(`/deals/${dealId}`);
    revalidatePath(`/deals/${dealId}`, "page");
    revalidatePath("/documents");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fill failed";
    try {
      await db.insert(extractionJobs).values({
        tenantId: DEFAULT_TENANT_ID,
        dealId,
        engine: "pdf_text",
        status: "failed",
        filledKeys: [],
        skippedKeys: [],
        message: message.slice(0, 1800),
      });
    } catch {
      /* never let logging abort Fill recovery */
    }
  }
}

async function runExtraction(documentId: string, dealId: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new Error("Document not found");
  const buffer = await readStoredFile(doc.storagePath);
  if (!buffer) {
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
  const geminiKey = await loadGeminiApiKey();
  if (docTypeUsesGemini(doc.docType) && !geminiKeyReady(geminiKey)) {
    await db
      .update(documents)
      .set({ status: "failed" })
      .where(eq(documents.id, documentId));
    if (dealId) {
      await db.insert(extractionJobs).values({
        tenantId: DEFAULT_TENANT_ID,
        dealId,
        documentId,
        engine: "gemini",
        status: "failed",
        message: MISSING_GEMINI_KEY_MESSAGE,
      });
    }
    return;
  }

  let result;
  let engine: "pdf_text" | "ocr" | "gemini" = "gemini";
  if (docTypeUsesGemini(doc.docType)) {
    const [deal] = dealId
      ? await db
          .select({ quotingLine: deals.quotingLine })
          .from(deals)
          .where(eq(deals.id, dealId))
      : [];
    const shopLine = shopLineForGeminiExtract({
      docType: doc.docType,
      filename: doc.filename,
      tags: doc.tags,
      quotingLine: deal?.quotingLine,
    });
    const gemini = await extractWithGeminiPdf(buffer, doc.docType, {
      apiKey: geminiKey,
      mimeType: doc.mimeType,
      filename: doc.filename,
      shopLine,
    });
    engine = "gemini";
    if (!gemini.ok) {
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
          filledKeys: [],
          skippedKeys: [],
          message: `Gemini extract failed for ${doc.filename}: ${gemini.message}`,
        });
      }
      return;
    }
    result = gemini.result;
  } else {
    // Non-source docs: no legacy synonym Fill; mark skipped.
    await db
      .update(documents)
      .set({ status: "extracted" })
      .where(eq(documents.id, documentId));
    return;
  }

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
  for (const unmapped of result.unmappedLabels) {
    await db.insert(extractedFields).values({
      tenantId: DEFAULT_TENANT_ID,
      documentId,
      riskId: doc.riskId,
      fieldKey: "needs_review",
      rawValue: `${unmapped.sourceLabel}: ${unmapped.rawValue}`,
      normalizedValue: "",
      confidence: "0.000",
      flagged: true,
      appliedToRisk: false,
      reviewerNote: unmapped.sourceLabel,
    });
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
  await deleteStoredFile(storagePath);
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
    const hiddenReturn = String(formData.get("returnTo") ?? "").trim();
    if (hiddenReturn) redirect(withFlash(hiddenReturn, "document-deleted"));
    if (doc.dealId) flashAction(`/deals/${doc.dealId}?tab=documents`, "document-deleted");
    return;
  }

  try {
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
    // sep7cg audit: delete doc-tied corrections + attempts (field_attempts CASCADE).
    // Learning retained in fill_learning_logs (nulled above). Synonym proposals kept.
    const correctionRows = await db
      .select({ id: extractionCorrections.id })
      .from(extractionCorrections)
      .where(eq(extractionCorrections.documentId, documentId));
    const correctionIds = correctionRows.map((row) => row.id);
    if (correctionIds.length > 0) {
      await db
        .update(synonymCandidates)
        .set({ evidenceCorrectionId: null, updatedAt: new Date() })
        .where(inArray(synonymCandidates.evidenceCorrectionId, correctionIds));
      await db.delete(extractionCorrections).where(inArray(extractionCorrections.id, correctionIds));
    }
    const attemptRows = await db
      .select({ id: extractionAttempts.id })
      .from(extractionAttempts)
      .where(eq(extractionAttempts.documentId, documentId));
    const attemptIds = attemptRows.map((row) => row.id);
    if (attemptIds.length > 0) {
      await db
        .update(synonymCandidates)
        .set({ evidenceAttemptId: null, updatedAt: new Date() })
        .where(inArray(synonymCandidates.evidenceAttemptId, attemptIds));
      await db.delete(extractionAttempts).where(inArray(extractionAttempts.id, attemptIds));
    }
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
      const remaining = await db.select().from(documents).where(eq(documents.dealId, doc.dealId));
      const hasSource = remaining.some((row) => row.slot === "source_doc" && row.status !== "hidden");
      const sheets = await db.select().from(quoteSheets).where(eq(quoteSheets.dealId, doc.dealId));
      for (const sheet of sheets) {
        // Only wipe this file's extract cells (or all extract cells if no source docs remain).
        // Clearing everything before refill left Javy with an empty sheet when Fill raced/failed.
        const nextValues = hasSource
          ? clearExtractedSheetCellsFromDoc(sheet.values, doc.filename)
          : clearExtractedSheetCells(sheet.values);
        await db
          .update(quoteSheets)
          .set({
            values: nextValues,
            updatedAt: new Date(),
          })
          .where(eq(quoteSheets.id, sheet.id));
      }
    }
  } catch (error) {
    console.error("[deleteUploadedFile]", error);
    const dealId = doc.dealId || String(formData.get("dealId") ?? "").trim();
    const returnTo = String(formData.get("returnTo") ?? "").trim();
    const message = "Could not delete document";
    if (returnTo) redirect(withFlash(returnTo, message, "error"));
    if (dealId) flashAction(`/deals/${dealId}?tab=documents`, message, "error");
    throw error;
  }

  revalidateDocumentPaths(doc);
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (returnTo) {
    redirect(withFlash(returnTo, "document-deleted"));
  }
  if (doc.dealId) {
    flashAction(`/deals/${doc.dealId}?tab=documents`, "document-deleted");
  }
}
