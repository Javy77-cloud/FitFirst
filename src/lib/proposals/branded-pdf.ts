import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";
import {
  AGENCY_BRAND,
  COLOR_PRESET_INK,
  formatMoney,
  type ColorPreset,
} from "@/lib/domain";
import type { ComparedQuote } from "@/lib/quotes/gap-notes";

export const PROPOSAL_DOC_TYPE = "proposal";
export const PROPOSAL_SLOT = "proposal";

export type ProposalBrand = {
  agencyName: string;
  colorPreset: ColorPreset;
  logoBytes?: Uint8Array | null;
  logoMime?: string | null;
  phone?: string | null;
};

export type ProposalDeal = {
  title: string;
  insuredName: string | null;
  line: string | null;
  state: string | null;
  coverageA: number | null;
};

function hexRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  );
}

export function proposalFilename(dealTitle: string): string {
  const slug = dealTitle.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "deal";
  const day = new Date().toISOString().slice(0, 10);
  return `proposal-${slug}-${day}.pdf`;
}

export function brandInk(preset: ColorPreset | string | null | undefined) {
  const key = (preset && preset in COLOR_PRESET_INK ? preset : "agency") as ColorPreset;
  return COLOR_PRESET_INK[key];
}

function wrapText(text: string, max = 92): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length > max) {
      if (cur) lines.push(cur);
      cur = word;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function buildBrandedProposalPdf(input: {
  brand: ProposalBrand;
  deal: ProposalDeal;
  quotes: ComparedQuote[];
}): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = brandInk(input.brand.colorPreset);
  const primary = hexRgb(ink.primary);
  const accent = hexRgb(ink.accent);
  const wash = hexRgb(ink.wash);
  const name = input.brand.agencyName?.trim() || AGENCY_BRAND.name;

  page.drawRectangle({ x: 0, y: 732, width: 612, height: 60, color: primary });
  page.drawRectangle({ x: 0, y: 724, width: 612, height: 8, color: accent });

  let logoWidth = 0;
  if (input.brand.logoBytes && input.brand.logoBytes.length > 8) {
    try {
      const mime = input.brand.logoMime ?? "";
      const img = mime.includes("jpg") || mime.includes("jpeg")
        ? await pdf.embedJpg(input.brand.logoBytes)
        : await pdf.embedPng(input.brand.logoBytes);
      const h = 36;
      const w = (img.width / img.height) * h;
      logoWidth = w + 10;
      page.drawImage(img, { x: 36, y: 744, width: w, height: h });
    } catch {
      logoWidth = 0;
    }
  }

  page.drawText(name, {
    x: 36 + logoWidth,
    y: 762,
    size: 16,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Insurance proposal  ·  quotes are not coverage", {
    x: 36 + logoWidth,
    y: 744,
    size: 9,
    font,
    color: rgb(0.85, 0.9, 0.95),
  });

  let y = 700;
  const line = (text: string, size = 11, face = font, color = primary) => {
    page.drawText(text.slice(0, 110), { x: 36, y, size, font: face, color });
    y -= size + 6;
  };

  line(input.deal.title || "Deal proposal", 14, bold);
  if (input.deal.insuredName) line(`Insured: ${input.deal.insuredName}`);
  line(
    `Line ${input.deal.line ?? "HO"}  ·  ${input.deal.state ?? "FL"}${
      input.deal.coverageA != null ? `  ·  Coverage A ${formatMoney(input.deal.coverageA)}` : ""
    }`,
  );
  line(`Prepared ${new Date().toISOString().slice(0, 10)}  ·  ${input.quotes.length} quote${input.quotes.length === 1 ? "" : "s"}`);
  y -= 6;

  page.drawRectangle({ x: 36, y: y - 4, width: 540, height: 18, color: wash });
  page.drawText("Side-by-side premiums", { x: 40, y: y, size: 10, font: bold, color: primary });
  y -= 22;

  const cols = Math.min(input.quotes.length, 4);
  const colW = cols > 0 ? 540 / cols : 540;
  if (cols === 0) {
    line("No quotes on this deal yet. Log stub quotes, then generate again.", 10);
  } else {
    input.quotes.slice(0, 4).forEach((quote, i) => {
      const x = 36 + i * colW;
      page.drawText(quote.carrierName.slice(0, 22), { x, y, size: 9, font: bold, color: primary });
    });
    y -= 14;
    input.quotes.slice(0, 4).forEach((quote, i) => {
      const x = 36 + i * colW;
      page.drawText(formatMoney(quote.premium), {
        x,
        y,
        size: 12,
        font: bold,
        color: quote.cheapest ? accent : primary,
      });
    });
    y -= 16;
    input.quotes.slice(0, 4).forEach((quote, i) => {
      const x = 36 + i * colW;
      page.drawText(quote.cheapest ? "Lowest premium" : quote.bindable ? "Quoted" : "Not bindable", {
        x,
        y,
        size: 8,
        font,
        color: primary,
      });
    });
    y -= 22;
  }

  page.drawRectangle({ x: 36, y: y - 4, width: 540, height: 18, color: wash });
  page.drawText("Coverage summary", { x: 40, y, size: 10, font: bold, color: primary });
  y -= 22;

  const headers = ["Carrier", "Premium", "AOP ded", "Hurricane", "Cov A", "Flood"];
  const widths = [120, 70, 70, 70, 80, 70];
  let x = 36;
  headers.forEach((h, i) => {
    page.drawText(h, { x, y, size: 8, font: bold, color: accent });
    x += widths[i];
  });
  y -= 14;

  for (const quote of input.quotes.slice(0, 8)) {
    if (y < 120) break;
    x = 36;
    const cells = [
      quote.carrierName,
      formatMoney(quote.premium),
      quote.aopDeductible ?? "—",
      quote.hurricaneDeductible ?? "—",
      quote.coverageA != null ? formatMoney(quote.coverageA) : "—",
      quote.includesFlood ? "Included" : "No flood",
    ];
    cells.forEach((cell, i) => {
      page.drawText(String(cell).slice(0, 20), { x, y, size: 8, font, color: primary });
      x += widths[i];
    });
    y -= 12;
  }

  y -= 10;
  page.drawRectangle({ x: 36, y: y - 4, width: 540, height: 18, color: wash });
  page.drawText("Plain-English gaps (rule text, not AI)", { x: 40, y, size: 10, font: bold, color: primary });
  y -= 20;

  for (const quote of input.quotes) {
    if (y < 80) break;
    page.drawText(quote.carrierName, { x: 36, y, size: 9, font: bold, color: primary });
    y -= 12;
    const gaps = quote.notesPlain.length
      ? quote.notesPlain
      : [{ code: "none", text: "No coverage gaps noted against this set.", severity: "better" as const }];
    for (const gap of gaps) {
      if (y < 70) break;
      for (const wrap of wrapText(`• ${gap.text}`, 95)) {
        page.drawText(wrap, { x: 44, y, size: 8, font, color: primary });
        y -= 11;
      }
    }
    y -= 6;
  }

  page.drawText(
    "This proposal is a shopping summary. Quotes never become a policy. Bind is the only write path.",
    { x: 36, y: 42, size: 8, font, color: accent },
  );
  if (input.brand.phone) {
    page.drawText(`Questions: ${input.brand.phone}`, { x: 36, y: 30, size: 8, font, color: primary });
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
