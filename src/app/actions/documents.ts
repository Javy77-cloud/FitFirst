"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { CONFIDENCE_THRESHOLD, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, documents, extractedFields, risks } from "@/lib/db/schema";
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

async function persistFile(
  dealId: string,
  riskId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer,
  docType: string,
  slot = "source_doc",
) {
  const id = randomUUID();
  const storagePath = path.join(DEFAULT_TENANT_ID, dealId, `${id}-${filename}`);
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buffer);

  const [doc] = await db
    .insert(documents)
    .values({
      id,
      tenantId: DEFAULT_TENANT_ID,
      riskId: riskId || null,
      dealId,
      filename,
      mimeType,
      storagePath,
      docType,
      slot,
      status: "uploaded",
    })
    .returning();
  return doc;
}

export async function uploadDocument(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const riskId = String(formData.get("riskId") ?? "");
  const docType = String(formData.get("docType") ?? "other");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const doc = await persistFile(
    dealId,
    riskId,
    file.name,
    file.type || "application/octet-stream",
    buffer,
    docType,
  );
  await runExtraction(doc.id, dealId);
  revalidatePath(`/deals/${dealId}`);
}

export async function uploadSampleDocument(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const riskId = String(formData.get("riskId") ?? "");
  const sample = String(formData.get("sample") ?? "clean");
  const messy = sample === "messy";
  const filename = messy ? MESSY_WIND_MIT_FILENAME : CLEAN_DEC_FILENAME;
  const text = messy ? MESSY_WIND_MIT_TEXT : CLEAN_DEC_TEXT;
  const docType = messy ? "wind_mit" : "dec";
  const doc = await persistFile(
    dealId,
    riskId,
    filename,
    "text/plain",
    Buffer.from(text, "utf8"),
    docType,
  );
  await runExtraction(doc.id, dealId);
  revalidatePath(`/deals/${dealId}`);
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
