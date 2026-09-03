import { PDFDocument, StandardFonts } from "pdf-lib";
import { formatMoney } from "@/lib/domain";

export const QUOTE_PDF_DOC_TYPE = "quote_pdf";

export function quotePdfFilename(carrierName: string, quoteNumber: string | null): string {
  const quote = (quoteNumber ?? "quote").replace(/[^\w.-]+/g, "_");
  const carrier = carrierName.replace(/[^\w.-]+/g, "_");
  return `${quote}-${carrier}.pdf`;
}

export async function buildStubQuotePdf(input: {
  dealTitle: string;
  carrierName: string;
  quoteNumber: string | null;
  premium: string | number | null;
  coverageA: number | null;
  hurricaneDeductible: string | null;
  aopDeductible: string | null;
  bindable: boolean;
}): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 740;
  const line = (text: string, size = 11, face = font) => {
    page.drawText(text, { x: 48, y, size, font: face });
    y -= size + 8;
  };
  line("FitFirst stub quote", 16, bold);
  line("Attached to the deal when quotes are finalized. This is not a policy.");
  y -= 8;
  line(`Deal: ${input.dealTitle}`, 12, bold);
  line(`Carrier: ${input.carrierName}`);
  line(`Quote #: ${input.quoteNumber ?? "—"}`);
  line(`Premium: ${formatMoney(input.premium)}`);
  line(`Coverage A: ${formatMoney(input.coverageA)}`);
  line(`AOP deductible: ${input.aopDeductible ?? "—"}`);
  line(`Hurricane deductible: ${input.hurricaneDeductible ?? "—"}`);
  line(`Bindable: ${input.bindable ? "Yes" : "No"}`);
  y -= 12;
  line("Quotes never create a Policy. Bind is the only write path.", 10);
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
