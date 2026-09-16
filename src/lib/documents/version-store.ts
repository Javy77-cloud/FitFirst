import path from "node:path";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documentVersions, documents, type Document } from "@/lib/db/schema";
import { writeStoredFile } from "@/lib/files/object-store";
import { inferMimeFromName } from "@/lib/files/urls";
import { deskActor } from "@/lib/policy/record-changes";
import { nextVersionNumber } from "./versions";

export async function listVersionsForDocument(documentId: string) {
  return db
    .select()
    .from(documentVersions)
    .where(
      and(eq(documentVersions.tenantId, DEFAULT_TENANT_ID), eq(documentVersions.documentId, documentId)),
    )
    .orderBy(desc(documentVersions.versionNumber));
}

export async function recordInitialDocumentVersion(
  doc: Pick<Document, "id" | "filename" | "mimeType" | "storagePath" | "docType">,
  note?: string | null,
) {
  const existing = await listVersionsForDocument(doc.id);
  if (existing.length > 0) return existing[0];
  const actor = await deskActor();
  const [row] = await db
    .insert(documentVersions)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      documentId: doc.id,
      versionNumber: 1,
      filename: doc.filename,
      mimeType: doc.mimeType,
      storagePath: doc.storagePath,
      docType: doc.docType,
      uploadedBy: actor.id,
      uploadedByName: actor.name,
      note: note ?? "Original upload",
    })
    .returning();
  return row;
}

export async function replaceDocumentFile(input: {
  documentId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  docType?: string;
  note?: string | null;
}) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, input.documentId)));
  if (!doc) return { ok: false as const, error: "Document not found." };

  const existing = await listVersionsForDocument(doc.id);
  if (existing.length === 0) {
    await recordInitialDocumentVersion(doc, "Kept as version 1 when replaced");
  }
  const versionNumber = nextVersionNumber(
    (existing.length === 0 ? [1] : existing.map((row) => row.versionNumber)),
  );
  const id = randomUUID();
  const folder = doc.dealId ?? doc.policyId ?? doc.contactId ?? "library";
  const storagePath = await writeStoredFile(
    path.posix.join(DEFAULT_TENANT_ID, folder, `${id}-${input.filename}`),
    input.buffer,
    inferMimeFromName(input.filename, input.mimeType),
  );

  const mimeType = inferMimeFromName(input.filename, input.mimeType);
  const actor = await deskActor();
  const [version] = await db
    .insert(documentVersions)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      documentId: doc.id,
      versionNumber,
      filename: input.filename,
      mimeType,
      storagePath,
      docType: input.docType || doc.docType,
      uploadedBy: actor.id,
      uploadedByName: actor.name,
      note: input.note ?? "Replaced — prior copy kept",
    })
    .returning();

  const [updated] = await db
    .update(documents)
    .set({
      filename: input.filename,
      mimeType,
      storagePath,
      docType: input.docType || doc.docType,
      status: "uploaded",
    })
    .where(eq(documents.id, doc.id))
    .returning();

  return { ok: true as const, document: updated, version, priorCount: versionNumber - 1 };
}
