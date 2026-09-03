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
    ((SOURCE_DOC_TYPES as string[]).includes(declaredType) ||
      declaredType === "quote" ||
      declaredType === "other")
  ) {
    return declaredType as DocType;
  }
  const name = filename.toLowerCase();
  if (/quote/.test(name)) return "quote";
  if (/wind/.test(name)) return "wind_mit";
  if (/4[-_ ]?point|four[-_ ]?point/.test(name)) return "four_point";
  if (/inspect/.test(name)) return "inspection";
  if (/\.(png|jpe?g|gif|webp|tiff?|heic|bmp)$/.test(name)) return "photo";
  if (/dec|declaration/.test(name)) return "dec";
  return "dec";
}

export function isSourceDocType(docType: string): boolean {
  return (SOURCE_DOC_TYPES as string[]).includes(docType);
}

export function isQuoteAttachment(docType: string, filename?: string): boolean {
  if (docType === "quote") return true;
  return Boolean(filename && /quote/.test(filename.toLowerCase()));
}

/** Home first. Only move off Home when the packet is clearly another line. */
export function inferShopLine(text: string, filename: string, docType: string): ShopLine {
  const blob = `${filename}\n${text}`.toLowerCase();
  if (docType === "quote") return "home";
  if (/\bvin\b|personal auto|auto (policy|dec)|vehicle year/.test(blob) && !/homeowners|coverage a/.test(blob)) {
    return "auto";
  }
  if (/\bflood\b/.test(blob) && !/homeowners|coverage a|wind mit/.test(blob)) return "flood";
  if (/\bworkers['’]? ?comp|work comp\b/.test(blob)) return "workers_comp";
  if (/general liability/.test(blob)) return "general_liability";
  return "home";
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
