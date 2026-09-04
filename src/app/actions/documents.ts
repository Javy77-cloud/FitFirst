"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CONFIDENCE_THRESHOLD, DEFAULT_TENANT_ID } from "@/lib/domain";
import { coerceDealUploadDocType, matchDealLookup, slotForDocType } from "@/lib/deals/lookup";
import { db } from "@/lib/db";
import { listDealLookup } from "@/lib/db/queries";
import { alerts, documentFolders, documents, extractedFields, policies, risks } from "@/lib/db/schema";
import {
  coerceRiskValue,
  extractFieldsFromText,
  fieldKeyToRiskColumn,
} from "@/lib/extraction/extract";
import { textFromUpload } from "@/lib/extraction/pdf";
import {
  CLEAN_DEC_FILENAME,
  CLEAN_DEC_TEXT,
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
      mimeType: input.mimeType,
      storagePath,
      docType: input.docType,
      slot: input.slot ?? "source_doc",
      status: "uploaded",
      tags: input.tags ?? [],
    })
    .returning();
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
  const docType = coerceDealUploadDocType(String(formData.get("docType") ?? "other"));
  const slot = String(formData.get("slot") ?? "") || slotForDocType(docType);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload.");
  }
  if (!dealId && !contactId && !policyId && !folderId) {
    throw new Error("Choose a folder or attach the file to a contact, deal, or policy.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const doc = await persistFile({
    dealId,
    riskId,
    contactId,
    policyId,
    folderId: await resolveFolderId({ folderId, dealId, contactId }),
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer,
    docType,
    slot,
    tags: parseTags(formData.get("tags")),
  });
  if (doc.riskId) {
    await runExtraction(doc.id, doc.dealId ?? "");
  }
  revalidateDocumentPaths(doc);
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

  if (stored === 0) {
    redirect("/deals?notice=no-files");
  }
  revalidatePath("/deals");
  revalidatePath(`/deals/${match.id}`);
  revalidatePath("/documents");
  redirect(`/deals/${match.id}?tab=documents&notice=uploaded`);
}

export async function uploadSampleDocument(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const riskId = String(formData.get("riskId") ?? "");
  const sample = String(formData.get("sample") ?? "clean");
  const messy = sample === "messy";
  const filename = messy ? MESSY_WIND_MIT_FILENAME : CLEAN_DEC_FILENAME;
  const text = messy ? MESSY_WIND_MIT_TEXT : CLEAN_DEC_TEXT;
  const docType = messy ? "wind_mit" : "dec";
  const doc = await persistFile({
    dealId,
    riskId,
    contactId: null,
    policyId: null,
    folderId: await resolveFolderId({ folderId: null, dealId, contactId: null }),
    filename,
    mimeType: "text/plain",
    buffer: Buffer.from(text, "utf8"),
    docType,
    tags: [messy ? "wind-mit" : "dec"],
  });
  if (doc.riskId) {
    await runExtraction(doc.id, dealId);
  }
  revalidateDocumentPaths(doc);
}

export async function markDocumentType(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  await runExtraction(documentId, dealId);
  revalidatePath(`/deals/${dealId}`);
}

/** Re-run extraction on an already-uploaded source doc. */
export async function extractExisting(formData: FormData) {
  return markDocumentType(formData);
}

async function runExtraction(documentId: string, dealId: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new Error("Document not found");
  const abs = path.join(uploadRoot, doc.storagePath);
  const { readFile } = await import("node:fs/promises");
  const buffer = await readFile(abs);
  const text = await textFromUpload(buffer, doc.mimeType, doc.filename);
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
  if (col && value != null) {
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
