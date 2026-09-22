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
