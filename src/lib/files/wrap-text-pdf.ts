import { PDFDocument, StandardFonts } from "pdf-lib";

/** Turn a leftover text stub into a real PDF the browser can preview. */
export async function wrapTextAsPdf(title: string, text: string): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 740;
  page.drawText(title.slice(0, 90), { x: 48, y, size: 13, font: bold });
  y -= 22;
  page.drawText("FitFirst desk preview. This file is not a policy.", {
    x: 48,
    y,
    size: 10,
    font,
  });
  y -= 28;
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.slice(0, 96) || " ";
    page.drawText(line, { x: 48, y, size: 11, font });
    y -= 16;
    if (y < 56) break;
  }
  return Buffer.from(await pdf.save());
}
