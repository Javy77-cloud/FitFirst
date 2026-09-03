export type IngestEngine = "pdf_text" | "ocr";

export type IngestPlan = {
  engine: IngestEngine;
  implemented: boolean;
};

export type OcrResult = {
  status: "not_implemented";
  fields: [];
  message: string;
};

/** Locked next slice. Do not add a paid OCR vendor. Do not block Fill on photos. */
export const PHOTO_OCR_NEXT_SLICE =
  "Photo OCR is the next slice (tesseract or equivalent). Photo-a-dec is a selling point. Fill still runs on text PDFs when a photo is on the deal.";

/** Image / scanned-photo OCR hook. This pass returns not_implemented. */
export function extractFromImage(_buffer?: Buffer, filename?: string): OcrResult {
  return {
    status: "not_implemented",
    fields: [],
    message: `Photo OCR hook: not_implemented${filename ? ` (${filename})` : ""}. Stored on Files. Fill is not blocked — type the sheet or use a text/PDF dec. ${PHOTO_OCR_NEXT_SLICE}`,
  };
}

export function isImageUpload(mimeType: string, filename: string): boolean {
  if (mimeType.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|tiff?|heic|bmp)$/i.test(filename);
}

export function classifyIngest(mimeType: string, filename: string): IngestPlan {
  if (isImageUpload(mimeType, filename)) {
    return { engine: "ocr", implemented: false };
  }
  return { engine: "pdf_text", implemented: true };
}
