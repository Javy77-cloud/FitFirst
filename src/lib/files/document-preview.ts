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
