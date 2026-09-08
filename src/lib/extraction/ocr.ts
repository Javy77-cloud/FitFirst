import path from "node:path";
import { looksLikePdf } from "@/lib/files/urls";
import type { ExtractedField } from "./extract";

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

export function classifyIngest(mimeType: string, filename: string, buffer?: Buffer): IngestPlan {
  if (buffer && looksLikePdf(buffer)) {
    return { engine: "pdf_text", implemented: true };
  }
  if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
    return { engine: "pdf_text", implemented: true };
  }
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
    const convert = (await import("heic-convert")).default as unknown as (opts: {
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
  if (looksLikePdf(buffer)) {
    throw new Error(
      "PDF bytes cannot go to Tesseract (Pdf reading is not supported). Rasterize pages first.",
    );
  }
  const Tesseract = await import("tesseract.js");
  const result = await Tesseract.recognize(buffer, "eng", {
    logger: () => undefined,
    cachePath: path.join(process.cwd(), ".tesseract-cache"),
  });
  return (result.data.text ?? "").replace(/\r/g, "").trim();
}

/** Photo / scan OCR text + archived field map (tests/helpers). Fill from source uses Gemini, not this. */
export async function extractFromImage(
  buffer: Buffer,
  filename?: string,
  mimeType?: string,
): Promise<OcrResult> {
  const name = filename ?? "photo";
  try {
    if (looksLikePdf(buffer) || (mimeType === "application/pdf" && !/\.(png|jpe?g|gif|webp)$/i.test(name))) {
      return {
        status: "failed",
        fields: [],
        text: "",
        message: `PDF bytes cannot go to Tesseract (${name}). Rasterize pages first. ${PHOTO_OCR_ENGINE}`,
      };
    }
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
    // Text only — field mapping for Fill is Gemini. Legacy synonym extract is archived.
    return {
      status: "done",
      fields: [] as ExtractedField[],
      text,
      message: `Photo OCR read ${name}. Fill from source uses Gemini for wind_mit / four_point / dec. ${PHOTO_OCR_ENGINE}`,
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
