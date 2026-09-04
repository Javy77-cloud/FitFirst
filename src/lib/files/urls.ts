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

export function looksLikePdf(bytes: Uint8Array | Buffer): boolean {
  if (bytes.length < 5) return false;
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
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
  if (input.docType === "quote_pdf" || input.slot === "quote_pdf") {
    if (extensionOf(input.filename) === "pdf" || !input.storedMime) return "application/pdf";
  }
  return inferMimeFromName(input.filename, input.storedMime);
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
