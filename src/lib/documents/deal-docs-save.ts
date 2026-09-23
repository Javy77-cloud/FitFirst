import { asList } from "@/lib/safe-list";
import { worksheetDocTypeLabel } from "@/lib/deals/source-doc-types";
import { isDocumentsSourceDoc } from "@/lib/deals/quote-docs";
import { isAgencyLetterDocType } from "@/lib/document-pipeline/types";
import { docCardKeyFromTags } from "@/lib/leads/line-documents";
import { parseDealProduct } from "@/lib/deals/deal-products";

/** Stay under next.config serverActions.bodySizeLimit so the action is invoked. */
export const DEAL_DOCUMENTS_BODY_LIMIT_BYTES = 45 * 1024 * 1024;

export function dealDocumentsTabHref(dealId: string, line?: string | null): string {
  const query = new URLSearchParams({ tab: "documents" });
  const trimmed = (line ?? "").trim();
  if (trimmed) {
    query.set("line", trimmed);
    // Keep Flood / Auto product chips selected after type / term / unlink redirects.
    const product = parseDealProduct(trimmed);
    if (product) query.set("product", product);
  }
  return `/deals/${dealId}?${query.toString()}`;
}

export type WorksheetSourceDoc = {
  slot?: string | null;
  docType?: string | null;
  filename?: string | null;
  tags?: unknown;
};

export type DealDocumentsSaveResult = {
  ok: boolean;
  count: number;
  reason?: "choose-file" | "documents-save-failed" | "documents-too-large";
  /** Specific reason. Shown as-is. Do not replace this with “try again”. */
  message?: string;
};

function worksheetDocTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((tag) => String(tag));
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed.map((tag) => String(tag));
    } catch {
      /* comma-separated leftover */
    }
    return trimmed
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

/** Cancellation / AOR pack leftovers must not appear as regular deal uploads. */
export function isHiddenAgencyLetterDoc(doc: WorksheetSourceDoc | null | undefined): boolean {
  if (!doc || typeof doc !== "object") return false;
  const tags = worksheetDocTags(doc.tags).map((tag) => tag.toLowerCase());
  if (doc.slot === "filled_letter") return true;
  if (tags.some((tag) => tag === "agency_letter" || tag === "filled_letter" || tag === "cancellation" || tag === "aor")) {
    return true;
  }
  if (isAgencyLetterDocType(doc.docType)) return true;
  const name = sourceDocDisplayName(doc.filename).toLowerCase();
  return /cancellation[- _]?pack|aor[- _]?pack|agency[- _]?letter/.test(name);
}

/**
 * Documents-tab source list. Never throws — a bad tag/mime/slot must not take down /deals/[id].
 */
export function listWorksheetSourceDocs<T extends WorksheetSourceDoc>(
  docs: T[] | null | undefined,
): { sourceDocs: T[]; lineDocs: T[]; otherSourceDocs: T[] } {
  try {
    const sourceDocs = asList(docs).filter((doc) => {
      try {
        if (!doc || typeof doc !== "object") return false;
        if (isHiddenAgencyLetterDoc(doc)) return false;
        const tags = worksheetDocTags(doc.tags);
        return isDocumentsSourceDoc({ ...doc, tags });
      } catch {
        return false;
      }
    });
    const lineDocs = sourceDocs.filter((doc) => {
      try {
        return Boolean(docCardKeyFromTags(worksheetDocTags(doc.tags)));
      } catch {
        return false;
      }
    });
    const otherSourceDocs = sourceDocs.filter((doc) => !lineDocs.includes(doc));
    return { sourceDocs, lineDocs, otherSourceDocs };
  } catch {
    return { sourceDocs: [], lineDocs: [], otherSourceDocs: [] };
  }
}

export function sourceDocDisplayName(filename: unknown): string {
  const raw = typeof filename === "string" ? filename.trim() : "";
  return raw || "file";
}

export function sourceDocExtensionLabel(filename: unknown): string {
  const name = sourceDocDisplayName(filename);
  const ext = name.includes(".") ? name.split(".").pop() : "";
  return (ext || "file").slice(0, 4);
}

const LIST_MIME_EXT: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/jpg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
  "image/gif": "GIF",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
  "text/plain": "TXT",
  "text/markdown": "MD",
  "text/csv": "CSV",
};

/** Human type for the uploaded-files list. Dropdown labels, lowercased; `other` reads "others". */
export function sourceDocListTypeLabel(docType: unknown): string {
  const key = typeof docType === "string" ? docType.trim() : "";
  if (!key || key === "other") return "others";
  return worksheetDocTypeLabel(key).toLowerCase();
}

function listFileExtension(filename: string, mimeType: unknown): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot > 0 && dot < base.length - 1) {
    const ext = base.slice(dot + 1);
    if (/^[A-Za-z0-9]{1,5}$/.test(ext)) return ext.toUpperCase();
  }
  const mime = typeof mimeType === "string" ? mimeType.split(";")[0].trim().toLowerCase() : "";
  return LIST_MIME_EXT[mime] ?? "FILE";
}

function listFileBasename(filename: string, ext: string): string {
  const base = (filename.split(/[/\\]/).pop() ?? filename).trim() || filename;
  const suffix = `.${ext.toLowerCase()}`;
  if (ext !== "FILE" && base.toLowerCase().endsWith(suffix)) {
    const stem = base.slice(0, base.length - suffix.length).trim();
    if (stem) return stem;
  }
  return base;
}

/**
 * Uploaded-files row label: `PDF, wind mitigation / original name`.
 * Display only — callers must keep persisting `filename` unchanged.
 */
export function sourceDocUploadedListLabel(input: {
  filename?: unknown;
  docType?: unknown;
  mimeType?: unknown;
}): string {
  const stored = sourceDocDisplayName(input.filename);
  const ext = listFileExtension(stored, input.mimeType);
  const name = listFileBasename(stored, ext);
  return `${ext}, ${sourceDocListTypeLabel(input.docType)} / ${name}`;
}
