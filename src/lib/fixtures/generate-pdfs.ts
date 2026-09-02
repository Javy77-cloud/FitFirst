import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CLEAN_DEC_TEXT, MESSY_WIND_MIT_TEXT } from "./sample-docs";

async function writePdf(filePath: string, title: string, body: string) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Courier);
  page.drawText(title, {
    x: 48,
    y: 740,
    size: 14,
    font,
    color: rgb(0.05, 0.13, 0.25),
  });
  const lines = body.split("\n");
  let y = 710;
  for (const line of lines) {
    page.drawText(line.slice(0, 90), {
      x: 48,
      y,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 16;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, await doc.save());
}

export async function generateSamplePdfs(dir = path.join(process.cwd(), "fixtures")) {
  await writePdf(path.join(dir, "sample-palm-bay-dec.pdf"), "HO Declarations (clean)", CLEAN_DEC_TEXT);
  await writePdf(
    path.join(dir, "sample-palm-bay-wind-mit-handwritten.pdf"),
    "Wind Mit (messy handwriting)",
    MESSY_WIND_MIT_TEXT,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateSamplePdfs()
    .then(() => {
      console.log("Wrote sample PDFs to fixtures/");
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
