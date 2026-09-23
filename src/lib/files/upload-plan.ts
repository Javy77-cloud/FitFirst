import { looksLikePdf } from "@/lib/files/urls";

/**
 * Rosa Castellanos HO3 quote supporting file.
 * Three other PDFs on that quote save. This name is the one that does not.
 */
export const CASTELLANOS_WIND_MIT_FILENAME =
  "HENRY & ROSA CASTELLANOS MIT PDFwind mitigation inspection Kendall October 2020.PDF";

/**
 * Insurance PDFs we will store (wind-mit scans included).
 * Above the 25MB floor. Stays under the 50mb server-action body limit in next.config.
 */
export const INSURANCE_PDF_MAX_BYTES = 45 * 1024 * 1024;

/**
 * Vercel rejects the HTTP request before a Server Action or route runs.
 * next.config serverActions.bodySizeLimit cannot raise this platform cap.
 * Larger insurance PDFs go straight to Blob from the browser.
 */
export const VERCEL_INCOMING_BODY_MAX_BYTES = Math.floor(4.5 * 1024 * 1024);

const MB = 1024 * 1024;

export type UploadFactor = "size" | "name" | "mime" | "path";

export type UploadPlan =
  | {
      ok: true;
      via: "server-action" | "blob-client";
      displayName: string;
      mimeType: string;
    }
  | {
      ok: false;
      factor: UploadFactor;
      error: string;
    };

/** Readable name stored on the document row and shown on the quote. Not the storage key. */
export function displayFilename(filename: string | null | undefined): string {
  const raw = typeof filename === "string" ? filename.trim() : "";
  return raw || "file";
}

export function formatUploadMb(bytes: number): string {
  const mb = bytes / MB;
  const text = mb >= 10 ? String(Math.round(mb)) : mb.toFixed(1).replace(/\.0$/, "");
  return `${text} MB`;
}

/** Wind-mit / mitigation inspections are supporting quote files, not declarations. */
export function isWindMitSupportingName(filename: string | null | undefined): boolean {
  return /wind[\s._-]*mit|mitigation/i.test(filename ?? "");
}

export function agencyQuoteTags(input: {
  quoteId: string;
  filename: string;
  displayName: string;
}): string[] {
  const tags = [`quote:${input.quoteId}`, "source:agency", `label:${input.displayName}`];
  if (isWindMitSupportingName(input.filename) || isWindMitSupportingName(input.displayName)) {
    tags.push("supporting:wind_mit");
  }
  return tags;
}

/**
 * Characters that break a blob pathname or a URL that is later split on query delimiters.
 * Spaces are allowed: Rosa's dec (`Rosa Castellanos Florida Peninsula HO3 Dec Page.pdf`) saves.
 * `&` is not: this wind-mit name is the file that fails.
 */
export function storagePathProblems(relPath: string): string[] {
  const problems: string[] = [];
  if (relPath.includes("&")) problems.push("&");
  if (relPath.includes("#")) problems.push("#");
  if (relPath.includes("?")) problems.push("?");
  if (relPath.includes("//")) problems.push("//");
  if (/[\u0000-\u001f\u007f]/.test(relPath)) problems.push("control");
  if (relPath.length > 950) problems.push("length");
  return problems;
}

/** Storage key only. Display name stays on the document row. */
export function storageObjectKey(relPath: string): string {
  const normalized = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter((part) => part && part !== "." && part !== "..");
  if (parts.length === 0) return "upload.bin";
  const safe = parts.map((part, index) => sanitizeSegment(part, index === parts.length - 1));
  let key = safe.join("/");
  if (key.length > 900) {
    const last = safe[safe.length - 1] ?? "file.bin";
    const head = safe.slice(0, -1).join("/");
    const room = Math.max(16, 900 - (head ? head.length + 1 : 0));
    const shortened = last.slice(-room);
    key = head ? `${head}/${shortened}` : shortened;
  }
  return key;
}

function sanitizeSegment(segment: string, isFile: boolean): string {
  let cleaned = segment.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  if (!cleaned || cleaned === "." || cleaned === "..") cleaned = "file";
  if (isFile) {
    const dot = cleaned.lastIndexOf(".");
    if (dot > 0 && dot < cleaned.length - 1) {
      const ext = cleaned
        .slice(dot + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 8);
      const base = cleaned.slice(0, dot).replace(/\.+$/g, "") || "file";
      cleaned = ext ? `${base}.${ext}` : base;
    }
  }
  return cleaned.slice(0, 180) || "file";
}

export function storedMimeForUpload(
  filename: string,
  mimeType?: string | null,
  bytes?: Uint8Array | Buffer | null,
): string {
  if (bytes && bytes.length >= 5 && looksLikePdf(bytes)) return "application/pdf";
  const ext = extensionOf(filename);
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  if (ext === "txt") return "text/plain; charset=utf-8";
  const stored = (mimeType ?? "").trim().toLowerCase();
  if (stored && stored !== "application/octet-stream") return stored;
  return "application/octet-stream";
}

function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function quoteFileUploadMode(env: {
  vercel?: string | undefined;
  blobReady: boolean;
}): { onVercel: boolean; directBlob: boolean } {
  const onVercel = Boolean(env.vercel);
  return { onVercel, directBlob: onVercel && env.blobReady };
}

