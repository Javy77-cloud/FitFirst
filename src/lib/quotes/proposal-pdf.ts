import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { AGENCY_BRAND, formatMoney } from "@/lib/domain";
import {
  type CompareQuote,
  diffQuotes,
  plainEnglishLines,
  proposalFilename,
} from "./compare";

export const PROPOSAL_PDF_DOC_TYPE = "proposal_pdf";
export const PROPOSAL_SLOT = "proposal";

export { proposalFilename };

export type ProposalBrand = {
  agencyName: string;
  phone: string | null;
};

export function resolveProposalBrand(input?: {
  agencyName?: string | null;
  phone?: string | null;
}): ProposalBrand {
  return {
    agencyName: input?.agencyName?.trim() || AGENCY_BRAND.name,
    phone: input?.phone?.trim() || AGENCY_BRAND.phone,
  };
}

export async function buildBrandedProposalPdf(input: {
  dealTitle: string;
  insuredName?: string | null;
  brand?: ProposalBrand;
  quotes: CompareQuote[];
  videoProposalUrl?: string | null;
}): Promise<Buffer> {
  const brand = resolveProposalBrand(input.brand);
  const selected = input.quotes;
  const diffs = diffQuotes(selected);
  const english = plainEnglishLines(selected);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.1, 0.18, 0.32);
  const rust = rgb(0.71, 0.33, 0.16);
  const ink = rgb(0.12, 0.12, 0.12);
  const muted = rgb(0.35, 0.35, 0.38);

  let y = 756;
  const left = 48;
  const width = 516;

  const write = (text: string, size = 11, face = font, color = ink) => {
    const lines = wrapText(text, face, size, width);
    for (const line of lines) {
      if (y < 56) return;
      page.drawText(line, { x: left, y, size, font: face, color });
      y -= size + 6;
    }
  };

  page.drawRectangle({ x: 0, y: 768, width: 612, height: 24, color: navy });
  page.drawText(brand.agencyName, {
    x: left,
    y: 776,
    size: 10,
    font: bold,
    color: rgb(1, 1, 1),
  });
  y = 748;
  write("Quote proposal", 18, bold, navy);
  write("A side-by-side of the quotes you selected. This is not a policy.", 10, font, muted);
  y -= 4;
  write(`Deal: ${input.dealTitle}`, 12, bold);
  if (input.insuredName) write(`Insured: ${input.insuredName}`);
  write(`Prepared ${new Date().toISOString().slice(0, 10)}`);
  write(`Agency phone: ${brand.phone ?? "—"}`, 10, font, muted);
  y -= 8;

  write("Selected quotes", 13, bold, rust);
  if (selected.length === 0) {
    write("No quotes were selected.");
  } else {
    for (const row of selected) {
      write(
        `${row.carrierName} · ${formatMoney(row.premium)} · Cov A ${formatMoney(row.coverageA)} · ${row.bindable ? "bindable" : "not bindable"}`,
        11,
        bold,
      );
      write(
        `Quote ${row.quoteNumber ?? "—"} · AOP ${row.aopDeductible ?? "—"} · Hurricane ${row.hurricaneDeductible ?? "—"}`,
        10,
        font,
        muted,
      );
    }
  }

  y -= 6;
  write("Where they differ", 13, bold, rust);
  const changed = diffs.filter((diff) => !diff.same);
  if (changed.length === 0) {
    write("The selected quotes match on premium, Coverage A, deductibles, and bindable.");
  } else {
    for (const diff of changed) {
      const parts = selected.map((row) => `${row.carrierName}: ${diff.values[row.id] ?? "—"}`);
      write(`${diff.label} — ${parts.join(" · ")}`, 10);
    }
  }

  y -= 6;
  write("In plain English", 13, bold, rust);
  for (const line of english) {
    write(line, 10);
  }

  if (input.videoProposalUrl) {
    y -= 6;
    write("Video walkthrough", 13, bold, rust);
    write(input.videoProposalUrl, 10, font, navy);
    write("Recorded or uploaded by the agency. FitFirst does not host or call Loom.", 9, font, muted);
  }

  y = Math.min(y, 72);
  write("Quotes never create a Policy. Bind is the only write path. Ana-style shops stay unbound until you accept.", 9, font, muted);

  const bytes = await pdf.save();
  return Buffer.from(bytes);
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
