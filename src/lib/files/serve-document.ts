import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { documents, documentVersions, type Document, type DocumentVersion } from "@/lib/db/schema";
import { probeStoredFile, readStoredFile } from "@/lib/files/object-store";
import { stripLeadingJunkBeforePdf } from "@/lib/files/pdf-magic";
import {
  contentDisposition,
  isFilenameOnlyStub,
  looksLikePdf,
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

function looksLikeHtmlError(bytes: Buffer): boolean {
  const head = bytes.subarray(0, 256).toString("utf8").trim().toLowerCase();
  // Only treat HTML-shaped / short auth bodies as errors — never scan arbitrary PDF
  // binary for substrings like "unauthorized" (false missing after a successful get).
  if (!head) return false;
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) return true;
  if (head === "forbidden" || head === "unauthorized") return true;
  if (head.length < 200 && (head.includes("access denied") || head.includes("blob access"))) {
    return true;
  }
  return false;
}

export async function loadDocumentBytes(doc: Document): Promise<{
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
} | null> {
  let buffer = await readStoredFile(doc.storagePath);

  if (!buffer || isFilenameOnlyStub(doc.filename, buffer)) {
    return null;
  }
  // Private-blob auth failures used to wrap HTML into a blank PDF.
  if (looksLikeHtmlError(buffer)) {
    return null;
  }
  // Strip BOM/leading junk so client View + browser PDF viewers see clean %PDF-.
  if (looksLikePdf(buffer)) {
    buffer = stripLeadingJunkBeforePdf(buffer);
  }
  if (shouldWrapAsPdf(docWithBytes(doc, buffer))) {
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
        "Cache-Control": "private, max-age=0, must-revalidate",
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
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const FILE_MISSING_HEADER = "X-FitFirst-File-Missing";
export const FILE_OK_HEADER = "X-FitFirst-File-Ok";
export const FILE_PROBE_EXPOSE_HEADERS = `${FILE_OK_HEADER}, ${FILE_MISSING_HEADER}`;

function missingFileResponse(filename: string, download: boolean): Response {
  const message = `${filename} is not in storage. Re-upload the file — local disk uploads do not survive Vercel deploys. Existing blob URLs are retried automatically.`;
  return new Response(message, {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Do not reuse the .pdf filename here — Chrome's PDF viewer treats
      // inline text/plain + *.pdf disposition as a blank PDF pane.
      "Content-Disposition": contentDisposition("file-missing.txt", download),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      [FILE_MISSING_HEADER]: "1",
      "Access-Control-Expose-Headers": FILE_PROBE_EXPOSE_HEADERS,
    },
  });
}

function readyProbeResponse(mimeType?: string | null): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      [FILE_OK_HEADER]: "1",
      "Access-Control-Expose-Headers": FILE_PROBE_EXPOSE_HEADERS,
      ...(mimeType ? { "X-FitFirst-File-Mime": mimeType } : {}),
    },
  });
}

/** Existence check for in-app preview — confirms bytes are readable before View mounts. */
export async function probeDeskDocument(
  id: string,
  opts: { versionId?: string | null } = {},
): Promise<Response> {
  const doc = await getDeskDocument(id);
  if (!doc) {
    return new Response("Not found", {
      status: 404,
      headers: {
        [FILE_MISSING_HEADER]: "1",
        "Cache-Control": "private, no-store",
        "Access-Control-Expose-Headers": FILE_PROBE_EXPOSE_HEADERS,
      },
    });
  }
  let storagePath = doc.storagePath;
  let filename = doc.filename;
  let mimeType = doc.mimeType;
  if (opts.versionId) {
    const hit = await getDeskDocumentVersion(id, opts.versionId);
    if (!hit) {
      return new Response("Not found", {
        status: 404,
        headers: {
          [FILE_MISSING_HEADER]: "1",
          "Cache-Control": "private, no-store",
          "Access-Control-Expose-Headers": FILE_PROBE_EXPOSE_HEADERS,
        },
      });
    }
    storagePath = hit.version.storagePath;
    filename = hit.version.filename;
    mimeType = hit.version.mimeType;
  }

  // probeStoredFile requires readable bytes (not head-only).
  const exists = await probeStoredFile(storagePath);
  if (exists) return readyProbeResponse(mimeType);

  const file = await loadDocumentBytes({
    ...doc,
    filename,
    mimeType,
    storagePath,
  });
  if (!file) return missingFileResponse(filename, false);
  return readyProbeResponse(file.mimeType);
}
