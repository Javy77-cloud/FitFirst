import { isManualMarketWhy } from "@/lib/deals/manual-markets";

export type IssuedUploadFolder = "manual" | "carrier";

/** Fired after the issued-policy file is tagged into Manual/carrier, before Gemini. */
export const ISSUED_POLICY_FOLDER_SAVED = "ff-issued-policy-folder-saved";

export type IssuedPolicyFolderSavedDetail = {
  quoteId: string;
  documentId: string;
  folder: IssuedUploadFolder;
};

/** PDF or a phone photo of the issued policy, including HEIC. */
export const ISSUED_POLICY_ACCEPT =
  "application/pdf,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

/** Keep a phone photo's MIME. An empty or octet-stream HEIC must not be stored as a PDF. */
export function issuedUploadMime(filename: string, mimeType?: string | null): string {
  const type = (mimeType ?? "").trim().toLowerCase();
  const name = filename.trim().toLowerCase();
  const fromName = name.endsWith(".heic")
    ? "image/heic"
    : name.endsWith(".heif")
      ? "image/heif"
      : name.endsWith(".png")
        ? "image/png"
        : name.endsWith(".webp")
          ? "image/webp"
          : name.endsWith(".jpg") || name.endsWith(".jpeg")
            ? "image/jpeg"
            : "";
  if (fromName && (!type || type === "application/octet-stream")) return fromName;
  if (type.startsWith("image/") || type === "application/pdf") return type;
  if (fromName) return fromName;
  return "application/pdf";
}

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
