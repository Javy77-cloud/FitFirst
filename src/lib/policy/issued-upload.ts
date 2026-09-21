import { isManualMarketWhy } from "@/lib/deals/manual-markets";

export type IssuedUploadFolder = "manual" | "carrier";

const AUTO_LINES = new Set(["auto", "motorcycle", "commercial_auto"]);

/** Auto issued policies use the current-policy extract. Home stays a declaration. */
export function issuedPolicyDocType(shopLine?: string | null): "current_policy" | "dec" {
  const line = (shopLine ?? "").trim().toLowerCase();
  return AUTO_LINES.has(line) ? "current_policy" : "dec";
}

/**
 * Manual quotes (Travelers entered by the agent) land in the Manual folder.
 * A quote that already has a carrier download lands in that carrier folder.
 */
export function issuedUploadFolder(input: {
  why?: string | null;
  notes?: string | null;
  hasCarrierDownload?: boolean;
}): IssuedUploadFolder {
  if (isManualMarketWhy(input.why) || isManualMarketWhy(input.notes)) return "manual";
  if (input.hasCarrierDownload) return "carrier";
  return "manual";
}

export function issuedUploadPersist(input: {
  quoteId?: string | null;
  shopLine?: string | null;
  folder: IssuedUploadFolder;
  filename: string;
}): {
  docType: "current_policy" | "dec";
  slot: "quote_file" | "source_doc";
  tags: string[];
} {
  const docType = issuedPolicyDocType(input.shopLine);
  const quoteId = (input.quoteId ?? "").trim();
  const source = input.folder === "carrier" ? "source:carrier" : "source:agency";
  const line = (input.shopLine ?? "").trim().toLowerCase();
  const tags = ["dec", "mint", source];
  if (line) tags.push(`line:${line}`);
  const label = input.filename.trim();
  if (label) tags.push(`label:${label}`);
  if (!quoteId) {
    return { docType, slot: "source_doc", tags };
  }
  tags.unshift(`quote:${quoteId}`);
  return { docType, slot: "quote_file", tags };
}
