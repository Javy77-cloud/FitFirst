import { extractFieldsFromText, type ExtractedField } from "./extract";

export type IngestEngine = "pdf_text" | "ocr";

export type IngestPlan = {
  engine: IngestEngine;
  implemented: boolean;
};

export type OcrResult = {
  status: "done" | "failed";
  fields: ExtractedField[];
  text: string;
  message: string;
};

export const PHOTO_OCR_ENGINE =
  "In-desk tesseract OCR. No paid vendor. Source tag photo-ocr. Cov A is never guessed from a Zestimate.";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|tiff?|heic|heif|bmp)$/i;
const HEIC_EXT = /\.(heic|heif)$/i;

export function isImageUpload(mimeType: string, filename: string): boolean {
  if (mimeType.startsWith("image/")) return true;
  return IMAGE_EXT.test(filename);
}

export function isHeicUpload(mimeType: string, filename: string): boolean {
  if (/image\/hei[cf]/i.test(mimeType)) return true;
  return HEIC_EXT.test(filename);
}

export function classifyIngest(mimeType: string, filename: string): IngestPlan {
  if (isImageUpload(mimeType, filename)) {
    return { engine: "ocr", implemented: true };
  }
  return { engine: "pdf_text", implemented: true };
}

export async function prepareImageBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<Buffer> {
  if (!isHeicUpload(mimeType, filename)) return buffer;
  try {
    const convert = (await import("heic-convert")).default as (opts: {
      buffer: Buffer;
      format: "JPEG" | "PNG";
      quality?: number;
    }) => Promise<ArrayBuffer>;
    const jpeg = await convert({ buffer, format: "JPEG", quality: 0.92 });
    return Buffer.from(jpeg);
  } catch (error) {
    const message = error instanceof Error ? error.message : "HEIC convert failed";
    throw new Error(
      `Could not read HEIC (${filename}). Save as JPG or PNG and retry. ${message}`,
    );
  }
}

export async function recognizeImageText(buffer: Buffer): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const result = await Tesseract.recognize(buffer, "eng", {
    logger: () => undefined,
  });
  return (result.data.text ?? "").replace(/\r/g, "").trim();
}

/** Photo / scan OCR. Shares extractFieldsFromText with the PDF path. Invents nothing. */
export async function extractFromImage(
  buffer: Buffer,
  filename?: string,
  mimeType?: string,
): Promise<OcrResult> {
  const name = filename ?? "photo";
  try {
    const prepared = await prepareImageBuffer(buffer, mimeType ?? "", name);
    const text = await recognizeImageText(prepared);
    if (!text) {
      return {
        status: "failed",
        fields: [],
        text: "",
        message: `Photo OCR found no readable text on ${name}. Try a sharper scan. ${PHOTO_OCR_ENGINE}`,
      };
    }
    const extracted = extractFieldsFromText(text);
    const keys = extracted.fields.map((f) => f.fieldKey);
    return {
      status: "done",
      fields: extracted.fields,
      text,
      message:
        keys.length === 0
          ? `Photo OCR read ${name} but found no labeled Quote Sheet fields. Type the blanks or try a clearer photo. ${PHOTO_OCR_ENGINE}`
          : `Photo OCR mapped ${keys.join(", ")} from ${name}. CHECK fields need a glance. ${PHOTO_OCR_ENGINE}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photo OCR failed";
    return {
      status: "failed",
      fields: [],
      text: "",
      message: `${message} ${PHOTO_OCR_ENGINE}`,
    };
  }
}
