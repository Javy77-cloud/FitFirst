import { extensionOf } from "@/lib/files/urls";

export type DocumentPreviewKind = "pdf" | "image" | "unsupported";

const INLINE_IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);
const INLINE_IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

/** PDF + jpeg/png/webp can render in the in-app modal. Everything else downloads. */
export function documentPreviewKind(input: {
  filename?: string | null;
  mimeType?: string | null;
}): DocumentPreviewKind {
  const mime = (input.mimeType ?? "").toLowerCase().split(";")[0].trim();
  const ext = extensionOf(input.filename ?? "");
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (INLINE_IMAGE_MIMES.has(mime) || INLINE_IMAGE_EXTS.has(ext)) return "image";
  return "unsupported";
}

export type DocumentProbeVerdict = "ready" | "missing" | "error";

/**
 * Interpret a storage probe response for the in-app View modal.
 *
 * Do not require opaque custom headers — some runtimes strip or hide them.
 * Treat 204, explicit ok header, successful PDF/image/json body, or ok status
 * without a missing header as ready. Only flag missing when the server says so
 * (missing header / 404) or the response clearly failed.
 */
export function interpretDocumentProbe(res: {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
}): DocumentProbeVerdict {
  const missingHeader = res.headers.get("X-FitFirst-File-Missing") === "1";
  const okHeader = res.headers.get("X-FitFirst-File-Ok") === "1";
  const contentType = (res.headers.get("Content-Type") ?? "").toLowerCase();

  if (missingHeader || res.status === 404) return "missing";
  if (res.status === 401 || res.status === 403) return "error";

  if (res.status === 204 || okHeader) return "ready";

  if (
    res.ok &&
    (contentType.includes("application/pdf") ||
      contentType.includes("image/") ||
      contentType.includes("application/json"))
  ) {
    return "ready";
  }

  // Soft ready: ok status and server did not set the missing marker.
  if (res.ok && !missingHeader) return "ready";

  if (!res.ok) return "missing";
  return "error";
}

/** Prefer Content-Type from the authenticated GET; fall back by preview kind. */
export function previewMimeFromResponse(
  res: { headers: { get(name: string): string | null } },
  kind: DocumentPreviewKind,
): string {
  const ct = (res.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  if (ct && ct !== "application/octet-stream" && !ct.startsWith("text/plain")) return ct;
  if (kind === "pdf") return "application/pdf";
  if (kind === "image") return ct.startsWith("image/") ? ct : "image/jpeg";
  return ct || "application/octet-stream";
}

function headLooksLikeHtml(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 256))).trim().toLowerCase();
  return (
    head.startsWith("<!doctype html") ||
    head.startsWith("<html") ||
    head.includes("unauthorized") ||
    head.includes("access denied")
  );
}

function headLooksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

/**
 * Interpret an authenticated full-file GET used for in-app preview.
 * Empty bodies, HTML error pages, and missing markers are not "ready".
 */
export function interpretDocumentBytes(input: {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  byteLength: number;
  head?: Uint8Array;
  kind?: DocumentPreviewKind;
}): DocumentProbeVerdict {
  const missingHeader = input.headers.get("X-FitFirst-File-Missing") === "1";
  if (missingHeader || input.status === 404) return "missing";
  if (input.status === 401 || input.status === 403) return "error";
  if (!input.ok) return input.status >= 500 ? "error" : "missing";
  if (!input.byteLength) return "missing";
  if (input.head && headLooksLikeHtml(input.head)) return "missing";
  // Real PDF responses must start with %PDF — never mount a blank viewer on error text.
  if (input.kind === "pdf" && input.head && !headLooksLikePdf(input.head)) return "missing";
  return "ready";
}

