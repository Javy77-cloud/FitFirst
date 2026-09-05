import { extractFromImage, isImageUpload } from "./ocr";

export class ImageOcrNotImplementedError extends Error {
  readonly code = "not_implemented" as const;
  constructor(filename: string) {
    super(`Image OCR is not implemented this pass (${filename}).`);
    this.name = "ImageOcrNotImplementedError";
  }
}

export type UploadTextResult = {
  text: string;
  engine: "pdf_text" | "ocr" | "text";
  emptyScan: boolean;
};

export function isPdfUpload(mimeType: string, filename: string): boolean {
  return mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
}

/** Scanned PDFs often parse to page numbers only. Need a photo or OCR fallback. */
export function pdfTextLooksEmpty(text: string): boolean {
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  return letters < 24;
}

export async function parsePdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default as (buf: Buffer) => Promise<{
      text: string;
    }>;
    const parsed = await pdfParse(buffer);
    return (parsed.text ?? "").replace(/\r/g, "").trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF parse failed";
    throw new Error(`Could not read document: ${message}`);
  }
}

export async function textFromUpload(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<string> {
  if (isImageUpload(mimeType, filename)) {
    throw new ImageOcrNotImplementedError(filename);
  }

  const isText =
    mimeType.startsWith("text/") ||
    filename.toLowerCase().endsWith(".txt") ||
    filename.toLowerCase().endsWith(".md");
  if (isText) {
    return buffer.toString("utf8");
  }

  return parsePdfText(buffer);
}

export async function readUploadText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<UploadTextResult> {
  if (isImageUpload(mimeType, filename)) {
    const ocr = await extractFromImage(buffer, filename, mimeType);
    return {
      text: ocr.text,
      engine: "ocr",
      emptyScan: pdfTextLooksEmpty(ocr.text),
    };
  }

  const isText =
    mimeType.startsWith("text/") ||
    filename.toLowerCase().endsWith(".txt") ||
    filename.toLowerCase().endsWith(".md");
  if (isText) {
    return { text: buffer.toString("utf8"), engine: "text", emptyScan: false };
  }

  const text = await parsePdfText(buffer);
  if (!pdfTextLooksEmpty(text)) {
    return { text, engine: "pdf_text", emptyScan: false };
  }

  const ocr = await extractFromImage(buffer, filename, mimeType);
  if (!pdfTextLooksEmpty(ocr.text)) {
    return { text: ocr.text, engine: "ocr", emptyScan: false };
  }

  return {
    text: text || ocr.text,
    engine: "pdf_text",
    emptyScan: true,
  };
}
