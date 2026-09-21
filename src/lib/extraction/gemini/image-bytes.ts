import { isHeicUpload, isImageUpload, prepareImageBuffer } from "@/lib/extraction/ocr";

/** Longest edge we send to Gemini vision. Enough for a phone photo of a dec page. */
export const GEMINI_IMAGE_MAX_EDGE = 1600;
/** JPEG quality (0–100) after a resize. */
export const GEMINI_IMAGE_JPEG_QUALITY = 72;
/**
 * Raw image bytes we will inline. Base64 stays far under Gemini's ~20MB request cap
 * and avoids building a multi-megabyte JSON body inside the server action.
 */
export const GEMINI_INLINE_MAX_BYTES = 1_500_000;
/**
 * Above this, refuse to inline. A bigger base64 body can OOM the function; Vercel
 * then returns a non-Flight response and Fill shows no Gemini error.
 */
export const GEMINI_INLINE_HARD_CAP_BYTES = 12_000_000;

export type GeminiInlineBytes =
  | { ok: true; bytes: Buffer; mimeType: string; shrunk: boolean }
  | { ok: false; message: string };

function byteMessage(bytes: number): string {
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `${mb}MB`;
}

export async function resizeRasterForGemini(
  buffer: Buffer,
): Promise<{ bytes: Buffer; width: number; height: number }> {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(buffer);
  const edge = Math.max(image.width, image.height) || 1;
  const scale = edge > GEMINI_IMAGE_MAX_EDGE ? GEMINI_IMAGE_MAX_EDGE / edge : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);
  let quality = GEMINI_IMAGE_JPEG_QUALITY;
  let bytes = canvas.toBuffer("image/jpeg", quality);
  while (bytes.length > GEMINI_INLINE_MAX_BYTES && quality > 40) {
    quality -= 8;
    bytes = canvas.toBuffer("image/jpeg", quality);
  }
  return { bytes, width, height };
}

/**
 * Phone photos (HEIC / full-size JPEG) are shrunk before Gemini.
 * PDFs pass through unless they exceed the hard cap.
 */
export async function prepareGeminiInlineBytes(input: {
  bytes: Buffer | Uint8Array;
  mimeType?: string | null;
  filename?: string | null;
}): Promise<GeminiInlineBytes> {
  const filename = input.filename ?? "";
  const mimeType = input.mimeType ?? "";
  let bytes: Buffer = Buffer.from(input.bytes);
  const image = isImageUpload(mimeType, filename) || isHeicUpload(mimeType, filename);

  if (!image) {
    if (bytes.length > GEMINI_INLINE_HARD_CAP_BYTES) {
      return {
        ok: false,
        message: `File is too large to send to Gemini (${byteMessage(bytes.length)}).`,
      };
    }
    return { ok: true, bytes, mimeType: mimeType || "application/pdf", shrunk: false };
  }

  try {
    if (isHeicUpload(mimeType, filename)) {
      bytes = await prepareImageBuffer(bytes, mimeType || "image/heic", filename || "photo.heic", {
        quality: 0.7,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "HEIC convert failed";
    return { ok: false, message };
  }

  if (bytes.length <= GEMINI_INLINE_MAX_BYTES && !isHeicUpload(mimeType, filename)) {
    return { ok: true, bytes, mimeType: mimeType || "image/jpeg", shrunk: false };
  }

  try {
    const resized = await resizeRasterForGemini(bytes);
    if (resized.bytes.length > GEMINI_INLINE_HARD_CAP_BYTES) {
      return {
        ok: false,
        message: `Photo is still too large for Gemini after compress (${byteMessage(resized.bytes.length)}). Save a smaller JPG and retry.`,
      };
    }
    return { ok: true, bytes: resized.bytes, mimeType: "image/jpeg", shrunk: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "image compress failed";
    if (bytes.length <= GEMINI_INLINE_MAX_BYTES) {
      return { ok: true, bytes, mimeType: "image/jpeg", shrunk: isHeicUpload(mimeType, filename) };
    }
    return {
      ok: false,
      message: `Could not compress this photo for Gemini. Save as a smaller JPG and retry. ${message}`,
    };
  }
}
