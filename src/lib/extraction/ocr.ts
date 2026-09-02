export type OcrResult = {
  status: "not_implemented";
  fields: [];
  message: string;
};

/** Image / scanned-photo OCR hook. Paid vendor OCR is out of scope this pass. */
export function extractFromImage(_buffer?: Buffer, filename?: string): OcrResult {
  return {
    status: "not_implemented",
    fields: [],
    message: `Image OCR is not implemented this pass${filename ? ` (${filename})` : ""}. Store the photo as a source file and type the Quote Sheet.`,
  };
}

export function isImageUpload(mimeType: string, filename: string): boolean {
  if (mimeType.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|tiff?|heic|bmp)$/i.test(filename);
}
