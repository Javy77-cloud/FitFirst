import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { AGENCY_BRAND } from "@/lib/domain";
import { letterFieldDefs, letterTemplateName } from "./fields";
import { DOCUMENT_PIPELINE_TYPE_LABELS, type DocumentPipelineJobType } from "./types";

export const LETTER_FILL_SLOT = "filled_letter";
export const LETTER_FILL_DISCLAIMER =
  "Agency form filled from confirmed fields. Not a licensed ACORD product.";

export function letterFillFilename(type: DocumentPipelineJobType): string {
  if (type === "aor") return "AOR-pack-filled.pdf";
  if (type === "acord") return "ACORD-HO3-filled.pdf";
  if (type === "loss_run") return "Loss-run-request-filled.pdf";
  return "Cancellation-pack-filled.pdf";
}

export function letterFillDocType(type: DocumentPipelineJobType): string {
  return type;
}

export async function buildAgencyLetterPdf(input: {
  type: DocumentPipelineJobType;
  dealTitle?: string | null;
  confirmed: Record<string, string>;
  agencyName?: string | null;
}): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.1, 0.18, 0.32);
  const ink = rgb(0.12, 0.12, 0.12);
  const muted = rgb(0.35, 0.35, 0.38);
  const agency = input.agencyName?.trim() || AGENCY_BRAND.name;
  let y = 748;
  const left = 48;
  const width = 516;

  const write = (text: string, size = 11, face = font, color = ink) => {
    const lines = wrapText(text, face, size, width);
    for (const line of lines) {
      if (y < 140) return;
      page.drawText(line, { x: left, y, size, font: face, color });
      y -= size + 6;
    }
  };

  page.drawRectangle({ x: 0, y: 768, width: 612, height: 24, color: navy });
  page.drawText(agency, { x: left, y: 776, size: 10, font: bold, color: rgb(1, 1, 1) });
  write(letterTemplateName(input.type), 16, bold, navy);
  write(DOCUMENT_PIPELINE_TYPE_LABELS[input.type], 11, bold);
  write(LETTER_FILL_DISCLAIMER, 9, font, muted);
  if (input.dealTitle) write(`Deal: ${input.dealTitle}`, 10, font, muted);
  write(`Prepared ${new Date().toISOString().slice(0, 10)}`, 10, font, muted);
  y -= 8;

  let lastGroup = "";
  for (const field of letterFieldDefs(input.type)) {
    if (field.group !== lastGroup) {
      lastGroup = field.group;
      y -= 4;
      write(field.group, 12, bold, navy);
    }
    const value = (input.confirmed[field.key] ?? "").trim() || "—";
    write(`${field.label}: ${value}`, 11);
  }

  page.drawLine({
    start: { x: left, y: 118 },
    end: { x: 280, y: 118 },
    thickness: 0.8,
    color: navy,
  });
  page.drawText("Signature", { x: left, y: 102, size: 8, font, color: muted });
  page.drawLine({
    start: { x: 300, y: 118 },
    end: { x: 380, y: 118 },
    thickness: 0.8,
    color: navy,
  });
  page.drawText("Initials", { x: 300, y: 102, size: 8, font, color: muted });
  page.drawLine({
    start: { x: 400, y: 118 },
    end: { x: 540, y: 118 },
    thickness: 0.8,
    color: navy,
  });
  page.drawText("Date", { x: 400, y: 102, size: 8, font, color: muted });
  page.drawText(LETTER_FILL_DISCLAIMER, { x: left, y: 48, size: 8, font, color: muted });

  return Buffer.from(await pdf.save());
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
