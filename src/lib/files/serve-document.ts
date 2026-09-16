import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { documents, documentVersions, type Document, type DocumentVersion } from "@/lib/db/schema";
import { readStoredFile } from "@/lib/files/object-store";
import {
  contentDisposition,
  resolveFileMime,
  shouldWrapAsPdf,
} from "./urls";
import { wrapTextAsPdf } from "./wrap-text-pdf";
import { writeEoAuditSafe } from "@/lib/eo-audit/write";

export async function getDeskDocument(id: string): Promise<Document | null> {
  if (!isUuid(id)) return null;
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, id)));
  return doc ?? null;
}

export async function getDeskDocumentVersion(
  documentId: string,
  versionId: string,
): Promise<{ doc: Document; version: DocumentVersion } | null> {
  const doc = await getDeskDocument(documentId);
  if (!doc || !isUuid(versionId)) return null;
  const [version] = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.tenantId, DEFAULT_TENANT_ID),
        eq(documentVersions.id, versionId),
        eq(documentVersions.documentId, documentId),
      ),
    );
  if (!version) return null;
  return { doc, version };
}

export async function loadDocumentBytes(doc: Document): Promise<{
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
} | null> {
  let buffer = await readStoredFile(doc.storagePath);

  if (!buffer) {
    return null;
  } else if (shouldWrapAsPdf(docWithBytes(doc, buffer))) {
    buffer = await wrapTextAsPdf(doc.filename, buffer.toString("utf8"));
  }

  const mimeType = resolveFileMime({
    filename: doc.filename,
    storedMime: doc.mimeType,
    bytes: buffer,
    docType: doc.docType,
    slot: doc.slot,
  });
  return { bytes: new Uint8Array(buffer), mimeType, filename: doc.filename };
}

function docWithBytes(doc: Document, bytes: Buffer) {
  return {
    filename: doc.filename,
    storedMime: doc.mimeType,
    docType: doc.docType,
    slot: doc.slot,
    bytes,
  };
}

export async function serveDeskDocument(
  id: string,
  opts: {
    download?: boolean;
    versionId?: string | null;
    actorId?: string | null;
    actorName?: string | null;
  } = {},
): Promise<Response> {
  const doc = await getDeskDocument(id);
  if (!doc) return new Response("Not found", { status: 404 });
  if (opts.versionId) {
    const hit = await getDeskDocumentVersion(id, opts.versionId);
    if (!hit) return new Response("Not found", { status: 404 });
    await writeEoAuditSafe({
      action: "doc_view",
      summary: `${opts.download ? "Downloaded" : "Viewed"} ${hit.version.filename} (prior version)`,
      actorId: opts.actorId,
      actorName: opts.actorName,
      entityType: "document",
      entityId: doc.id,
      contactId: doc.contactId,
      accountId: doc.accountId,
      policyId: doc.policyId,
      dealId: doc.dealId,
      documentId: doc.id,
      meta: {
        filename: hit.version.filename,
        download: Boolean(opts.download),
        docType: hit.version.docType,
        slot: doc.slot,
        versionId: hit.version.id,
      },
    });
    const file = await loadDocumentBytes({
      ...doc,
      filename: hit.version.filename,
      mimeType: hit.version.mimeType,
      storagePath: hit.version.storagePath,
      docType: hit.version.docType,
    });
    if (!file) return missingFileResponse(hit.version.filename, Boolean(opts.download));
    return new Response(file.bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": contentDisposition(file.filename, Boolean(opts.download)),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  await writeEoAuditSafe({
    action: "doc_view",
    summary: `${opts.download ? "Downloaded" : "Viewed"} ${doc.filename}`,
    actorId: opts.actorId,
    actorName: opts.actorName,
    entityType: "document",
    entityId: doc.id,
    contactId: doc.contactId,
    accountId: doc.accountId,
    policyId: doc.policyId,
    dealId: doc.dealId,
    documentId: doc.id,
    meta: { filename: doc.filename, download: Boolean(opts.download), docType: doc.docType, slot: doc.slot },
  });
  const file = await loadDocumentBytes(doc);
  if (!file) return missingFileResponse(doc.filename, Boolean(opts.download));
  return new Response(file.bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": contentDisposition(file.filename, Boolean(opts.download)),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function missingFileResponse(filename: string, download: boolean): Response {
  const message = `${filename} is not in storage. Re-upload the file — local disk uploads do not survive Vercel deploys. Existing blob URLs are retried automatically.`;
  return new Response(message, {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": contentDisposition(filename, download),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