/**
 * Which single factor blocks a save. Safe path + pdf mime + size within the
 * insurance cap returns null — the file can be stored and the display name kept.
 */
export function isolateUploadFactor(input: {
  filename: string;
  byteLength: number;
  mimeType?: string | null;
  storagePath: string;
  bytesArePdf?: boolean;
}): { factor: UploadFactor; detail: string } | null {
  const display = displayFilename(input.filename);
  const pathProblems = storagePathProblems(input.storagePath);
  if (pathProblems.length > 0) {
    return {
      factor: "path",
      detail: `Storage path contains ${pathProblems.join(", ")}. Display name “${display}” is not the storage key.`,
    };
  }
  if (input.byteLength > INSURANCE_PDF_MAX_BYTES) {
    return {
      factor: "size",
      detail: `${formatUploadMb(input.byteLength)} is over the ${formatUploadMb(INSURANCE_PDF_MAX_BYTES)} insurance PDF cap.`,
    };
  }
  if (!display || display === "file") {
    return { factor: "name", detail: "The file has no name to show on the quote." };
  }
  const bytes = input.bytesArePdf ? Buffer.from("%PDF-1.4") : null;
  const mime = storedMimeForUpload(input.filename, input.mimeType, bytes);
  if (!mime) {
    return { factor: "mime", detail: "No MIME type could be stored." };
  }
  return null;
}

export function planUpload(input: {
  filename: string;
  byteLength: number;
  mimeType?: string | null;
  onVercel: boolean;
  directBlob: boolean;
  bytesArePdf?: boolean;
}): UploadPlan {
  const displayName = displayFilename(input.filename);
  if (!input.filename?.trim()) {
    return { ok: false, factor: "name", error: "Choose a file with a name. Nothing was saved." };
  }
  const bytes = input.bytesArePdf ? Buffer.from("%PDF-1.4") : null;
  const mimeType = storedMimeForUpload(input.filename, input.mimeType, bytes);
  if (input.byteLength <= 0) {
    return {
      ok: false,
      factor: "size",
      error: `“${displayName}” is empty (0 bytes). Nothing was saved.`,
    };
  }
  if (input.byteLength > INSURANCE_PDF_MAX_BYTES) {
    return {
      ok: false,
      factor: "size",
      error: `“${displayName}” is ${formatUploadMb(input.byteLength)}. Insurance PDFs save up to ${formatUploadMb(INSURANCE_PDF_MAX_BYTES)}. This one was not saved.`,
    };
  }
  const incoming = input.onVercel ? VERCEL_INCOMING_BODY_MAX_BYTES : INSURANCE_PDF_MAX_BYTES;
  if (input.byteLength > incoming) {
    if (!input.directBlob) {
      const where = input.onVercel ? " (Vercel function body limit)" : "";
      return {
        ok: false,
        factor: "size",
        error: `“${displayName}” is ${formatUploadMb(input.byteLength)}. This server accepts ${formatUploadMb(incoming)} in one request${where}. The file was not saved.`,
      };
    }
    return { ok: true, via: "blob-client", displayName, mimeType };
  }
  return { ok: true, via: "server-action", displayName, mimeType };
}

export function messageFromUploadError(error: unknown, filename: string): string {
  const display = displayFilename(filename);
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (/pathname/i.test(cleaned)) {
    return `Could not store “${display}”. The storage path was rejected (${cleaned}). The display name was left unchanged. Nothing was saved.`;
  }
  if (/content[- ]?type|mime type/i.test(cleaned)) {
    return `Could not store “${display}” because the file type was rejected (${cleaned}). Nothing was saved.`;
  }
  if (/too large|file length|body exceeded|payload too large/i.test(cleaned)) {
    return `“${display}” was rejected for size (${cleaned}). Insurance PDFs save up to ${formatUploadMb(INSURANCE_PDF_MAX_BYTES)}. Nothing was saved.`;
  }
  if (!cleaned || /try again/i.test(cleaned)) {
    return `Could not store “${display}”. Nothing was saved.`;
  }
  return `Could not store “${display}”. ${cleaned}`;
}

/** Browser Blob uploads may only land on this record's folder (deal or policy) in our store. */
export function clientUploadPathError(pathname: string, scopeId?: string | null): string | null {
  const key = pathname.trim();
  if (!key || storageObjectKey(key) !== key) {
    return `Refusing storage path “${key || "(empty)"}”. It is not a safe object key. Nothing was saved.`;
  }
  if (storagePathProblems(key).length > 0) {
    return `Refusing storage path “${key}”. It still has ${storagePathProblems(key).join(", ")}. Nothing was saved.`;
  }
  if (scopeId && !key.includes(`/${scopeId}/`)) {
    return `Refusing storage path “${key}”. It is not on this record. Nothing was saved.`;
  }
  return null;
}

export function isAllowedStoredUploadUrl(storagePath: string, scopeId: string): boolean {
  const raw = storagePath.trim();
  if (!raw) return false;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (!url.hostname.endsWith(".blob.vercel-storage.com")) return false;
      const path = decodeURIComponent(url.pathname);
      return path.includes(`/${scopeId}/`) && !path.includes("..") && !path.includes("&");
    } catch {
      return false;
    }
  }
  return (
    raw.includes(`/${scopeId}/`) &&
    storageObjectKey(raw) === raw &&
    storagePathProblems(raw).length === 0
  );
}
