import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { dealDocumentsTabHref } from "@/lib/documents/deal-docs-save";

export type UploadedFileDeleteMode = "hard" | "hide";

/**
 * User deletes hide every file. The row, blob, versions, and extracted fields stay.
 * `hard` remains on the type for genuine purges (claim/filing attachments) that audit first.
 */
export function uploadedFileDeleteMode(doc: { slot: string; docType: string }): UploadedFileDeleteMode {
  // Slot and doc type stay on the signature so callers do not branch. Every user delete hides.
  void doc;
  return "hide";
}

export function deleteUploadedFileSubject(filename: string, mode?: UploadedFileDeleteMode): string {
  void mode;
  return `the file “${filename}” (it will be hidden from the list; an admin can restore it)`;
}

export function isHiddenUploadedFile(status: string): boolean {
  return status === "hidden";
}

export function visibleUploadedFiles<T extends { status: string }>(docs: T[]): T[] {
  return docs.filter((doc) => !isHiddenUploadedFile(doc.status));
}

/** Drop sheet cells that only came from extracted / photo-OCR so a deleted doc cannot leave orphans. */
export function clearExtractedSheetCells(
  values: Record<string, QuoteSheetFieldValue>,
): Record<string, QuoteSheetFieldValue> {
  const next: Record<string, QuoteSheetFieldValue> = { ...values };
  for (const [key, cell] of Object.entries(next)) {
    if (cell.source === "extracted" || cell.source === "photo-ocr") {
      next[key] = { value: "", status: "missing", source: "blank" };
    }
  }
  return next;
}

/** Clear extract/photo cells that cite this filename so sibling docs keep their fills. */
export function clearExtractedSheetCellsFromDoc(
  values: Record<string, QuoteSheetFieldValue>,
  filename: string,
): Record<string, QuoteSheetFieldValue> {
  const needle = filename.trim().toLowerCase();
  if (!needle) return clearExtractedSheetCells(values);
  const next: Record<string, QuoteSheetFieldValue> = { ...values };
  for (const [key, cell] of Object.entries(next)) {
    if (cell.source !== "extracted" && cell.source !== "photo-ocr") continue;
    const label = (cell.sourceLabel ?? "").trim().toLowerCase();
    // Match filename in sourceLabel; also clear unlabeled legacy extract cells.
    if (!label || label.includes(needle)) {
      next[key] = { value: "", status: "missing", source: "blank" };
    }
  }
  return next;
}

/**
 * After delete/hide, keep the agent on Policy Documents when the file belongs to a policy.
 * Prefer policy over deal even when a deal `returnTo` is present — mint uploads live on
 * `/policies/{id}?tab=documents` and re-upload must stay there.
 */
export function documentDeleteReturnHref(input: {
  policyId?: string | null;
  dealId?: string | null;
  returnTo?: string | null;
  /** Active product shop line — preserves Flood window after Change type. */
  line?: string | null;
}): string | null {
  const policyId = (input.policyId ?? "").trim();
  if (policyId) return `/policies/${policyId}?tab=documents`;
  const returnTo = (input.returnTo ?? "").trim();
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  const dealId = (input.dealId ?? "").trim();
  if (dealId) return dealDocumentsTabHref(dealId, input.line);
  return null;
}
