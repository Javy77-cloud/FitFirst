import { isImageUpload } from "@/lib/extraction/ocr";
import { readUploadText } from "@/lib/extraction/pdf";
import { withDeadline } from "@/lib/async/deadline";

/** PDF text-layer read during Fill. Photos never enter this path. */
export const FILL_LINE_TEXT_TIMEOUT_MS = 8_000;

export const FILL_STORAGE_READ_TIMEOUT_MS = 10_000;

type LineGateDoc = {
  docType?: string | null;
  mimeType?: string | null;
  filename?: string | null;
};

/**
 * Phone photos of a dec already trust the sheet being filled
 * (`trustSheetLineForFill`). Running Tesseract here has no timeout and does
 * not settle on serverless, so Fill Risk Profile's Docs action never returned.
 */
export function fillShopLineSkipsTextExtract(doc: LineGateDoc): boolean {
  const docType = String(doc.docType ?? "").trim().toLowerCase();
  const mimeType = String(doc.mimeType ?? "").trim().toLowerCase();
  const filename = String(doc.filename ?? "");
  if (docType === "photo") return true;
  return isImageUpload(mimeType, filename);
}

/** Photos first so a hung PDF text layer cannot block the declaration image. */
export function compareFillSourceDocs(a: LineGateDoc, b: LineGateDoc): number {
  return Number(fillShopLineSkipsTextExtract(b)) - Number(fillShopLineSkipsTextExtract(a));
}

export type FillLineGateText = { text: string; timedOut: boolean };

export async function readFillShopLineText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  docType: string,
  options?: {
    timeoutMs?: number;
    readText?: (buffer: Buffer, mimeType: string, filename: string) => Promise<{ text: string }>;
  },
): Promise<FillLineGateText> {
  if (fillShopLineSkipsTextExtract({ docType, mimeType, filename })) {
    return { text: "", timedOut: false };
  }
  const readText = options?.readText ?? readUploadText;
  const timeoutMs = options?.timeoutMs ?? FILL_LINE_TEXT_TIMEOUT_MS;
  let timedOut = false;
  const text = await withDeadline(
    readText(buffer, mimeType, filename).then((result) => result.text ?? ""),
    timeoutMs,
    () => {
      timedOut = true;
      return "";
    },
  );
  return { text: timedOut ? "" : text, timedOut };
}
