import { gunzipSync } from "node:zlib";

/** Desk file URLs. View is inline; download forces a save. */

export function fileViewHref(documentId: string): string {
  return `/api/files/${documentId}`;
}

export function fileDownloadHref(documentId: string): string {
  return `/api/files/${documentId}?download=1`;
}

export function filePreviewHref(documentId: string, print = false): string {
  return print ? `/files/${documentId}?print=1` : `/files/${documentId}`;
}

export function fileVersionHref(documentId: string, versionId: string, download = false): string {
  const query = download ? `version=${versionId}&download=1` : `version=${versionId}`;
  return `/api/files/${documentId}?${query}`;
}

/** Gzip magic 1f 8b — Blob/CDN sometimes returns gzipped body with Content-Type: application/pdf. */
export function isGzipMagic(bytes: Uint8Array | Buffer): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/**
 * True when `%PDF` appears in the first 1KB, allowing leading BOM/whitespace/junk.
 * Accepts `%PDF-` (normal) or `%PDF` + version digit (tolerant of missing hyphen).
 */
function hasPdfMagicInHead(bytes: Uint8Array | Buffer): boolean {
  const limit = Math.min(bytes.length, 1024);
  if (limit < 4) return false;
  for (let i = 0; i <= limit - 4; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 // F
    ) {
      if (i + 4 >= bytes.length) return false;
      const next = bytes[i + 4]!;
      // `%PDF-` or `%PDF1` / `%PDF2` …
      if (next === 0x2d) return true;
      if (next >= 0x30 && next <= 0x39) return true;
    }
  }
  return false;
}

/** Inflate gzip body when present; otherwise return original bytes. */
export function inflateIfGzip(bytes: Buffer): Buffer {
  if (!isGzipMagic(bytes)) return bytes;
  try {
    return gunzipSync(bytes);
  } catch {
    return bytes;
  }
}

export function looksLikePdf(bytes: Uint8Array | Buffer): boolean {
  if (bytes.length < 4) return false;
  if (hasPdfMagicInHead(bytes)) return true;
  if (isGzipMagic(bytes)) {
    try {
      const inflated = gunzipSync(Buffer.from(bytes));
      return hasPdfMagicInHead(inflated);
    } catch {
      return false;
    }
  }
  return false;
}

/** JPEG / PNG / GIF / BMP / WEBP magic — used so a misnamed image never goes through pdf-parse. */
export function looksLikeImageBuffer(bytes: Uint8Array | Buffer): boolean {
  if (bytes.length < 12) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return true;
  const head = Buffer.from(bytes.subarray(0, 12)).toString("ascii");
  return head.startsWith("RIFF") && head.includes("WEBP");
}

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  csv: "text/csv; charset=utf-8",
  html: "text/html; charset=utf-8",
};

export function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function inferMimeFromName(filename: string, stored?: string | null): string {
  const fromName = EXT_MIME[extensionOf(filename)];
  if (fromName) return fromName;
  if (stored && stored !== "application/octet-stream") return stored;
  return stored || "application/octet-stream";
}

export function resolveFileMime(input: {
  filename: string;
  storedMime?: string | null;
  bytes?: Uint8Array | Buffer;
  docType?: string | null;
  slot?: string | null;
}): string {
  if (input.bytes && looksLikePdf(input.bytes)) return "application/pdf";
  if (
    input.docType === "quote_pdf" ||
    input.slot === "quote_pdf" ||
    input.docType === "proposal_pdf" ||
    input.docType === "proposal" ||
    input.slot === "proposal"
  ) {
    if (extensionOf(input.filename) === "pdf" || !input.storedMime) return "application/pdf";
  }
  return inferMimeFromName(input.filename, input.storedMime);
}

/** Leftover serve-document stubs stored the filename as the file body. */
export function isFilenameOnlyStub(filename: string, bytes: Uint8Array | Buffer): boolean {
  if (looksLikePdf(bytes) || looksLikeImageBuffer(bytes)) return false;
  const text = Buffer.from(bytes).toString("utf8").replace(/^\uFEFF/, "").trim();
  if (!text) return true;
  const base = filename.split(/[/\\]/).pop() ?? filename;
  return text === filename || text === base;
}

export function shouldWrapAsPdf(input: {
  filename: string;
  storedMime?: string | null;
  docType?: string | null;
  slot?: string | null;
  bytes: Uint8Array | Buffer;
}): boolean {
  if (looksLikePdf(input.bytes)) return false;
  if (input.docType === "quote_pdf" || input.slot === "quote_pdf") return true;
  if (input.docType === "proposal_pdf" || input.docType === "proposal" || input.slot === "proposal") {
    return true;
  }
  if (extensionOf(input.filename) === "pdf") return true;
  return false;
}

export function sanitizeContentFilename(filename: string): string {
  return filename.replace(/[\r\n"]/g, "_").slice(0, 180) || "document";
}

export function contentDisposition(filename: string, download: boolean): string {
  const safe = sanitizeContentFilename(filename);
  const encoded = encodeURIComponent(safe);
  const kind = download ? "attachment" : "inline";
  return `${kind}; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

export function isQuoteAttachment(doc: { docType?: string | null; slot?: string | null }): boolean {
  return doc.slot === "quote_pdf" || doc.docType === "quote_pdf" || doc.docType === "quote";
}

export function isProposalAttachment(doc: { docType?: string | null; slot?: string | null }): boolean {
  return doc.slot === "proposal" || doc.docType === "proposal_pdf" || doc.docType === "proposal";
}
