import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildTextLayerPdf(title: string, body: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const lines = [`${title}`, ...body.split("\n")];
  let page = doc.addPage([612, 792]);
  let y = 760;
  for (const line of lines) {
    if (y < 40) {
      page = doc.addPage([612, 792]);
      y = 760;
    }
    page.drawText(line.slice(0, 96), {
      x: 36,
      y,
      size: 10,
      font,
      color: rgb(0.05, 0.05, 0.08),
    });
    y -= 14;
  }
  return Buffer.from(await doc.save());
}

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** Image-only PDF (no text operators). Used to prove rasterize-then-OCR, never raw PDF → Tesseract. */
export async function buildImageOnlyPdf(png: Buffer = TINY_PNG): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(png);
  const page = doc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return Buffer.from(await doc.save());
}

export { TINY_PNG };
