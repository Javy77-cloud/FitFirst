import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { documents, documentVersions, type Document, type DocumentVersion } from "@/lib/db/schema";
import {
  contentDisposition,
  resolveFileMime,
  shouldWrapAsPdf,
} from "./urls";
import { wrapTextAsPdf } from "./wrap-text-pdf";
import { writeEoAuditSafe } from "@/lib/eo-audit/write";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

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

function resolveStoredPath(storagePath: string): string | null {
  const abs = path.resolve(/*turbopackIgnore: true*/ uploadRoot, storagePath);
  const root = path.resolve(/*turbopackIgnore: true*/ uploadRoot);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

export async function loadDocumentBytes(doc: Document): Promise<{
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
}> {
  const abs = resolveStoredPath(doc.storagePath);
  let buffer: Buffer | null = null;
  if (abs) {
    try {
      buffer = await readFile(/*turbopackIgnore: true*/ abs);
    } catch {
      buffer = null;
    }
  }

  if (!buffer) {
    if (shouldWrapAsPdf(docWithBytes(doc, Buffer.alloc(0)))) {
      buffer = await wrapTextAsPdf(doc.filename, `${doc.filename}\n${doc.docType}\nFile missing on disk.`);
    } else {
      buffer = Buffer.from(`${doc.filename}\n${doc.docType}\nDemo desk file.`, "utf8");
    }
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
  return new Response(file.bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": contentDisposition(file.filename, Boolean(opts.download)),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
