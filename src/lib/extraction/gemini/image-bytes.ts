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

/** JPEG EXIF orientation 1–8. Missing or non-JPEG returns 1 (already upright). */
export function jpegExifOrientation(bytes: Buffer): number {
  if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xda || marker === 0xd9) break;
    const size = bytes.readUInt16BE(offset + 2);
    if (size < 2 || offset + 2 + size > bytes.length) break;
    if (marker === 0xe1) {
      const start = offset + 4;
      if (bytes.toString("ascii", start, start + 6) === "Exif\0\0") {
        return orientationFromTiff(bytes, start + 6);
      }
    }
    offset += 2 + size;
  }
  return 1;
}

function orientationFromTiff(bytes: Buffer, tiff: number): number {
  if (tiff + 8 > bytes.length) return 1;
  const little = bytes.toString("ascii", tiff, tiff + 2) === "II";
  const read16 = (pos: number) => (little ? bytes.readUInt16LE(pos) : bytes.readUInt16BE(pos));
  const read32 = (pos: number) => (little ? bytes.readUInt32LE(pos) : bytes.readUInt32BE(pos));
  if (read16(tiff + 2) !== 0x2a) return 1;
  const ifd = tiff + read32(tiff + 4);
  if (ifd + 2 > bytes.length) return 1;
  const count = read16(ifd);
  for (let i = 0; i < count; i += 1) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > bytes.length) break;
    if (read16(entry) !== 0x0112) continue;
    const value = read16(entry + 8);
    if (value >= 1 && value <= 8) return value;
  }
  return 1;
}

function orientedSize(width: number, height: number, orientation: number): { width: number; height: number } {
  if (orientation >= 5 && orientation <= 8) return { width: height, height: width };
  return { width, height };
}

/** Bake EXIF orientation into pixels so a sideways phone shot is upright for Gemini. */
function drawUpright(
  ctx: {
    save: () => void;
    restore: () => void;
    translate: (x: number, y: number) => void;
    scale: (x: number, y: number) => void;
    rotate: (angle: number) => void;
    drawImage: (image: unknown, x: number, y: number, w: number, h: number) => void;
  },
  image: unknown,
  orientation: number,
  canvasWidth: number,
  canvasHeight: number,
  drawWidth: number,
  drawHeight: number,
) {
  ctx.save();
  switch (orientation) {
    case 2:
      ctx.translate(canvasWidth, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(canvasWidth, canvasHeight);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, canvasHeight);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(Math.PI / 2);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.translate(canvasWidth, 0);
      ctx.rotate(Math.PI / 2);
      break;
    case 7:
      ctx.translate(canvasWidth, 0);
      ctx.rotate(Math.PI / 2);
      ctx.translate(drawWidth, 0);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.translate(0, canvasHeight);
      ctx.rotate(-Math.PI / 2);
      break;
    default:
      break;
  }
  ctx.drawImage(image, 0, 0, drawWidth, drawHeight);
  ctx.restore();
}

export async function resizeRasterForGemini(
  buffer: Buffer,
): Promise<{ bytes: Buffer; width: number; height: number }> {
  const orientation = jpegExifOrientation(buffer);
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(buffer);
  const oriented = orientedSize(image.width, image.height, orientation);
  const edge = Math.max(oriented.width, oriented.height) || 1;
  const scale = edge > GEMINI_IMAGE_MAX_EDGE ? GEMINI_IMAGE_MAX_EDGE / edge : 1;
  const width = Math.max(1, Math.round(oriented.width * scale));
  const height = Math.max(1, Math.round(oriented.height * scale));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  drawUpright(
    ctx as unknown as Parameters<typeof drawUpright>[0],
    image,
    orientation,
    width,
    height,
    Math.max(1, Math.round(image.width * scale)),
    Math.max(1, Math.round(image.height * scale)),
  );
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

  const sideways = jpegExifOrientation(bytes) > 1;
  if (bytes.length <= GEMINI_INLINE_MAX_BYTES && !isHeicUpload(mimeType, filename) && !sideways) {
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
