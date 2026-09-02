"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { CONFIDENCE_THRESHOLD, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
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

function parseTags(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function optionalId(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

async function resolveFolderId(input: {
  folderId: string | null;
  dealId: string | null;
  contactId: string | null;
}) {
  if (input.folderId) return input.folderId;
  if (input.dealId) {
    const [folder] = await db
      .select()
      .from(documentFolders)
      .where(
        and(
          eq(documentFolders.tenantId, DEFAULT_TENANT_ID),
          eq(documentFolders.dealId, input.dealId),
          eq(documentFolders.kind, "deal"),
        ),
      );
    if (folder) return folder.id;
  }
  if (input.contactId) {
    const [folder] = await db
      .select()
      .from(documentFolders)
      .where(
        and(
          eq(documentFolders.tenantId, DEFAULT_TENANT_ID),
          eq(documentFolders.contactId, input.contactId),
          eq(documentFolders.kind, "account"),
        ),
      );
    if (folder) return folder.id;
  }
  return null;
}

async function persistFile(input: {
  dealId: string | null;
  riskId: string | null;
  contactId: string | null;
  policyId: string | null;
  folderId: string | null;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  docType: string;
  tags: string[];
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
      riskId: input.riskId,
      dealId: input.dealId,
      contactId: input.contactId,
      policyId: input.policyId,
      folderId: input.folderId,
      filename: input.filename,
      mimeType: input.mimeType,
      storagePath,
      docType: input.docType,
      status: "uploaded",
      tags: input.tags,
    })
    .returning();
  return doc;
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
  const docType = String(formData.get("docType") ?? "other");
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
    tags: parseTags(formData.get("tags")),
  });
  if (doc.riskId) {
    await runExtraction(doc.id, doc.dealId ?? "");
  }
  revalidateDocumentPaths(doc);
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

export async function extractExisting(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  await runExtraction(documentId, dealId);
  revalidatePath(`/deals/${dealId}`);
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
    await db.update(documents).set({ status: "uploaded" }).where(eq(documents.id, documentId));
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
