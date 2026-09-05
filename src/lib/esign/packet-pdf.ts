import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { IN_DESK_ESIGN_LABEL } from "./in-desk";

export async function buildInDeskPacketPdf(input: {
  title: string;
  partyName: string;
  recordKind: "deal" | "policy";
}): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.11, 0.14, 0.19);

  page.drawText(IN_DESK_ESIGN_LABEL, {
    x: 48,
    y: 742,
    size: 12,
    font: bold,
    color: ink,
  });
  page.drawText(input.title, {
    x: 48,
    y: 710,
    size: 16,
    font: bold,
    color: ink,
  });
  page.drawText(`Named insured: ${input.partyName}`, {
    x: 48,
    y: 686,
    size: 11,
    font,
    color: ink,
  });
  page.drawText(`Record: ${input.recordKind}`, {
    x: 48,
    y: 668,
    size: 11,
    font,
    color: ink,
  });
  page.drawText("This packet never leaves the desk. Draw or type a name on the sign page.", {
    x: 48,
    y: 636,
    size: 11,
    font,
    color: ink,
  });
  page.drawText("Finish-line DocuSign stays parked. No vendor SDK. Quotes are not coverage.", {
    x: 48,
    y: 618,
    size: 11,
    font,
    color: ink,
  });
  page.drawRectangle({
    x: 48,
    y: 120,
    width: 516,
    height: 120,
    borderColor: ink,
    borderWidth: 1,
  });
  page.drawText("Signature", {
    x: 56,
    y: 224,
    size: 10,
    font,
    color: ink,
  });

  return Buffer.from(await pdf.save());
}
