import { looksLikeImageBuffer, looksLikePdf } from "@/lib/files/urls";
import { extractFromImage, isImageUpload } from "./ocr";
import {
  extractTextWithPdfjs,
  extractTextWithPdftotext,
  rasterizePdfPages,
} from "./pdf-raster";

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

function letterCount(text: string): number {
  return (text.match(/[A-Za-z]/g) ?? []).length;
}

export function isPdfUpload(mimeType: string, filename: string, buffer?: Buffer): boolean {
  if (buffer && looksLikePdf(buffer)) return true;
  if (buffer && looksLikeImageBuffer(buffer)) return false;
  return mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
}

/** Scanned PDFs often parse to page numbers only. Need a photo or OCR fallback. */
export function pdfTextLooksEmpty(text: string): boolean {
  return letterCount(text) < 24;
}

async function parseWithPdfParse(buffer: Buffer): Promise<string> {
  try {
    // Import the implementation file — pdf-parse's index.js runs a debug fixture
    // when `module.parent` is missing (Next / vitest dynamic import).
    const impl = (await import("pdf-parse/lib/pdf-parse.js")) as {
      default?: (buf: Buffer) => Promise<{ text: string }>;
    } & ((buf: Buffer) => Promise<{ text: string }>);
    const pdfParse = (typeof impl === "function" ? impl : impl.default) as (
      buf: Buffer,
    ) => Promise<{ text: string }>;
    const parsed = await pdfParse(buffer);
    return (parsed.text ?? "").replace(/\r/g, "").trim();
  } catch {
    try {
      const mod = await import("pdf-parse");
      const pdfParse = ((mod as { default?: (buf: Buffer) => Promise<{ text: string }> }).default ??
        mod) as (buf: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(buffer);
      return (parsed.text ?? "").replace(/\r/g, "").trim();
    } catch {
      return "";
    }
  }
}

/** Text-layer extract only. Never OCRs. Never sends bytes to Tesseract. */
export async function extractPdfTextLayer(buffer: Buffer): Promise<string> {
  const [fromParse, fromPdfjs, fromPoppler] = await Promise.all([
    parseWithPdfParse(buffer).catch(() => ""),
    extractTextWithPdfjs(buffer).catch(() => ""),
    extractTextWithPdftotext(buffer).catch(() => ""),
  ]);
  const ranked = [fromParse, fromPdfjs, fromPoppler].sort((a, b) => letterCount(b) - letterCount(a));
  return ranked[0] ?? "";
}

export async function parsePdfText(buffer: Buffer): Promise<string> {
  const text = await extractPdfTextLayer(buffer);
  if (text) return text;
  throw new Error("Could not read document: no PDF text layer");
}

async function ocrRasterizedPdf(buffer: Buffer, filename: string): Promise<string> {
  const pages = await rasterizePdfPages(buffer);
  if (pages.length === 0) return "";
  const chunks: string[] = [];
  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i];
    if (looksLikePdf(page)) continue;
    const result = await extractFromImage(page, `${filename}#page-${i + 1}.png`, "image/png");
    if (result.text.trim()) chunks.push(result.text);
  }
  return chunks.join("\n\n").trim();
}

export async function textFromUpload(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<string> {
  const result = await readUploadText(buffer, mimeType, filename);
  return result.text;
}

/**
 * Single ingest entry: text files, image OCR, PDF text layer, then rasterize+OCR.
 * PDF bytes never go to Tesseract.
 */
export async function readUploadText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<UploadTextResult> {
  if (looksLikeImageBuffer(buffer) || (isImageUpload(mimeType, filename) && !looksLikePdf(buffer))) {
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
  if (isText && !looksLikePdf(buffer)) {
    return { text: buffer.toString("utf8"), engine: "text", emptyScan: false };
  }

  if (isPdfUpload(mimeType, filename, buffer) || looksLikePdf(buffer)) {
    const layer = await extractPdfTextLayer(buffer);
    if (!pdfTextLooksEmpty(layer)) {
      return { text: layer, engine: "pdf_text", emptyScan: false };
    }
    const ocrText = await ocrRasterizedPdf(buffer, filename);
    if (!pdfTextLooksEmpty(ocrText)) {
      return { text: ocrText, engine: "ocr", emptyScan: false };
    }
    return {
      text: layer || ocrText,
      engine: "pdf_text",
      emptyScan: true,
    };
  }

  const fallback = buffer.toString("utf8");
  return { text: fallback, engine: "text", emptyScan: pdfTextLooksEmpty(fallback) };
}
