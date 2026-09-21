import {
  SOURCE_DOC_TYPES,
  SHOP_LINE_TO_LOB,
  type AccountKind,
  type DocType,
  type ShopLine,
} from "@/lib/domain";

export type ParsedInsured = {
  firstName: string;
  lastName: string;
  secondary: string | null;
};

export function parseNamedInsured(text: string): ParsedInsured | null {
  const primary = /(?:^|\n)\s*(?:primary\s+)?named\s+insured\s*[:#]\s*([^\n]+)/i.exec(text);
  if (!primary?.[1]) return null;
  const raw = primary[1].replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const parts = raw.split(" ").filter(Boolean);
  const lastName = parts.length === 1 ? parts[0] : parts[parts.length - 1];
  const firstName = parts.length === 1 ? "Unknown" : parts.slice(0, -1).join(" ");
  const extra = /(?:additional|secondary)\s+named\s+insured\s*[:#]\s*([^\n]+)/i.exec(text);
  return {
    firstName,
    lastName,
    secondary: extra?.[1]?.replace(/\s+/g, " ").trim() || null,
  };
}

export function inferDocType(filename: string, declared?: string | null): DocType {
  const declaredType = declared?.trim().toLowerCase();
  if (
    declaredType &&
    ((SOURCE_DOC_TYPES as readonly string[]).includes(declaredType) ||
      declaredType === "quote" ||
      declaredType === "proposal" ||
      declaredType === "signed_app" ||
      declaredType === "other")
  ) {
    return (declaredType === "quote" ? "quote_pdf" : declaredType) as DocType;
  }
  const name = filename.toLowerCase();
  if (/signed[-_ ]?app|application/.test(name)) return "signed_app";
  if (/permit/.test(name)) return "permits";
  if (/hand[-_ ]?notes?/.test(name)) return "hand_notes";
  if (/current[-_ ]?policy|expiring/.test(name)) return "current_policy";
  if (/proposal/.test(name)) return "proposal";
  if (/quote/.test(name)) return "quote_pdf";
  if (/wind/.test(name)) return "wind_mit";
  if (/4[-_ ]?point|four[-_ ]?point/.test(name)) return "four_point";
  if (/floor[-_ ]?plan/.test(name)) return "floor_plan";
  if (/inspect/.test(name)) return "inspection";
  if (/\.(png|jpe?g|gif|webp|tiff?|heic|bmp)$/.test(name)) return "photo";
  if (/dec|declaration/.test(name)) return "dec";
  return "dec";
}

export function isSourceDocType(docType: string): boolean {
  return (SOURCE_DOC_TYPES as readonly string[]).includes(docType);
}

export function isQuoteAttachment(docType: string, filename?: string): boolean {
  if (isSourceDocType(docType)) return false;
  if (docType === "quote" || docType === "quote_pdf") return true;
  return Boolean(filename && /(?:^|[^a-z])quote(?:[^a-z]|$)/i.test(filename));
}

const HO_SOURCE_TYPES = new Set(["dec", "wind_mit", "four_point", "inspection", "current_policy"]);

/** Dec / wind mit / 4-point stay on the homeowners sheet unless they are clearly another line. */
export function sourceDocFillsHome(docType: string): boolean {
  return HO_SOURCE_TYPES.has(docType);
}

/** Auto policy / declaration wording. "Policy #" alone is not enough — HO decs have that too. */
const AUTO_PACKET =
  /\bvin\b|vehicle identification|personal auto|automobile (policy|declaration)|auto (policy|dec)|vehicle year|bodily injury|uninsured motorist|comprehensive|collision deductible|covered auto/;

export function looksLikeAutoPacket(text: string): boolean {
  return AUTO_PACKET.test(text.toLowerCase());
}

/** Home first. Only move off Home when the packet is clearly another line. */
export function inferShopLine(text: string, filename: string, docType: string): ShopLine {
  const blob = `${filename}\n${text}`.toLowerCase();
  if (docType === "quote" || docType === "quote_pdf") return "home";
  if (sourceDocFillsHome(docType)) {
    if (looksLikeAutoPacket(blob) && !/homeowners|coverage a|wind mit|4[- ]?point|four[- ]?point/.test(blob)) {
      return "auto";
    }
    return "home";
  }
  if (looksLikeAutoPacket(blob) && !/homeowners|coverage a/.test(blob)) {
    return "auto";
  }
  if (/\bflood\b/.test(blob) && !/homeowners|coverage a|wind mit/.test(blob)) return "flood";
  if (/\bworkers['’]? ?comp|work comp\b/.test(blob)) return "workers_comp";
  if (/general liability/.test(blob)) return "general_liability";
  return "home";
}

/**
 * Phone photos often have empty OCR before Gemini, so inferShopLine defaults to Home.
 * When the agent is filling a non-Home sheet with a photo / weak text, trust the sheet
 * instead of skipping — Gemini will read the image for that line.
 */
export function trustSheetLineForFill(opts: {
  sheetLine: ShopLine | string;
  inferred: ShopLine | string;
  docType?: string | null;
  mimeType?: string | null;
  text?: string | null;
  filename?: string | null;
}): boolean {
  if (opts.inferred === opts.sheetLine) return true;
  if (sourceDocFillsHome(String(opts.docType ?? "")) && opts.sheetLine === "home") return true;
  const mime = String(opts.mimeType ?? "").toLowerCase();
  const doc = String(opts.docType ?? "").toLowerCase();
  const name = String(opts.filename ?? "").toLowerCase();
  const isPhoto =
    doc === "photo" ||
    mime.startsWith("image/") ||
    /\.(jpe?g|png|webp|heic|heif|gif|tiff?|bmp)$/i.test(name);
  // Phone photos of a dec on the active sheet — always trust the sheet the agent is filling.
  // Pre-Gemini OCR often defaults inferShopLine to Home and wrongly skips Auto.
  if (isPhoto) return true;
  // Only empty pre-OCR text — short HO PDF snippets must still fail the Auto gate.
  const emptyText = String(opts.text ?? "").trim().length === 0;
  if (emptyText && opts.sheetLine !== "home") return true;
  return false;
}

export function inferAccountKind(line: ShopLine): AccountKind {
  if (line === "workers_comp" || line === "general_liability") return "commercial";
  return "personal";
}

export function lobForLine(line: ShopLine): string {
  return SHOP_LINE_TO_LOB[line];
}

export const INGEST_CREATES_POLICY = false;
export const INGEST_PATH = "lead_to_deal" as const;
